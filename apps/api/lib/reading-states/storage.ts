import { createHash } from 'node:crypto'
import { GridFSBucket, MongoClient, MongoServerError, type ClientSession, type Db, type Filter, type ObjectId } from 'mongodb'

export class ReadingError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const documentNotFound = () => new ReadingError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu.')
export const versionNotFound = () => new ReadingError(404, 'DOCUMENT_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản trong tài liệu này.')
export const invalidAnchor = () => new ReadingError(422, 'INVALID_READING_ANCHOR', 'Vị trí không hợp lệ trong phiên bản đã chọn.')
export const unavailable = () => new ReadingError(503, 'READING_STATE_UNAVAILABLE', 'Dịch vụ vị trí đọc chưa sẵn sàng.')

export interface ReadingInput {
  versionId: string
  chunkId: string | null
  page: number | null
  progress: number
}
type ReadingWrite = { versionId: string; chunkId: unknown; page: unknown; progress: unknown }
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ReadingState extends ReadingInput {
  id: string
  documentId: string
  revision: number
  updatedAt: string
}

type StoredReadingState = ReadingState & { ownerId: string }
type WriteResult = { status: 200 | 201; state: ReadingState }
type Receipt = WriteResult & { _id: string; fingerprint: string; expiresAt: Date }
type Change = { ownerId: string; id: string; entityType: 'readingState'; entityId: string; revision: number; action: 'PUT'; value: ReadingState; committedAt: Date }

export interface StoredDocument {
  _id: string
  ownerId: string | null
  visibility: 'public' | 'private' | 'shared'
  deletedAt: Date | null
  activeVersionId: string | null
  allowSourceDownload?: boolean
  latestReplacementVersionId?: string | null
  activeIndexGeneration?: string | null
  kind: 'paper' | 'study'
  title: string
  authors: string[]
  year: number | null
  subjects: string[]
  primarySubject: string | null
  coverage: 'title' | 'abstract' | 'fulltext'
  indexStatus: 'pending' | 'processing' | 'ready' | 'failed' | 'deleting'
  revision: number
  updatedAt: string
  abstract?: string | null
  summary?: {
    text: string; language: string; sourceCoverage: StoredDocument['coverage']; generated: boolean
    generatorRevision: string | null; reviewStatus: 'unreviewed' | 'reviewed' | 'rejected'
  } | null
}

export type DocumentSort = 'updatedAt:desc' | 'year:desc' | 'title:asc'
type DocumentQuery = {
  sort: DocumentSort; ids: string[]; kind?: string; subject?: string; yearFrom?: number; yearTo?: number
}
type DocumentCursor = { id: string; value: string | number | null }

export interface StoredVersion {
  _id: string
  documentId: string
  activatedAt: Date | null
  processingStatus: 'queued' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed'
  pageCount: number | null
  sourceFileId: ObjectId | null
  mediaType?: string
  source: {
    provider: string
    externalIds: Array<{ provider: string; value: string }>
    url: string | null
    license: string | null
    fetchedAt: string
    rawHash: string
  }
  coverage: 'title' | 'abstract' | 'fulltext' | null
  textHash: string | null
  parserRevision: string | null
  activeIndexGeneration: string | null
  jobId: string | null
  createdAt: string
}

export interface StoredChunk {
  _id: string
  documentId: string
  versionId: string
  ordinal: number
  text: string
  page: number | null
  section: string | null
  start: number
  end: number
  textHash: string
}

function publicState(row: ReadingState): ReadingState {
  const { id, documentId, versionId, chunkId, page, progress, revision, updatedAt } = row
  return { id, documentId, versionId, chunkId, page, progress, revision, updatedAt }
}

export function documentSummary(doc: StoredDocument) {
  const { _id: id, kind, title, authors, year, subjects, primarySubject, visibility, activeVersionId, coverage, indexStatus, revision, updatedAt } = doc
  return { id, kind, title, authors, year, subjects, primarySubject, visibility, activeVersionId, coverage, indexStatus, revision, updatedAt }
}

export function publicVersion(version: StoredVersion) {
  const { _id: id, documentId, source, coverage, textHash, parserRevision, activeIndexGeneration, processingStatus, jobId, createdAt } = version
  const { provider, externalIds, url, license, fetchedAt, rawHash } = source
  return { id, documentId, source: { provider, externalIds, url, license, fetchedAt, rawHash },
    coverage, textHash, parserRevision, activeIndexGeneration, processingStatus, jobId, createdAt }
}

export class ReadingStorage {
  private readonly client: MongoClient
  private readonly states
  private readonly receipts
  private readonly changes
  private readonly documents
  private readonly versions
  private readonly chunks
  private readonly files
  private ready: Promise<unknown> | undefined

  constructor(client: MongoClient, database: Db) {
    this.client = client
    this.states = database.collection<StoredReadingState>('reading_states')
    this.receipts = database.collection<Receipt>('reading_state_receipts')
    this.changes = database.collection<Change>('reading_state_changes')
    this.documents = database.collection<StoredDocument>('documents')
    this.versions = database.collection<StoredVersion>('document_versions')
    this.chunks = database.collection<StoredChunk>('document_chunks')
    this.files = new GridFSBucket(database, { bucketName: 'document_sources' })
  }

  private async ensureIndexes() {
    this.ready ??= Promise.all([
      this.states.createIndex({ ownerId: 1, documentId: 1 }, { unique: true }),
      this.receipts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.changes.createIndex({ ownerId: 1, committedAt: 1, id: 1 }),
    ]).catch(error => { this.ready = undefined; throw error })
    await this.ready
  }

  private documentFilter(ownerId: string | null) {
    const publicDocument = { visibility: 'public' as const }
    return {
      deletedAt: null,
      $or: ownerId === null ? [publicDocument] : [publicDocument, { ownerId }],
    }
  }

  private async document(ownerId: string | null, documentId: string, session?: ClientSession) {
    const document = await this.documents.findOne({ _id: documentId, ...this.documentFilter(ownerId) }, session ? { session } : {})
    if (!document) throw documentNotFound()
    return document
  }

  private async version(
    ownerId: string | null, documentId: string, versionId: string, contentOnly: boolean, session?: ClientSession,
  ) {
    const doc = await this.document(ownerId, documentId, session)
    const version = await this.versions.findOne({ _id: versionId, documentId }, session ? { session } : {})
    if (!version) throw versionNotFound()
    const readable = version.processingStatus === 'ready' &&
      (doc.activeVersionId === versionId || version.activatedAt instanceof Date)
    const isOwner = ownerId !== null && doc.ownerId === ownerId
    if (!readable && (contentOnly || !isOwner)) throw versionNotFound()
    return { version, document: doc }
  }

  async get(ownerId: string, documentId: string) {
    await this.document(ownerId, documentId)
    const state = await this.states.findOne({ ownerId, documentId })
    if (!state) throw new ReadingError(404, 'READING_STATE_NOT_FOUND', 'Chưa có vị trí đọc đã lưu.')
    return publicState(state)
  }

  async list(ownerId: string, after: string, limit: number) {
    // Filter permissions before limiting so inaccessible records cannot hide readable ones.
    const rows = await this.states.aggregate<StoredReadingState>([
      { $match: { ownerId, documentId: { $gt: after } } },
      { $sort: { documentId: 1 } },
      { $lookup: {
        from: this.documents.collectionName, localField: 'documentId', foreignField: '_id',
        pipeline: [{ $match: this.documentFilter(ownerId) }, { $project: { _id: 1 } }], as: 'readable',
      } },
      { $match: { 'readable.0': { $exists: true } } },
      { $limit: limit + 1 },
    ]).toArray()
    return rows.map(publicState)
  }

  async put(ownerId: string, documentId: string, write: ReadingWrite, expected: number | null, key: string): Promise<WriteResult> {
    await this.ensureIndexes()
    const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
    const receiptId = digest([ownerId, 'PUT', documentId, key])
    const transaction = this.client.startSession()
    try {
      // Retry a concurrent upsert that hit the unique key after its snapshot was taken.
      for (let attempt = 0; ; attempt++) {
        try {
          return await transaction.withTransaction(async () => {
            const now = new Date()
            const { version } = await this.version(ownerId, documentId, write.versionId, true, transaction)
            const { chunkId, page, progress } = write
            if ((chunkId !== null && (typeof chunkId !== 'string' || !uuidPattern.test(chunkId))) ||
              (page !== null && typeof page !== 'number') || typeof progress !== 'number') throw invalidAnchor()
            const input = { versionId: write.versionId, chunkId: chunkId?.toLowerCase() ?? null, page, progress }
            const fingerprint = digest([input.versionId, input.chunkId, input.page, input.progress, expected])
            const previous = await this.receipts.findOne({ _id: receiptId }, { session: transaction })
            if (previous && previous.expiresAt > now) {
              if (previous.fingerprint !== fingerprint) {
                throw new ReadingError(409, 'IDEMPOTENCY_KEY_REUSED', 'Khóa retry đã dùng cho yêu cầu khác.')
              }
              return { status: previous.status, state: previous.state }
            }

            const state = await this.writeState(ownerId, documentId, input, expected, version, now, transaction)
            const status = expected === null ? 201 : 200
            const receipt: Receipt = {
              _id: receiptId, fingerprint, status, state, expiresAt: new Date(now.getTime() + 86_400_000),
            }
            await this.receipts.replaceOne({ _id: receiptId }, receipt, { upsert: true, session: transaction })
            await this.changes.insertOne({
              ownerId, id: crypto.randomUUID(), entityType: 'readingState', entityId: state.id,
              revision: state.revision, action: 'PUT', value: state, committedAt: now,
            }, { session: transaction })
            return { status, state }
          }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })
        } catch (error) {
          if (!(error instanceof MongoServerError && error.code === 11000) || attempt >= 2) throw error
        }
      }
    } finally {
      await transaction.endSession()
    }
  }

  private async writeState(
    ownerId: string, documentId: string, input: ReadingInput, expected: number | null,
    version: StoredVersion, now: Date, session: ClientSession,
  ) {
    if (!Number.isFinite(input.progress) || input.progress < 0 || input.progress > 1 ||
      (input.page !== null && (!Number.isSafeInteger(input.page) || input.page < 1 ||
        version.pageCount == null || input.page > version.pageCount))) throw invalidAnchor()
    if (input.chunkId !== null) {
      const chunk = await this.chunks.findOne({ _id: input.chunkId, documentId, versionId: version._id }, { session })
      if (!chunk || (input.page !== null && chunk.page !== input.page)) throw invalidAnchor()
    }
    const current = await this.states.findOne({ ownerId, documentId }, { session })
    if (current && expected === null) {
      throw new ReadingError(412, 'READING_STATE_EXISTS', 'Đã có vị trí đọc. Hãy tải lại.')
    }
    if (expected !== null && current?.revision !== expected) {
      throw new ReadingError(412, 'REVISION_MISMATCH', 'Vị trí đọc đã thay đổi. Hãy tải lại.')
    }
    const state: ReadingState = {
      ...input, id: current?.id ?? crypto.randomUUID(), documentId,
      revision: (current?.revision ?? 0) + 1, updatedAt: now.toISOString(),
    }
    if (current) {
      const result = await this.states.replaceOne({ _id: current._id, revision: current.revision }, { ownerId, ...state }, { session })
      if (!result.matchedCount) throw new ReadingError(412, 'REVISION_MISMATCH', 'Vị trí đọc đã thay đổi. Hãy tải lại.')
    } else {
      await this.states.insertOne({ ownerId, ...state }, { session })
    }
    return state
  }

  async versionMetadata(ownerId: string | null, documentId: string, versionId: string) {
    const { version } = await this.version(ownerId, documentId, versionId, false)
    return publicVersion(version)
  }

  async documentDetails(ownerId: string | null, documentId: string) {
    const document = await this.document(ownerId, documentId)
    const version = document.activeVersionId === null ? null
      : await this.versions.findOne({ _id: document.activeVersionId, documentId, processingStatus: 'ready' })
    return {
      document: { ...documentSummary(document), abstract: document.abstract ?? null, summary: document.summary ?? null,
        activeVersion: version ? publicVersion(version) : null },
      canManage: ownerId !== null && document.ownerId === ownerId && document.kind === 'study',
    }
  }

  async listDocuments(ownerId: string | null, query: DocumentQuery, limit: number, after?: DocumentCursor) {
    const [field, order] = query.sort.split(':') as ['title' | 'year' | 'updatedAt', 'asc' | 'desc']
    const direction = order === 'asc' ? 1 : -1
    const filter: Filter<StoredDocument> = this.documentFilter(ownerId)
    if (query.ids.length) filter._id = { $in: query.ids }
    if (query.kind === 'study' || query.kind === 'paper') filter.kind = query.kind
    if (query.subject) filter.subjects = query.subject
    if (query.yearFrom !== undefined || query.yearTo !== undefined) {
      filter.year = { ...(query.yearFrom !== undefined && { $gte: query.yearFrom }), ...(query.yearTo !== undefined && { $lte: query.yearTo }) }
    }
    const steps: object[] = [{ $match: filter }]
    // Use the same key for ordering and paging, including documents with no publication year.
    steps.push({ $set: { sortValue: { $ifNull: [`$${field}`, field === 'year' ? 0 : ''] } } })
    if (after) {
      const value = after.value ?? 0
      steps.push({ $match: { $or: [
        { sortValue: { [direction === 1 ? '$gt' : '$lt']: value } },
        { sortValue: value, _id: { $gt: after.id } },
      ] } })
    }
    steps.push({ $sort: { sortValue: direction, _id: 1 } }, { $limit: limit + 1 })
    return (await this.documents.aggregate<StoredDocument>(steps).toArray()).map(documentSummary)
  }

  async versionChunks(ownerId: string | null, documentId: string, versionId: string, ordinal: number, limit: number, from?: string) {
    await this.version(ownerId, documentId, versionId, true)
    const filter = { documentId, versionId }
    if (from !== undefined) {
      const first = await this.chunks.findOne({ ...filter, _id: from })
      if (!first) throw invalidAnchor()
      ordinal = first.ordinal
    }
    const rows = await this.chunks.find({ ...filter, ordinal: { $gte: ordinal } }).sort({ ordinal: 1 }).limit(limit + 1).toArray()
    return rows.map(({ _id: id, ordinal, text, page, section, start, end, textHash }) =>
      ({ id, documentId, versionId, ordinal, text, page, section, start, end, textHash }))
  }

  async versionSource(ownerId: string | null, documentId: string, versionId: string) {
    const { version, document } = await this.version(ownerId, documentId, versionId, true)
    const fileId = version.sourceFileId
    const allowed = document.allowSourceDownload ?? (ownerId !== null && document.ownerId === ownerId)
    if (!allowed || !fileId || !await this.files.find({ _id: fileId }).hasNext()) {
      throw new ReadingError(404, 'DOCUMENT_SOURCE_NOT_FOUND', 'Không có file nguồn cho phiên bản này.')
    }
    return this.files.openDownloadStream(fileId)
  }
}
