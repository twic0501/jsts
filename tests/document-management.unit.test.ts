import { createHash, createHmac, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { GridFSBucket, MongoClient, type Db } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { GET as document, PATCH as patch, DELETE as remove } from '../apps/api/app/api/v4/documents/[id]/route'
import { GET as list } from '../apps/api/app/api/v4/documents/route'
import { POST as replace } from '../apps/api/app/api/v4/documents/[id]/versions/route'
import { GET as getVersion } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/route'
import { GET as chunks } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/chunks/route'
import { GET as source } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/source/route'
import { GET as job } from '../apps/api/app/api/v4/jobs/[id]/route'
import { closeReadingConnection } from '../apps/api/lib/reading-states/api'
import { closeIdentityModule } from '../apps/api/src/modules/identity/identity.bootstrap'
import { DocumentManagement } from '../apps/api/lib/document-management/storage'
import { prepareDocumentJob, runDocumentJob } from '../apps/api/lib/document-management/worker'

const origin = 'https://paper-magic.example'
const secret = Buffer.alloc(32, 12)
const owner = randomUUID()
const id = randomUUID()
const initial = randomUUID()
const token = 'a'.repeat(43)
const csrf = createHmac('sha256', secret).update(JSON.stringify(['csrf-session', token])).digest('base64url')
const context = { params: Promise.resolve({ id }) }
const versionContext = (versionId: string) => ({ params: Promise.resolve({ id, versionId }) })
const jobContext = (id: string) => ({ params: Promise.resolve({ id }) })
const path = '/api/v4/documents/' + id
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const cached = fileURLToPath(new URL('../.local/data-engineering/mongodb-binaries/mongod-x64-win32-8.0.16.exe', import.meta.url))
const testEmbeddings = async (texts: string[]) => texts.map(() => [1, ...Array<number>(383).fill(0)])
let replica: MongoMemoryReplSet | undefined
let client: MongoClient | undefined
let db: Db
let store: DocumentManagement

function request(method = 'GET', suffix = '', headers?: Record<string, string>, body?: BodyInit) {
  return new Request(origin + path + suffix, {
    method, headers: { Origin: origin, Cookie: '__Host-pm_session=' + token, 'X-CSRF-Token': csrf, ...headers }, ...(body !== undefined && { body }),
  })
}

function upload(versionId: string, revision: string | null, key: string, text: string | File = 'Nội dung mới') {
  const body = new FormData()
  if (revision !== null) body.set('baseDocumentRevision', revision)
  body.set('clientVersionId', versionId)
  body.set('file', text instanceof File ? text : new File([text], 'notes.md', { type: 'text/markdown' }))
  return replace(request('POST', '/versions', { 'Idempotency-Key': key }, body), context)
}

function makePdf(text: string) {
  const content = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = pdf.length
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xref = pdf.length
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new File([pdf], 'text.pdf', { type: 'application/pdf' })
}

beforeAll(async () => {
  const systemBinary = process.env.MONGOMS_SYSTEM_BINARY ?? (existsSync(cached) ? cached : undefined)
  replica = await MongoMemoryReplSet.create({
    binary: { version: '8.0.16', ...(systemBinary && { systemBinary }) },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  })
  const uri = replica.getUri()
  for (const [key, value] of Object.entries({
    MONGODB_URI: uri, FR17_MONGODB_DB: 'fr20_test', IDENTITY_MONGODB_DB: 'fr20_identity',
    IDENTITY_SECRET: secret.toString('base64'), IDENTITY_ALLOWED_ORIGINS: origin,
    IDENTITY_SESSION_TTL_SECONDS: '3600', IDENTITY_SESSION_SAME_SITE: 'Lax',
    IDENTITY_AUTH_WINDOW_SECONDS: '60', IDENTITY_AUTH_MAX_ATTEMPTS: '50', IDENTITY_AUTH_MAX_CONCURRENT: '4',
    IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS: '86400',
  })) vi.stubEnv(key, value)
  client = new MongoClient(uri)
  db = client.db('fr20_test')
  store = new DocumentManagement(client, db)
  const now = new Date().toISOString()
  const identity = client.db('fr20_identity')
  await identity.collection<{ _id: string } & Record<string, unknown>>('identity_users').insertOne({
    _id: owner, id: owner, email: 'fr20@example.test', displayName: 'FR20', role: 'user', revision: 1, updatedAt: now,
  })
  await identity.collection<{ _id: string } & Record<string, unknown>>('identity_sessions').insertOne({
    _id: hash(token), userId: owner, expiresAt: new Date(Date.now() + 600_000), revokedAt: null,
  })
  await db.collection<{ _id: string } & Record<string, unknown>>('documents').insertOne({
    _id: id, ownerId: owner, kind: 'study', title: 'Bản gốc', subjects: ['ai'], primarySubject: 'ai',
    authors: [], year: null, coverage: 'fulltext', visibility: 'private', indexStatus: 'ready',
    revision: 1, updatedAt: now, activeVersionId: initial, deletedAt: null,
  })
  const bucket = new GridFSBucket(db, { bucketName: 'document_sources' })
  const blob = bucket.openUploadStream('fixture')
  await new Promise<void>((resolve, reject) => { blob.once('finish', resolve); blob.once('error', reject); blob.end('Nội dung A') })
  await db.collection<{ _id: string } & Record<string, unknown>>('document_versions').insertOne({
    _id: initial, documentId: id, activatedAt: new Date(), processingStatus: 'ready', jobId: null, createdAt: now,
    pageCount: null, sourceFileId: blob.id, mediaType: 'text/plain', coverage: 'fulltext', textHash: hash('Nội dung A'),
    parserRevision: 'utf8-v1', activeIndexGeneration: randomUUID(),
    source: { provider: 'upload', externalIds: [], url: null, license: null, fetchedAt: now, rawHash: hash('Nội dung A') },
  })
  await db.collection<{ _id: string } & Record<string, unknown>>('document_chunks').insertOne({
    _id: randomUUID(), documentId: id, versionId: initial, ordinal: 0, page: null, section: null,
    start: 0, end: 10, text: 'Nội dung A', textHash: hash('Nội dung A'),
  })
}, 60_000)

afterAll(async () => {
  await closeReadingConnection()
  await closeIdentityModule()
  await client?.close()
  await replica?.stop()
  vi.unstubAllEnvs()
}, 30_000)

it('runs FR20 mutations and fences old and deleted versions with real MongoDB transactions', async () => {
  const revision = async () => String((await (await document(request(), context)).json()).revision)
  const firstKey = randomUUID()
  const metadata = () => patch(request('PATCH', '', { 'Content-Type': 'application/json', 'Idempotency-Key': firstKey, 'If-Match': '"1"' },
    JSON.stringify({ title: 'Tiêu đề mới', subjects: ['ai', 'physics'], primarySubject: 'physics' })), context)
  const changed = await metadata()
  expect(changed.status).toBe(200)
  expect(changed.headers.get('etag')).toBe('"2"')
  expect(await changed.json()).toMatchObject({ revision: 2, title: 'Tiêu đề mới', indexStatus: 'processing' })
  expect(await (await metadata()).json()).toMatchObject({ revision: 2 })
  const reindex = await store.claim()
  expect(reindex?.kind).toBe('reindex')
  expect(await store.publish(reindex!, (await prepareDocumentJob(store, reindex!, testEmbeddings))!)).toBe(true)

  const old = randomUUID()
  const newest = randomUUID()
  expect((await upload(old, null, randomUUID())).status).toBe(428)
  expect((await upload(old, '1.5', randomUUID())).status).toBe(422)
  expect(await (await upload(old, '1', randomUUID())).json()).toMatchObject({ error: { code: 'DOCUMENT_REVISION_MISMATCH' } })
  const beforeOld = await revision()
  const oldKey = randomUUID()
  const queued = await upload(old, beforeOld, oldKey)
  expect(queued.status).toBe(201)
  expect(queued.headers.get('location')).toBe(path + '/versions/' + old)
  const firstVersion = await queued.json()
  expect(firstVersion).toMatchObject({ processingStatus: 'queued', version: { id: old, textHash: null, activeIndexGeneration: null } })
  expect(await (await upload(old, beforeOld, oldKey)).json()).toEqual(firstVersion)
  expect((await upload(old, await revision(), oldKey)).status).toBe(409)
  expect((await upload(old, beforeOld, oldKey, 'Nội dung thay đổi')).status).toBe(409)
  expect(await db.collection('document_jobs').countDocuments({ kind: 'ingestion' })).toBe(1)
  const oldJob = await store.claim()
  expect(oldJob?.resourceId).toBe(old)
  const oldResult = await prepareDocumentJob(store, oldJob!, testEmbeddings)
  expect(oldResult).not.toBeNull()

  const newVersion = await upload(newest, await revision(), randomUUID(), makePdf('Version C PDF'))
  expect(newVersion.status).toBe(201)
  expect(await (await document(request(), context)).json()).toMatchObject({ activeVersionId: initial })
  const newJob = await store.claim()
  expect(newJob?.resourceId).toBe(newest)
  const newResult = await prepareDocumentJob(store, newJob!, testEmbeddings)
  expect(newResult?.pageCount).toBe(1)
  expect(newResult?.chunks[0]?.text).toBe('Version C PDF')
  expect(await store.publish(newJob!, newResult!)).toBe(true)
  expect(await store.publish(oldJob!, oldResult!)).toBe(false)
  expect(await (await job(request(), jobContext(oldJob!._id))).json()).toMatchObject({
    status: 'failed', error: { code: 'VERSION_SUPERSEDED' },
  })
  expect(await (await document(request(), context)).json()).toMatchObject({ activeVersionId: newest, indexStatus: 'ready' })
  expect(await (await source(request(), versionContext(initial))).text()).toBe('Nội dung A')
  expect(await (await chunks(request(), versionContext(newest))).json()).toMatchObject({ items: [{ text: 'Version C PDF', page: 1 }] })

  const last = randomUUID()
  expect((await upload(last, await revision(), randomUUID())).status).toBe(201)
  const running = await store.claim()
  const prepared = await prepareDocumentJob(store, running!, testEmbeddings)
  expect(prepared).not.toBeNull()
  const deleteKey = randomUUID()
  const etag = `"${await revision()}"`
  const deleteCall = (key: string) => remove(request('DELETE', '', { 'If-Match': etag, 'Idempotency-Key': key }), context)
  expect((await deleteCall(deleteKey)).status).toBe(204)
  expect((await deleteCall(deleteKey)).status).toBe(204)
  expect((await deleteCall(randomUUID())).status).toBe(404)
  expect((await document(request(), context)).status).toBe(404)
  expect(await (await list(new Request(origin + '/api/v4/documents', { headers: { Cookie: '__Host-pm_session=' + token } }))).json()).toMatchObject({ items: [] })
  for (const version of [initial, old, newest, last]) {
    const ctx = versionContext(version)
    expect((await getVersion(request(), ctx)).status).toBe(404)
    expect((await chunks(request(), ctx)).status).toBe(404)
    expect((await source(request(), ctx)).status).toBe(404)
  }
  expect((await job(request(), jobContext(running!._id))).status).toBe(404)
  expect(await store.publish(running!, prepared!)).toBe(false)
  expect(await runDocumentJob(store)).toBe(true)
  expect(await db.collection('document_versions').countDocuments({ documentId: id })).toBe(0)
  expect(await db.collection('document_sources.files').countDocuments()).toBe(0)
  expect(await db.collection('document_index_vectors').countDocuments({ documentId: id })).toBe(0)
  expect((await deleteCall(deleteKey)).status).toBe(204)
}, 45_000)
