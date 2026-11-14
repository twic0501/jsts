import { createHmac, timingSafeEqual } from 'node:crypto'
import { Readable } from 'node:stream'
import { MongoClient, MongoError } from 'mongodb'
import { ReadingError, ReadingStorage, unavailable, uuidPattern, type DocumentSort } from './storage'
import { getIdentityModule } from '../../src/modules/identity/identity.bootstrap'
import { IdentityError } from '../../src/modules/identity/domain/identity.error'
import { readIdentityConfig } from '../../src/modules/identity/identity.config'
import { assertAllowedOrigin, mutationProof, readIdentityJson } from '../../src/modules/identity/presentation/identity.validation'
import { DocumentManagement } from '../document-management/storage'
import { parseMetadata, parseUpload } from '../document-management/inputs'

const tokenPattern = /^[A-Za-z0-9_-]{43}$/
const routeRoot = '/api/v4/users/me/reading-states'
const bodyLimit = 65_536
const cursorTtl = 86_400_000

type Cursor = { scope: string; after: string | number | { id: string; value: string | number | null }; expiresAt: number }
type Context = { params: Promise<{ documentId: string }> }
type VersionContext = { params: Promise<{ id: string; versionId: string }> }
type Config = { uri: string; database: string; secret: Buffer }

function config(): Config {
  const uri = process.env.MONGODB_URI?.trim()
  const encoded = process.env.IDENTITY_SECRET?.trim() ?? ''
  const secret = Buffer.from(encoded, 'base64')
  if (!uri || secret.length < 32 || secret.toString('base64') !== encoded) throw unavailable()
  return { uri, secret, database: process.env.FR17_MONGODB_DB?.trim() || '' }
}

let connection: { client: MongoClient; store: ReadingStorage; management: DocumentManagement; config: Config } | undefined
function dependencies() {
  if (connection) return connection
  const settings = config()
  const client = new MongoClient(settings.uri, { serverSelectionTimeoutMS: 2500, maxPoolSize: 5 })
  const database = settings.database ? client.db(settings.database) : client.db()
  connection = { client, store: new ReadingStorage(client, database), management: new DocumentManagement(client, database), config: settings }
  return connection
}

async function principal(request: Request, required: boolean, mutation = false) {
  const proof = mutationProof(request)
  if (!proof.sessionToken) {
    if (required) throw new ReadingError(401, 'AUTHENTICATION_REQUIRED', 'Cần đăng nhập.')
    return null
  }
  try {
    const user = await getIdentityModule().authorization.requireAuthenticatedUser(proof, mutation)
    if (mutation) assertAllowedOrigin(request, readIdentityConfig(process.env))
    return user.id
  } catch (error) {
    if (!required && error instanceof IdentityError && error.status === 401) return null
    throw error
  }
}

async function requirePrincipal(request: Request, mutation = false) {
  const owner = await principal(request, true, mutation)
  if (owner === null) throw new ReadingError(401, 'AUTHENTICATION_REQUIRED', 'Cần đăng nhập.')
  return owner
}

function idOf(value: string, code = 'INVALID_ID') {
  if (!uuidPattern.test(value)) throw new ReadingError(400, code, 'ID không hợp lệ.')
  return value.toLowerCase()
}

function precondition(request: Request): number | null {
  const match = request.headers.get('if-match')
  const none = request.headers.get('if-none-match')
  if (match === null && none === null) throw new ReadingError(428, 'PRECONDITION_REQUIRED', 'Cần điều kiện ghi.')
  if (match === null && none === '*') return null
  if (none === null && match !== null && /^"[1-9]\d*"$/.test(match)) {
    const value = Number(match.slice(1, -1))
    if (Number.isSafeInteger(value)) return value
  }
  throw new ReadingError(400, 'INVALID_PRECONDITION', 'Gửi đúng một điều kiện ghi hợp lệ.')
}

async function inputOf(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new ReadingError(415, 'CONTENT_TYPE', 'Cần gửi application/json.')
  }
  const length = request.headers.get('content-length')
  const tooLarge = () => new ReadingError(413, 'BODY_TOO_LARGE', 'Dữ liệu gửi quá lớn.')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > bodyLimit)) throw tooLarge()
  const invalidJson = () => new ReadingError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.')
  const reader = request.body?.getReader()
  if (!reader) throw invalidJson()
  let value: unknown
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let bytes = 0
    let text = ''
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > bodyLimit) {
        await reader.cancel().catch(() => undefined)
        throw tooLarge()
      }
      text += decoder.decode(part.value, { stream: true })
    }
    value = JSON.parse(text + decoder.decode())
  } catch (error) {
    if (error instanceof ReadingError) throw error
    throw invalidJson()
  } finally {
    reader.releaseLock()
  }
  const fields = new Set(['versionId', 'chunkId', 'page', 'progress'])
  const input = value as Record<string, unknown> | null
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !fields.has(key)) ||
    typeof input.versionId !== 'string' || !uuidPattern.test(input.versionId)) {
    throw new ReadingError(422, 'INVALID_READING_STATE', 'Dữ liệu vị trí đọc không hợp lệ.')
  }
  return { versionId: input.versionId.toLowerCase(), chunkId: input.chunkId ?? null, page: input.page ?? null, progress: input.progress }
}

function signature(value: string) {
  return createHmac('sha256', dependencies().config.secret).update('fr17:').update(value).digest('base64url')
}

function encodeCursor(scope: string, after: Cursor['after']) {
  const data = Buffer.from(JSON.stringify({ scope, after, expiresAt: Date.now() + cursorTtl })).toString('base64url')
  return data + '.' + signature(data)
}

function decodeCursor(raw: string, scope: string): Cursor['after'] {
  const invalid = () => new ReadingError(400, 'INVALID_CURSOR', 'Cursor không hợp lệ.')
  const [data, mac, extra] = raw.split('.')
  if (!data || !mac || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(data) ||
    !tokenPattern.test(mac) || !timingSafeEqual(Buffer.from(signature(data)), Buffer.from(mac))) throw invalid()
  let cursor: Cursor
  try { cursor = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Cursor } catch { throw invalid() }
  if (cursor.scope !== scope) throw invalid()
  if (cursor.expiresAt <= Date.now()) throw new ReadingError(410, 'CURSOR_EXPIRED', 'Cursor đã hết hạn.')
  return cursor.after
}

function pageQuery(request: Request, mode?: 'chunks' | 'documents') {
  const params = new URL(request.url).searchParams
  const allowed = new Set(['limit', 'cursor'])
  if (mode === 'chunks') allowed.add('fromChunkId')
  if (mode === 'documents') ['ids', 'kind', 'subject', 'yearFrom', 'yearTo', 'sort'].forEach(key => allowed.add(key))
  const invalid = () => new ReadingError(400, 'INVALID_QUERY', 'Tham số phân trang không hợp lệ.')
  for (const param of params.keys()) if (!allowed.has(param) || params.getAll(param).length !== 1) throw invalid()
  const raw = params.get('limit') ?? '20'
  const limit = Number(raw)
  const cursor = params.get('cursor')
  const from = params.get('fromChunkId')
  if (!/^\d{1,3}$/.test(raw) || limit < 1 || limit > 200 ||
    (cursor !== null && (!cursor || cursor.length > 4096 || from !== null))) throw invalid()
  return { limit, cursor, from: from === null ? undefined : idOf(from, 'INVALID_QUERY'), params }
}

async function response(run: (headers: Headers) => Promise<Response>) {
  const requestId = crypto.randomUUID()
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Request-Id': requestId })
  try {
    return await run(headers)
  } catch (error) {
    const failure = error instanceof ReadingError || error instanceof IdentityError ? error
      : error instanceof MongoError ? unavailable()
      : new ReadingError(500, 'INTERNAL_ERROR', 'Không thể xử lý yêu cầu.')
    return Response.json({ error: { code: failure.code, message: failure.message }, requestId },
      { status: failure.status, headers })
  }
}

export function listReadingStates(request: Request) {
  return response(async headers => {
    const owner = await requirePrincipal(request)
    const { limit, cursor } = pageQuery(request)
    const scope = JSON.stringify(['states', owner])
    const after = cursor === null ? '' : String(decodeCursor(cursor, scope))
    const rows = await dependencies().store.list(owner, after, limit)
    const items = rows.slice(0, limit)
    const last = items.at(-1)
    const nextCursor = rows.length > limit && last ? encodeCursor(scope, last.documentId) : null
    return Response.json({ items, nextCursor }, { headers })
  })
}

export function getReadingState(request: Request, context: Context) {
  return response(async headers => {
    const owner = await requirePrincipal(request)
    const documentId = idOf((await context.params).documentId)
    const state = await dependencies().store.get(owner, documentId)
    headers.set('ETag', `"${state.revision}"`)
    return Response.json(state, { headers })
  })
}

export function putReadingState(request: Request, context: Context) {
  return response(async headers => {
    const owner = await requirePrincipal(request, true)
    const documentId = idOf((await context.params).documentId)
    const expected = precondition(request)
    const key = request.headers.get('idempotency-key') ?? ''
    if (!uuidPattern.test(key)) throw new ReadingError(422, 'INVALID_IDEMPOTENCY_KEY', 'Cần Idempotency-Key hợp lệ.')
    const result = await dependencies().store.put(owner, documentId, await inputOf(request), expected, key.toLowerCase())
    if (result.status === 201) headers.set('Location', `${routeRoot}/${documentId}`)
    return Response.json(result.state, { status: result.status, headers })
  })
}

function mutationKey(request: Request) {
  const key = request.headers.get('Idempotency-Key') ?? ''
  if (!uuidPattern.test(key)) throw new ReadingError(422, 'INVALID_IDEMPOTENCY_KEY', 'Cần Idempotency-Key hợp lệ.')
  return key.toLowerCase()
}

function documentRevision(request: Request) {
  if (request.headers.get('If-Match') === null) throw new ReadingError(428, 'PRECONDITION_REQUIRED', 'Cần If-Match.')
  return precondition(request)!
}

export function patchDocument(request: Request, context: { params: Promise<{ id: string }> }) {
  return response(async headers => {
    const owner = await requirePrincipal(request, true)
    const id = idOf((await context.params).id)
    const revision = documentRevision(request)
    const key = mutationKey(request)
    const doc = await dependencies().management.patch(owner, id, revision, key, parseMetadata(await readIdentityJson(request)))
    headers.set('ETag', `"${doc.revision}"`)
    return Response.json(doc, { headers })
  })
}

export function deleteDocument(request: Request, context: { params: Promise<{ id: string }> }) {
  return response(async headers => {
    const owner = await requirePrincipal(request, true)
    const reader = request.body?.getReader()
    if (reader) {
      try {
        // Next can supply an empty body stream for a bodyless HTTP DELETE.
        for (;;) {
          const part = await reader.read()
          if (part.done) break
          if (part.value.byteLength) {
            await reader.cancel().catch(() => undefined)
            throw new ReadingError(400, 'UNEXPECTED_BODY', 'Yêu cầu DELETE không nhận body.')
          }
        }
      } finally { reader.releaseLock() }
    }
    await dependencies().management.remove(owner, idOf((await context.params).id), documentRevision(request), mutationKey(request))
    return new Response(null, { status: 204, headers })
  })
}

export function replaceDocumentVersion(request: Request, context: { params: Promise<{ id: string }> }) {
  return response(async headers => {
    const owner = await requirePrincipal(request, true)
    const id = idOf((await context.params).id)
    const key = mutationKey(request)
    const created = await dependencies().management.replace(owner, id, key, await parseUpload(request))
    headers.set('Location', `/api/v4/documents/${id}/versions/${created.version.id}`)
    return Response.json(created, { status: 201, headers })
  })
}

export function getDocumentJob(request: Request, context: { params: Promise<{ id: string }> }) {
  return response(async headers => {
    const owner = await requirePrincipal(request)
    return Response.json(await dependencies().management.job(owner, idOf((await context.params).id)), { headers })
  })
}

export function getDocumentVersion(request: Request, context: VersionContext) {
  return response(async headers => {
    const owner = await principal(request, false)
    const { id, versionId } = await context.params
    const version = await dependencies().store.versionMetadata(owner, idOf(id), idOf(versionId))
    return Response.json(version, { headers })
  })
}

export function getDocumentDetails(request: Request, context: { params: Promise<{ id: string }> }) {
  return response(async headers => {
    const owner = await principal(request, false)
    const { document, canManage } = await dependencies().store.documentDetails(owner, idOf((await context.params).id))
    headers.set('ETag', `"${document.revision}"`)
    if (canManage) headers.set('X-Can-Manage-Document', 'true')
    return Response.json(document, { headers })
  })
}

export function listDocuments(request: Request) {
  return response(async headers => {
    const owner = await principal(request, false)
    const { cursor, limit, params } = pageQuery(request, 'documents')
    const sort = params.get('sort') ?? 'updatedAt:desc'
    const kind = params.get('kind')
    const subject = params.get('subject')
    const from = params.get('yearFrom')
    const to = params.get('yearTo')
    const ids = params.get('ids')?.split(',').map(id => idOf(id, 'INVALID_QUERY')) ?? []
    if (!['updatedAt:desc', 'year:desc', 'title:asc'].includes(sort) ||
      (kind !== null && !['paper', 'study'].includes(kind)) ||
      (subject !== null && !['ai', 'biology', 'medicine', 'physics'].includes(subject)) ||
      [from, to].some(year => year !== null && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100)) ||
      (from !== null && to !== null && Number(from) > Number(to)) || ids.length > 100 || new Set(ids).size !== ids.length) {
      throw new ReadingError(400, 'INVALID_QUERY', 'Bộ lọc tài liệu không hợp lệ.')
    }
    const query = { sort: sort as DocumentSort, ids: ids.sort(),
      ...(kind && { kind }), ...(subject && { subject }), ...(from && { yearFrom: Number(from) }), ...(to && { yearTo: Number(to) }) }
    const scope = JSON.stringify(['documents', owner, query])
    const decoded = cursor === null ? undefined : decodeCursor(cursor, scope)
    const after = typeof decoded === 'object' ? decoded : undefined
    const rows = await dependencies().store.listDocuments(owner, query, limit, after)
    const items = rows.slice(0, limit)
    const last = items.at(-1)
    const nextCursor = rows.length > limit && last
      ? encodeCursor(scope, { id: last.id, value: sort === 'year:desc' ? last.year : sort === 'title:asc' ? last.title : last.updatedAt })
      : null
    return Response.json({ items, nextCursor }, { headers })
  })
}

export function getVersionChunks(request: Request, context: VersionContext) {
  return response(async headers => {
    const owner = await principal(request, false)
    const params = await context.params
    const documentId = idOf(params.id)
    const versionId = idOf(params.versionId)
    const { limit, cursor, from } = pageQuery(request, 'chunks')
    const scope = JSON.stringify(['chunks', owner, documentId, versionId])
    const ordinal = cursor === null ? 0 : Number(decodeCursor(cursor, scope))
    const rows = await dependencies().store.versionChunks(owner, documentId, versionId, ordinal, limit, from)
    const next = rows[limit]
    return Response.json({ items: rows.slice(0, limit), nextCursor: next ? encodeCursor(scope, next.ordinal) : null }, { headers })
  })
}

export function getVersionSource(request: Request, context: VersionContext) {
  return response(async headers => {
    const owner = await principal(request, false)
    const { id, versionId } = await context.params
    const stream = await dependencies().store.versionSource(owner, idOf(id), idOf(versionId))
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('X-Content-Type-Options', 'nosniff')
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers })
  })
}

export async function closeReadingConnection() {
  await connection?.client.close()
  connection = undefined
}
