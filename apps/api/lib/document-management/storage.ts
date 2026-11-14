import { createHash, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { GridFSBucket, MongoServerError, ObjectId, type ClientSession, type Db, type MongoClient } from 'mongodb'
import {
  documentNotFound, documentSummary, publicVersion, ReadingError,
  type StoredChunk, type StoredDocument, type StoredVersion,
} from '../reading-states/storage.ts'

export type MetadataPatch = Partial<Pick<StoredDocument, 'title' | 'subjects' | 'primarySubject'>>
export type Upload = { versionId: string; revision: number; file: File; mediaType: string }
export type JobError = { code: string; message: string }
type ManagedDocument = StoredDocument & { metadataIndexToken?: string }
export type DocumentJob = {
  _id: string; kind: 'ingestion' | 'reindex' | 'cleanup'; documentId: string; resourceId: string; ownerId: string
  status: 'queued' | 'running' | 'succeeded' | 'failed'; stage: string; attempt: number; updatedAt: string
  error: JobError | null; leaseId?: string; leaseUntil?: Date; runAfter: Date; indexToken?: string
}
export type PreparedVersion = {
  chunks: StoredChunk[]; vectors: Array<{ chunkId: string | null; vector: number[] }>
  title: string; textHash: string; pageCount: number | null; parserRevision: string
}
type ReceiptBody = ReturnType<typeof publicVersionCreated> | Awaited<ReturnType<DocumentManagement['documentView']>> | null
type Receipt = { _id: string; fingerprint: string; body: ReceiptBody; expiresAt: Date }
type IndexVector = { documentId: string; versionId: string; generation: string; chunkId: string | null; vector: number[] }

const dayMs = 86_400_000
const leaseMs = 120_000
const maxAttempts = 3
const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')
const isTerminal = (job: DocumentJob) => job.status === 'failed' || job.status === 'succeeded'
const superseded = { code: 'VERSION_SUPERSEDED', message: 'Một yêu cầu thay file mới hơn đã được chấp nhận.' }
const revoked = { code: 'DOCUMENT_DELETED', message: 'Tài liệu đã bị xóa.' }
const reindexed = { code: 'INDEX_SUPERSEDED', message: 'Dữ liệu lập chỉ mục đã thay đổi.' }

function publicVersionCreated(version: StoredVersion, jobId: string) {
  return { version: publicVersion(version), jobId, processingStatus: 'queued' as const }
}

export class DocumentManagement {
  private readonly client: MongoClient
  private readonly documents
  private readonly versions
  private readonly chunks
  private readonly jobs
  private readonly receipts
  private readonly vectors
  private readonly changes
  readonly sources
  private indexes: Promise<unknown> | undefined

  constructor(client: MongoClient, database: Db) {
    this.client = client
    this.documents = database.collection<ManagedDocument>('documents')
    this.versions = database.collection<StoredVersion>('document_versions')
    this.chunks = database.collection<StoredChunk>('document_chunks')
    this.jobs = database.collection<DocumentJob>('document_jobs')
    this.receipts = database.collection<Receipt>('document_write_receipts')
    this.vectors = database.collection<IndexVector>('document_index_vectors')
    this.changes = database.collection('document_changes')
    this.sources = new GridFSBucket(database, { bucketName: 'document_sources' })
  }

  private async ready() {
    this.indexes ??= Promise.all([
      this.receipts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.jobs.createIndex({ status: 1, runAfter: 1 }),
      this.jobs.createIndex({ documentId: 1 }),
      this.versions.createIndex({ documentId: 1 }),
      this.chunks.createIndex({ documentId: 1, versionId: 1, ordinal: 1 }, { unique: true }),
      this.vectors.createIndex({ documentId: 1, generation: 1 }),
    ]).catch(error => { this.indexes = undefined; throw error })
    await this.indexes
  }

  private async owned(owner: string, id: string, session?: ClientSession, allowDeleted = false) {
    const document = await this.documents.findOne({ _id: id }, session ? { session } : {})
    if (!document || (document.deletedAt && !allowDeleted)) throw documentNotFound()
    if (document.ownerId !== owner || document.kind !== 'study') {
      if (document.deletedAt || (document.visibility !== 'public' && document.ownerId !== owner)) throw documentNotFound()
      throw new ReadingError(403, 'DOCUMENT_MANAGEMENT_FORBIDDEN', 'Chỉ chủ tài liệu đã nhập được quản lý tài liệu này.')
    }
    return document
  }

  private transaction<T>(action: (session: ClientSession) => Promise<T>) {
    return this.client.withSession(session =>
      session.withTransaction(() => action(session), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }))
  }

  private async mutate(
    owner: string, id: string, method: 'PATCH' | 'DELETE' | 'POST', key: string, revision: number, input: unknown,
    action: (doc: ManagedDocument, session: ClientSession, now: Date) => Promise<ReceiptBody>,
  ) {
    await this.ready()
    const receiptId = hash(JSON.stringify([owner, id, method, key]))
    const fingerprint = hash(JSON.stringify([revision, input]))
    return this.transaction(async session => {
      const now = new Date()
      const doc = await this.owned(owner, id, session, method === 'DELETE')
      const receipt = await this.receipts.findOne({ _id: receiptId, expiresAt: { $gt: now } }, { session })
      if (doc.deletedAt && !receipt) throw documentNotFound()
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) {
          throw new ReadingError(409, 'IDEMPOTENCY_KEY_REUSED', 'Khóa retry đã dùng cho yêu cầu khác.')
        }
        return { body: receipt.body, replayed: true }
      }
      if (doc.revision !== revision) {
        throw method === 'POST'
          ? new ReadingError(409, 'DOCUMENT_REVISION_MISMATCH', 'Hãy đọc lại tài liệu để lấy revision hiện tại.')
          : new ReadingError(412, 'REVISION_MISMATCH', 'Tài liệu đã thay đổi. Hãy tải lại.')
      }
      const body = await action(doc, session, now)
      await this.receipts.replaceOne({ _id: receiptId }, { fingerprint, body, expiresAt: new Date(now.getTime() + dayMs) }, { upsert: true, session })
      return { body, replayed: false }
    })
  }

  private async documentView(doc: ManagedDocument, session: ClientSession) {
    const version = doc.activeVersionId === null ? null
      : await this.versions.findOne({ _id: doc.activeVersionId, documentId: doc._id, processingStatus: 'ready' }, { session })
    return { ...documentSummary(doc), abstract: doc.abstract ?? null, summary: doc.summary ?? null, activeVersion: version ? publicVersion(version) : null }
  }

  private async change(doc: ManagedDocument, action: 'PUT' | 'DELETE', session: ClientSession, now: Date) {
    await this.changes.insertOne({
      ownerId: doc.ownerId, id: randomUUID(), entityType: 'document', entityId: doc._id,
      revision: doc.revision, action, value: action === 'PUT' ? documentSummary(doc) : null, committedAt: now,
    }, { session })
  }

  private enqueue(
    doc: ManagedDocument, id: string, kind: DocumentJob['kind'], resourceId: string, session: ClientSession, now: Date, indexToken?: string,
  ) {
    return this.jobs.insertOne({
      _id: id, kind, resourceId, documentId: doc._id, ownerId: doc.ownerId!,
      status: 'queued', stage: 'queued', attempt: 0, error: null, updatedAt: now.toISOString(), runAfter: now,
      ...(indexToken && { indexToken }),
    }, { session })
  }

  async patch(owner: string, id: string, revision: number, key: string, patch: MetadataPatch) {
    const result = await this.mutate(owner, id, 'PATCH', key, revision, patch, async (doc, session, now) => {
      const updated = { ...doc, ...patch, revision: doc.revision + 1, updatedAt: now.toISOString() }
      if (updated.primarySubject !== null && !updated.subjects.includes(updated.primarySubject)) {
        throw new ReadingError(422, 'INVALID_DOCUMENT_METADATA', 'Nhãn chính phải nằm trong danh sách nhãn.')
      }
      if (patch.title !== undefined && patch.title !== doc.title && doc.activeVersionId !== null) {
        updated.indexStatus = 'processing'
        updated.activeIndexGeneration = null
        updated.metadataIndexToken = randomUUID()
        await this.enqueue(doc, randomUUID(), 'reindex', doc.activeVersionId, session, now, updated.metadataIndexToken)
      }
      await this.documents.replaceOne({ _id: id }, updated, { session })
      await this.change(updated, 'PUT', session, now)
      return this.documentView(updated, session)
    })
    return result.body as Awaited<ReturnType<DocumentManagement['documentView']>>
  }

  async replace(owner: string, id: string, key: string, upload: Upload) {
    await this.owned(owner, id)
    const digest = createHash('sha256')
    const stream = this.sources.openUploadStream('document-source', { metadata: { mediaType: upload.mediaType, documentId: id } })
    async function* sourceBytes() {
      for await (const bytes of Readable.fromWeb(upload.file.stream() as Parameters<typeof Readable.fromWeb>[0])) {
        digest.update(bytes as Buffer)
        yield bytes
      }
    }
    try { await pipeline(sourceBytes(), stream) } catch (error) {
      await this.removeSource(stream.id).catch(() => undefined)
      throw error
    }
    const rawHash = digest.digest('hex')
    try {
      const result = await this.mutate(owner, id, 'POST', key, upload.revision, [upload.versionId, rawHash, upload.mediaType], async (doc, session, now) => {
        if (await this.versions.findOne({ _id: upload.versionId }, { session, projection: { _id: 1 } })) {
          throw new ReadingError(409, 'VERSION_ID_CONFLICT', 'ID phiên bản đã được sử dụng.')
        }
        const jobId = randomUUID()
        const version: StoredVersion = {
          _id: upload.versionId, documentId: id, sourceFileId: stream.id, mediaType: upload.mediaType,
          source: { provider: 'upload', externalIds: [], url: null, license: null, fetchedAt: now.toISOString(), rawHash },
          processingStatus: 'queued', activatedAt: null, pageCount: null, coverage: null, textHash: null,
          parserRevision: null, activeIndexGeneration: null, jobId, createdAt: now.toISOString(),
        }
        const updated = { ...doc, latestReplacementVersionId: version._id, revision: doc.revision + 1, updatedAt: now.toISOString() }
        // Touch the document before inserting the version so competing writes retry against its new revision.
        await this.documents.replaceOne({ _id: id }, updated, { session })
        await this.versions.insertOne(version, { session })
        await this.enqueue(doc, jobId, 'ingestion', version._id, session, now)
        await this.change(updated, 'PUT', session, now)
        return publicVersionCreated(version, jobId)
      })
      if (result.replayed) await this.removeSource(stream.id).catch(() => undefined)
      return result.body as ReturnType<typeof publicVersionCreated>
    } catch (error) {
      // Application rejections cannot commit. Preserve the blob on ambiguous database failures.
      if (error instanceof ReadingError || (error instanceof MongoServerError && error.code === 11000)) {
        await this.removeSource(stream.id).catch(() => undefined)
      }
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ReadingError(409, 'VERSION_ID_CONFLICT', 'ID phiên bản đã được sử dụng.')
      }
      throw error
    }
  }

  async remove(owner: string, id: string, revision: number, key: string) {
    await this.mutate(owner, id, 'DELETE', key, revision, null, async (doc, session, now) => {
      const deleted: ManagedDocument = {
        ...doc, deletedAt: now, indexStatus: 'deleting', latestReplacementVersionId: null,
        activeIndexGeneration: null, revision: doc.revision + 1, updatedAt: now.toISOString(),
      }
      await this.documents.replaceOne({ _id: id }, deleted, { session })
      await this.change(deleted, 'DELETE', session, now)
      await this.enqueue(doc, randomUUID(), 'cleanup', id, session, now)
      return null
    })
  }

  async job(owner: string, id: string) {
    const job = await this.jobs.findOne({ _id: id, ownerId: owner, kind: { $ne: 'cleanup' } })
    if (!job) throw new ReadingError(404, 'JOB_NOT_FOUND', 'Không tìm thấy tác vụ.')
    await this.owned(owner, job.documentId)
    const { kind, resourceId, status, stage, attempt, error, updatedAt } = job
    return { id, kind, resourceId, status, stage, attempt, error, updatedAt }
  }

  async claim() {
    await this.ready()
    const now = new Date()
    const job = await this.jobs.findOneAndUpdate({
      $or: [{ status: 'queued', runAfter: { $lte: now } }, { status: 'running', leaseUntil: { $lte: now } }],
    }, {
      $set: { status: 'running', stage: 'running', leaseId: randomUUID(), leaseUntil: new Date(now.getTime() + leaseMs), updatedAt: now.toISOString() },
      $inc: { attempt: 1 },
    }, { sort: { runAfter: 1, _id: 1 }, returnDocument: 'after' })
    if (job && job.attempt > maxAttempts) {
      await this.fail(job, { code: 'JOB_RETRIES_EXHAUSTED', message: 'Tác vụ đã hết số lần thử.' }, false)
      return null
    }
    return job
  }

  private lease(job: DocumentJob) {
    return { _id: job._id, status: 'running' as const, leaseId: job.leaseId!, leaseUntil: { $gt: new Date() } }
  }

  async stage(job: DocumentJob, stage: string) {
    const now = new Date()
    const result = await this.jobs.updateOne(this.lease(job), { $set: { stage, leaseUntil: new Date(now.getTime() + leaseMs), updatedAt: now.toISOString() } })
    if (!result.matchedCount) return false
    if (job.kind === 'ingestion' && ['extracting', 'chunking', 'embedding', 'indexing'].includes(stage)) {
      // The final outcome is committed with the lease, not via this progress update.
      await this.transaction(async session => {
        if (!await this.jobs.findOne(this.lease(job), { session })) return
        await this.versions.updateOne({ _id: job.resourceId, processingStatus: { $nin: ['ready', 'failed'] } },
          { $set: { processingStatus: stage as StoredVersion['processingStatus'] } }, { session })
      })
    }
    return true
  }

  async inputs(job: DocumentJob) {
    const doc = await this.documents.findOne({ _id: job.documentId })
    const version = await this.versions.findOne({ _id: job.resourceId, documentId: job.documentId })
    const reason = this.outdated(job, doc)
    if (reason || !version || !doc) {
      await this.fail(job, reason ?? revoked, false)
      return null
    }
    return { version, title: doc.title }
  }

  private outdated(job: DocumentJob, doc: ManagedDocument | null): JobError | null {
    if (!doc || doc.deletedAt) return revoked
    if (job.kind === 'ingestion' && doc.latestReplacementVersionId !== job.resourceId) return superseded
    if (job.kind === 'reindex' && (doc.activeVersionId !== job.resourceId || doc.metadataIndexToken !== job.indexToken)) return reindexed
    return null
  }

  existingChunks(job: DocumentJob) {
    return this.chunks.find({ documentId: job.documentId, versionId: job.resourceId }).sort({ ordinal: 1 }).toArray()
  }

  async publish(job: DocumentJob, prepared: PreparedVersion) {
    return this.transaction(async session => {
      const doc = await this.documents.findOne({ _id: job.documentId }, { session })
      const reason = this.outdated(job, doc)
      if (!doc || reason) {
        await this.finish(job, reason ?? revoked, session)
        return false
      }
      if (doc.title !== prepared.title) {
        await this.finish(job, reindexed, session, true)
        return false
      }
      // Acquiring the job and writing the document participate in the same transaction as publication.
      if (!await this.finish(job, null, session)) return false
      const generation = job.leaseId!
      const now = new Date()
      const updated: ManagedDocument = {
        ...doc, activeVersionId: job.resourceId, indexStatus: 'ready',
        activeIndexGeneration: generation, revision: doc.revision + 1, updatedAt: now.toISOString(),
        ...(job.kind === 'ingestion' && { coverage: 'fulltext' as const, summary: null, abstract: null }),
      }
      await this.documents.replaceOne({ _id: doc._id }, updated, { session })
      if (job.kind === 'ingestion' && doc.activeVersionId && doc.activeVersionId !== job.resourceId) {
        // An imported active version is historical from this commit onward, including older rows without activatedAt.
        await this.versions.updateOne({ _id: doc.activeVersionId, documentId: doc._id, activatedAt: null },
          { $set: { activatedAt: now } }, { session })
      }
      if (job.kind === 'ingestion') {
        await this.chunks.insertMany(prepared.chunks, { session })
        await this.versions.updateOne({ _id: job.resourceId }, { $set: {
          activatedAt: now, processingStatus: 'ready', coverage: 'fulltext', textHash: prepared.textHash,
          parserRevision: prepared.parserRevision, pageCount: prepared.pageCount, activeIndexGeneration: generation,
        } }, { session })
      } else {
        await this.versions.updateOne({ _id: job.resourceId }, { $set: { activeIndexGeneration: generation } }, { session })
      }
      await this.vectors.deleteMany({ documentId: doc._id, versionId: job.resourceId }, { session })
      await this.vectors.insertMany(prepared.vectors.map(vector => ({
        ...vector, documentId: doc._id, versionId: job.resourceId, generation,
      })), { session })
      await this.change(updated, 'PUT', session, now)
      return true
    })
  }

  private async finish(job: DocumentJob, error: JobError | null, session: ClientSession, retry = false) {
    if (isTerminal(job)) return false
    const now = new Date()
    const reschedule = retry && job.attempt < maxAttempts
    const stage = reschedule ? 'queued' : error ? error.code === superseded.code ? 'superseded' : 'failed' : 'ready'
    const result = await this.jobs.updateOne(this.lease(job), {
      $set: { status: reschedule ? 'queued' : error ? 'failed' : 'succeeded', stage,
        error: reschedule ? null : error, updatedAt: now.toISOString(), runAfter: new Date(now.getTime() + 1000 * job.attempt) },
      $unset: { leaseId: '', leaseUntil: '' },
    }, { session })
    if (result.matchedCount && error && job.kind === 'ingestion') {
      await this.versions.updateOne({ _id: job.resourceId, processingStatus: { $ne: 'ready' } },
        { $set: { processingStatus: reschedule ? 'queued' : 'failed' } }, { session })
    }
    if (result.matchedCount && error && !reschedule && job.kind === 'reindex' && job.indexToken) {
      const doc = await this.documents.findOne({
        _id: job.documentId, deletedAt: null, activeVersionId: job.resourceId, metadataIndexToken: job.indexToken,
      }, { session })
      if (doc) {
        const failed: ManagedDocument = { ...doc, indexStatus: 'failed', revision: doc.revision + 1, updatedAt: now.toISOString() }
        await this.documents.replaceOne({ _id: doc._id }, failed, { session })
        await this.change(failed, 'PUT', session, now)
      }
    }
    return result.matchedCount === 1
  }

  fail(job: DocumentJob, error: JobError, retry: boolean) {
    return this.transaction(session => this.finish(job, error, session, retry))
  }

  private async removeSource(id: ObjectId) {
    try { await this.sources.delete(id) } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('File not found for id')) throw error
    }
  }

  async cleanup(job: DocumentJob) {
    const doc = await this.documents.findOne({ _id: job.documentId })
    if (!doc?.deletedAt) throw new Error('Cleanup requires a tombstone')
    for await (const version of this.versions.find({ documentId: job.documentId })) {
      if (!await this.stage(job, 'cleanup')) return
      if (version.sourceFileId) await this.removeSource(version.sourceFileId)
    }
    // Also remove completed uploads whose receipt outcome was uncertain at the HTTP boundary.
    for await (const source of this.sources.find({ 'metadata.documentId': job.documentId })) {
      if (!await this.stage(job, 'cleanup')) return
      await this.removeSource(source._id)
    }
    await this.transaction(async session => {
      if (!await this.finish(job, null, session)) return
      await this.chunks.deleteMany({ documentId: job.documentId }, { session })
      await this.vectors.deleteMany({ documentId: job.documentId }, { session })
      await this.versions.deleteMany({ documentId: job.documentId }, { session })
    })
  }
}
