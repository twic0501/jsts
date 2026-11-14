import { createHash, createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { GridFSBucket, MongoClient, type Db } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GET as list } from '../apps/api/app/api/v4/users/me/reading-states/route'
import { GET as get, PUT as put } from '../apps/api/app/api/v4/users/me/reading-states/[documentId]/route'
import { GET as version } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/route'
import { GET as chunks } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/chunks/route'
import { GET as source } from '../apps/api/app/api/v4/documents/[id]/versions/[versionId]/source/route'
import { closeReadingConnection } from '../apps/api/lib/reading-states/api'
import { closeIdentityModule } from '../apps/api/src/modules/identity/identity.bootstrap'

const cachedBinary = fileURLToPath(new URL('../.local/data-engineering/mongodb-binaries/mongod-x64-win32-8.0.16.exe', import.meta.url))
const origin = 'https://paper-magic.example'
const secret = Buffer.alloc(32, 17)
const ownerId = crypto.randomUUID()
const otherId = crypto.randomUUID()
const documentId = crypto.randomUUID()
const otherDocumentId = crypto.randomUUID()
const versionA = crypto.randomUUID()
const versionB = crypto.randomUUID()
const versionOther = crypto.randomUUID()
const chunkA = crypto.randomUUID()
const chunkB = crypto.randomUUID()
const deviceA = 'a'.repeat(43)
const deviceB = 'b'.repeat(43)
const otherUser = 'c'.repeat(43)
const path = '/api/v4/users/me/reading-states'
const stateContext = { params: Promise.resolve({ documentId }) }
const sourceContext = (versionId: string) => ({ params: Promise.resolve({ id: documentId, versionId }) })

function request(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (token) headers.set('Cookie', `__Host-pm_session=${token}`)
  return new Request(origin + path, { ...init, headers })
}

function save(token: string, key: string, condition: [string, string], body: unknown = { versionId: versionA, page: 1, progress: 0.5 }) {
  return put(request(`${path}/${documentId}`, token, {
    method: 'PUT',
    headers: {
      [condition[0]]: condition[1],
      'Content-Type': 'application/json',
      Origin: origin,
      'X-CSRF-Token': createHmac('sha256', secret).update(JSON.stringify(['csrf-session', token])).digest('base64url'),
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  }), stateContext)
}

function open(token?: string) {
  return get(request(`${path}/${documentId}`, token), stateContext)
}

describe('FR17 Next route handlers with a MongoDB replica set', () => {
  let replica: MongoMemoryReplSet | undefined
  let client: MongoClient | undefined
  let db: Db

  beforeAll(async () => {
    const systemBinary = process.env.MONGOMS_SYSTEM_BINARY ?? (existsSync(cachedBinary) ? cachedBinary : undefined)
    replica = await MongoMemoryReplSet.create({
      binary: { version: '8.0.16', ...(systemBinary ? { systemBinary } : {}) },
      replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
    })
    const uri = replica.getUri()
    vi.stubEnv('MONGODB_URI', uri)
    vi.stubEnv('FR17_MONGODB_DB', 'fr17_test')
    vi.stubEnv('IDENTITY_MONGODB_DB', 'fr17_test_identity')
    vi.stubEnv('IDENTITY_SECRET', secret.toString('base64'))
    vi.stubEnv('IDENTITY_ALLOWED_ORIGINS', origin)
    vi.stubEnv('IDENTITY_SESSION_TTL_SECONDS', '3600')
    vi.stubEnv('IDENTITY_SESSION_SAME_SITE', 'Lax')
    vi.stubEnv('IDENTITY_AUTH_WINDOW_SECONDS', '60')
    vi.stubEnv('IDENTITY_AUTH_MAX_ATTEMPTS', '50')
    vi.stubEnv('IDENTITY_AUTH_MAX_CONCURRENT', '4')
    vi.stubEnv('IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS', '86400')
    client = new MongoClient(uri)
    db = client.db('fr17_test')
    const identity = client.db('fr17_test_identity')
    const users = [ownerId, otherId].map((id, index) => ({
      _id: id, id, email: `reader${index}@example.test`, displayName: `Reader ${index}`, role: 'user',
      revision: 1, updatedAt: new Date().toISOString(),
    }))
    await identity.collection<(typeof users)[number]>('identity_users').insertMany(users)
    await identity.collection<{ _id: string; userId: string; expiresAt: Date; revokedAt: null }>('identity_sessions').insertMany(
      [[deviceA, ownerId], [deviceB, ownerId], [otherUser, otherId]].map(([token, userId]) => ({
        _id: createHash('sha256').update(token!).digest('hex'), userId: userId!, revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
      })),
    )

    const bucket = new GridFSBucket(db, { bucketName: 'document_sources' })
    const makeVersion = async (id: string, parentId: string, text: string, activatedAt: Date | null) => {
      const file = bucket.openUploadStream('reader.txt')
      await pipeline(Readable.from([text]), file)
      const textHash = createHash('sha256').update(text).digest('hex')
      return {
        _id: id, documentId: parentId, activatedAt, pageCount: 2, sourceFileId: file.id,
        source: { provider: 'upload', externalIds: [], url: null, license: null, rawHash: textHash, fetchedAt: new Date().toISOString() },
        coverage: 'fulltext', textHash, parserRevision: 'test', activeIndexGeneration: crypto.randomUUID(),
        processingStatus: 'ready', jobId: null, createdAt: new Date().toISOString(),
      }
    }
    const storedA = await makeVersion(versionA, documentId, 'Nội dung A', new Date())
    const storedB = await makeVersion(versionB, documentId, 'Nội dung B', null)
    await db.collection<{ _id: string; ownerId: string; visibility: 'private'; activeVersionId: string; deletedAt: null }>('documents').insertMany([
      { _id: documentId, ownerId, visibility: 'private', activeVersionId: versionA, deletedAt: null },
      { _id: otherDocumentId, ownerId, visibility: 'private', activeVersionId: versionOther, deletedAt: null },
    ])
    await db.collection<typeof storedA>('document_versions').insertMany([
      storedA, storedB, await makeVersion(versionOther, otherDocumentId, 'Tài liệu khác', new Date()),
    ])
    const first = { documentId, ordinal: 0, page: 1, section: null, start: 0, end: 10 }
    await db.collection<typeof first & { _id: string; versionId: string; text: string; textHash: string }>('document_chunks').insertMany([
      { ...first, _id: chunkA, versionId: versionA, text: 'Đoạn A', textHash: storedA.textHash },
      { ...first, _id: chunkB, versionId: versionB, text: 'Đoạn B', textHash: storedB.textHash },
      { ...first, _id: crypto.randomUUID(), versionId: versionA, ordinal: 1, page: 2, text: 'Đoạn A tiếp', textHash: storedA.textHash },
    ])
  }, 60_000)

  afterAll(async () => {
    await closeReadingConnection()
    await closeIdentityModule()
    await client?.close()
    await replica?.stop()
    vi.unstubAllEnvs()
  }, 30_000)

  it('handles two devices, replay, exact-version reads and revoked access', async () => {
    expect((await open()).status).toBe(401)
    expect((await open(otherUser)).status).toBe(404)
    const empty = await open(deviceA)
    expect(empty.status).toBe(404)
    expect((await empty.json()).error.code).toBe('READING_STATE_NOT_FOUND')
    const conditionalCreate: [string, string] = ['If-None-Match', '*']
    const createKeys = [crypto.randomUUID(), crypto.randomUUID()] as const
    const creates = await Promise.all([
      save(deviceA, createKeys[0], conditionalCreate), save(deviceB, createKeys[1], conditionalCreate),
    ])
    expect(creates.map(response => response.status).sort()).toEqual([201, 412])
    const winner = creates[0]?.status === 201 ? 0 : 1
    const created = creates[winner]!
    expect(created.headers.get('location')).toBe(`${path}/${documentId}`)
    expect(created.headers.get('etag')).toBeNull()
    const initial = await created.json()
    expect(initial).toMatchObject({ revision: 1, versionId: versionA, progress: 0.5 })

    const [stateA, stateB] = await Promise.all([open(deviceA), open(deviceB)])
    expect(stateA.headers.get('etag')).toBe('"1"')
    expect(stateB.headers.get('etag')).toBe('"1"')
    const updates = [
      { versionId: versionA, chunkId: chunkA, page: 1, progress: 0.75 },
      { versionId: versionA, chunkId: chunkA, page: 1, progress: 0.25 },
    ] as const
    const updateKeys = [crypto.randomUUID(), crypto.randomUUID()] as const
    const conditionalUpdate: [string, string] = ['If-Match', '"1"']
    const updated = await Promise.all([
      save(deviceA, updateKeys[0], conditionalUpdate, updates[0]),
      save(deviceB, updateKeys[1], conditionalUpdate, updates[1]),
    ])
    expect(updated.map(response => response.status).sort()).toEqual([200, 412])
    const updateWinner = updated[0]?.status === 200 ? 0 : 1
    expect(await updated[1 - updateWinner]!.json()).toMatchObject({ error: { code: 'REVISION_MISMATCH' } })
    const canonical = await updated[updateWinner]!.json()
    expect(updated[updateWinner]!.headers.get('etag')).toBeNull()
    expect(canonical).toMatchObject({ ...updates[updateWinner], revision: 2, id: initial.id })
    const token = [deviceA, deviceB][updateWinner]!
    const replay = await save(token, updateKeys[updateWinner], conditionalUpdate, updates[updateWinner])
    expect(replay.status).toBe(200)
    expect(await replay.json()).toEqual(canonical)
    const createReplay = await save([deviceA, deviceB][winner]!, createKeys[winner], conditionalCreate)
    expect(createReplay.status).toBe(201)
    expect(await createReplay.json()).toEqual(initial)
    const reused = await save(token, updateKeys[updateWinner], conditionalUpdate, { ...updates[updateWinner], progress: 0.8 })
    expect(reused.status).toBe(409)
    expect(await db.collection('reading_states').countDocuments()).toBe(1)
    expect(await db.collection('reading_state_changes').countDocuments()).toBe(2)
    expect(await db.collection('reading_state_receipts').countDocuments()).toBe(2)

    const current = await open(deviceB)
    expect(current.headers.get('etag')).toBe('"2"')
    const bookmark = await current.json()
    expect(bookmark).toEqual(canonical)
    const wrongVersion = await save(deviceA, crypto.randomUUID(), ['If-Match', '"2"'], { versionId: versionOther, page: 99, progress: 2 })
    expect(wrongVersion.status).toBe(404)
    expect((await wrongVersion.json()).error.code).toBe('DOCUMENT_VERSION_NOT_FOUND')
    const wrongAnchor = await save(deviceA, crypto.randomUUID(), ['If-Match', '"2"'], { versionId: versionA, chunkId: chunkB, progress: 0.4 })
    expect(wrongAnchor.status).toBe(422)
    const wrongProgress = await save(deviceA, crypto.randomUUID(), ['If-Match', '"2"'], { versionId: versionA, progress: 2 })
    expect(wrongProgress.status).toBe(422)
    const wrongPage = await save(deviceA, crypto.randomUUID(), ['If-Match', '"2"'], { versionId: versionA, page: 3, progress: 0.4 })
    expect(wrongPage.status).toBe(422)

    // A different module can change the active pointer; FR17 must follow the stored version.
    await db.collection<{ _id: string; activeVersionId: string }>('documents').updateOne({ _id: documentId }, { $set: { activeVersionId: versionB } })
    const documents = `/api/v4/documents/${documentId}/versions`
    const readPath = `${documents}/${bookmark.versionId}`
    const metadata = await version(request(readPath, deviceB), sourceContext(bookmark.versionId))
    expect(await metadata.json()).toMatchObject({ id: versionA, documentId, processingStatus: 'ready' })
    const page = await chunks(request(`${readPath}/chunks?fromChunkId=${bookmark.chunkId}&limit=1`, deviceB), sourceContext(bookmark.versionId))
    const firstPage = await page.json()
    expect(firstPage.items).toMatchObject([{ id: chunkA, versionId: versionA, text: 'Đoạn A' }])
    const cursor = encodeURIComponent(firstPage.nextCursor)
    const secondPage = await chunks(request(`${readPath}/chunks?cursor=${cursor}`, deviceB), sourceContext(versionA))
    expect(await secondPage.json()).toMatchObject({ items: [{ page: 2, versionId: versionA }], nextCursor: null })
    const misplaced = await chunks(request(`${documents}/${versionB}/chunks?cursor=${cursor}`, deviceB), sourceContext(versionB))
    expect(misplaced.status).toBe(400)
    expect(await (await source(request(`${readPath}/source`, deviceB), sourceContext(versionA))).text()).toBe('Nội dung A')
    expect((await source(request(`${readPath}/source`, otherUser), sourceContext(versionA))).status).toBe(404)
    expect(await (await list(request(path, deviceA))).json()).toEqual({ items: [canonical], nextCursor: null })

    const sameKey = crypto.randomUUID()
    const sameCondition: [string, string] = ['If-Match', '"2"']
    const identical = await Promise.all([save(deviceA, sameKey, sameCondition), save(deviceB, sameKey, sameCondition)])
    expect(identical.map(result => result.status)).toEqual([200, 200])
    const [firstReplay, secondReplay] = await Promise.all(identical.map(result => result.json()))
    expect(firstReplay).toMatchObject({ revision: 3, chunkId: null, versionId: versionA })
    expect(secondReplay).toEqual(firstReplay)
    expect(await db.collection('reading_state_changes').countDocuments()).toBe(3)

    await db.collection<{ _id: string; deletedAt: Date | null }>('documents').updateOne({ _id: documentId }, { $set: { deletedAt: new Date() } })
    expect((await open(deviceA)).status).toBe(404)
    expect((await source(request(`${readPath}/source`, deviceB), sourceContext(versionA))).status).toBe(404)
    expect((await save(token, updateKeys[updateWinner], conditionalUpdate, updates[updateWinner])).status).toBe(404)
    expect(await (await list(request(path, deviceA))).json()).toEqual({ items: [], nextCursor: null })
  }, 20_000)
})
