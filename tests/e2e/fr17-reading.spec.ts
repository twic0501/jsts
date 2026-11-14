import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { test, expect, type Page } from '@playwright/test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const api = 'http://127.0.0.1:43171'
const web = 'http://127.0.0.1:43172'
const documentId = randomUUID()
const versionA = randomUUID()
const versionB = randomUUID()
const title = 'Tài liệu kiểm thử FR17'
const email = 'fr17@example.test'
const password = 'Reading-path-1234!'
const textA = ['Bản A đoạn đầu', 'Bản A đoạn đã lưu', 'Bản A đoạn cuối']
const textB = ['Bản B đoạn mới']
const dbName = 'fr17_browser'
const localBinary = fileURLToPath(new URL('../../.local/data-engineering/mongodb-binaries/mongod-x64-win32-8.0.16.exe', import.meta.url))
let replica: MongoMemoryReplSet | undefined
let mongo: MongoClient | undefined
let workerEnv: NodeJS.ProcessEnv
const servers: Array<{ child: ChildProcess; log: () => string }> = []
const nextEnvPath = root + 'apps/api/next-env.d.ts'
let originalNextEnv: Buffer | undefined

function start(entry: string, cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  let output = ''
  const child = spawn(process.execPath, [entry, ...args], { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: 'pipe' })
  child.stdout?.on('data', bytes => { output = (output + bytes).slice(-9000) })
  child.stderr?.on('data', bytes => { output = (output + bytes).slice(-9000) })
  const server = { child, log: () => output }
  servers.push(server)
  return server
}

async function waitForServer(url: string, server: ReturnType<typeof start>) {
  const deadline = Date.now() + 65_000
  while (Date.now() < deadline && server.child.exitCode === null) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (response.ok) return
    } catch { /* Wait for the test server to start. */ }
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  throw new Error(`Test server unavailable at ${url}\n${server.log()}`)
}

async function shutdown(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    await new Promise<void>(resolve => {
      const kill = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      kill.once('exit', () => resolve())
      kill.once('error', () => resolve())
    })
  } else {
    child.kill('SIGTERM')
  }
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  originalNextEnv = await readFile(nextEnvPath)
  const systemBinary = process.env.MONGOMS_SYSTEM_BINARY ?? (existsSync(localBinary) ? localBinary : undefined)
  replica = await MongoMemoryReplSet.create({
    binary: { version: '8.0.16', ...(systemBinary ? { systemBinary } : {}) },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  })
  const uri = replica.getUri()
  mongo = new MongoClient(uri)
  const db = mongo.db(dbName)
  const timestamp = new Date().toISOString()
  const accountEnv = {
    MONGODB_URI: uri, FR17_MONGODB_DB: dbName, IDENTITY_MONGODB_DB: dbName + '_identity',
    IDENTITY_SECRET: randomBytes(32).toString('base64'), IDENTITY_ALLOWED_ORIGINS: web,
    IDENTITY_SESSION_TTL_SECONDS: '3600', IDENTITY_SESSION_SAME_SITE: 'Lax',
    IDENTITY_AUTH_WINDOW_SECONDS: '60', IDENTITY_AUTH_MAX_ATTEMPTS: '60', IDENTITY_AUTH_MAX_CONCURRENT: '4',
    IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS: '86400', NEXT_TELEMETRY_DISABLED: '1', JSTS_REVIEW_NEXT_DIST: '1',
  }
  workerEnv = accountEnv
  // Next's test env replaces any production settings when the dev server starts.
  const backend = start('node_modules/next/dist/bin/next', root + 'apps/api', ['dev', '--hostname', '127.0.0.1', '--port', '43171'], accountEnv)
  await waitForServer(api + '/api/v4/sessions/current', backend)
  const register = await fetch(api + '/api/v4/users', {
    method: 'POST', headers: { Origin: web, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ email, password, displayName: 'Reader FR17' }),
  })
  expect(register.status, await register.clone().text()).toBe(201)
  const owner = await register.json()
  await db.collection<{ _id: string } & Record<string, unknown>>('documents').insertOne({
    _id: documentId, kind: 'study', ownerId: owner.id, visibility: 'private', title, authors: [], year: null,
    subjects: [], primarySubject: null, indexStatus: 'ready', activeVersionId: versionA, coverage: 'fulltext',
    revision: 1, updatedAt: timestamp, deletedAt: null,
  })
  for (const [id, texts] of [[versionA, textA], [versionB, textB]] as const) {
    const textHash = createHash('sha256').update(texts.join('\n')).digest('hex')
    await db.collection<{ _id: string } & Record<string, unknown>>('document_versions').insertOne({
      _id: id, documentId, processingStatus: 'ready', activatedAt: id === versionA ? new Date() : null,
      source: { provider: 'upload', externalIds: [], url: null, license: null, fetchedAt: timestamp, rawHash: textHash },
      sourceFileId: null, pageCount: texts.length, coverage: 'fulltext', textHash, parserRevision: 'fixture', jobId: null,
      activeIndexGeneration: randomUUID(), createdAt: timestamp,
    })
    await db.collection<{ _id: string } & Record<string, unknown>>('document_chunks').insertMany(texts.map((text, ordinal) => ({
      _id: randomUUID(), documentId, versionId: id, ordinal, text, page: ordinal + 1, section: null, start: 0, end: text.length, textHash,
    })))
  }
  const cookieHeader = await fetch(api + '/api/v4/sessions', {
    method: 'POST', headers: { Origin: web, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(cookieHeader.status).toBe(200)
  const cookie = cookieHeader.headers.get('set-cookie')?.split(';')[0] ?? ''
  const routes = [
    ['/api/v4/documents', 200],
    [`/api/v4/documents/${documentId}`, 200],
    [`/api/v4/documents/${documentId}/versions/${versionA}/chunks`, 200],
    [`/api/v4/users/me/reading-states/${documentId}`, 404],
  ] as const
  for (const [path, status] of routes) {
    const response = await fetch(api + path, { headers: { Cookie: cookie } })
    expect(response.status, path).toBe(status)
    await response.body?.cancel()
  }
  const frontend = start('node_modules/vite/bin/vite.js', root + 'apps/web', ['--host', '127.0.0.1', '--port', '43172'], { JSTS_API_PROXY_TARGET: api })
  await waitForServer(web, frontend)
})

test.afterAll(async () => {
  await Promise.all(servers.map(server => shutdown(server.child)))
  if (originalNextEnv) {
    const current = await readFile(nextEnvPath, 'utf8')
    const generated = originalNextEnv.toString('utf8').replaceAll('./.next/dev/types/', './.local/data-review-next/dev/types/')
    if (current === generated) await writeFile(nextEnvPath, originalNextEnv)
  }
  await mongo?.close()
  await replica?.stop()
})

async function login(page: Page) {
  await page.goto(web)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click({ timeout: 10_000 })
  const form = page.getByRole('form', { name: 'Đăng nhập' })
  await form.getByLabel('Email', { exact: true }).fill(email)
  await form.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đăng xuất (Reader FR17)' })).toBeVisible()
}

async function openDocument(page: Page, name = title) {
  await page.bringToFront()
  await page.getByRole('button', { name: 'Tài liệu', exact: true }).click({ timeout: 10_000 })
  await page.getByRole('button', { name, exact: true }).click({ timeout: 10_000 })
  return page.getByRole('dialog', { name: 'Tài liệu và vị trí đọc' })
}

test('two FR12 sessions save, resolve a conflict, replay and reopen version A after B', async ({ browser }) => {
  test.setTimeout(90_000)
  const first = await browser.newContext()
  const second = await browser.newContext()
  try {
    const a = await first.newPage()
    const b = await second.newPage()
    for (const page of [a, b]) {
      page.setDefaultTimeout(12_000)
      await page.addInitScript(() => {
        // The v4 text reader works on systems without WebGL.
        const getContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (kind: string, options?: unknown) {
          if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null
          return Reflect.apply(getContext, this, [kind, options])
        } as typeof getContext
      })
    }
    await login(a)
    await login(b)
    const readerA = await openDocument(a)
    await expect(readerA.getByText(textA[0]!, { exact: true })).toBeVisible({ timeout: 15_000 })
    await readerA.getByRole('button', { name: 'Đoạn tiếp' }).click()
    await readerA.getByRole('button', { name: 'Lưu vị trí', exact: true }).click()
    await expect(readerA.getByText('Đã lưu vị trí đọc.')).toBeVisible()
    const readerB = await openDocument(b)
    await expect(readerB.getByText(textA[1]!, { exact: true })).toBeVisible()

    await a.bringToFront()
    await readerA.getByRole('button', { name: 'Đoạn tiếp' }).click()
    await readerA.getByRole('button', { name: 'Lưu vị trí', exact: true }).click()
    await expect.poll(async () => (await mongo!.db(dbName).collection('reading_states').findOne({ documentId }))?.revision).toBe(2)
    await b.bringToFront()
    await readerB.getByRole('button', { name: 'Đoạn trước' }).click()
    await readerB.getByRole('button', { name: 'Lưu vị trí', exact: true }).click()
    await expect(readerB.getByRole('region', { name: 'Xung đột vị trí đọc' })).toBeVisible()
    await expect(readerB.getByText(/thiết bị này ở trang 1.*máy chủ ở trang 3/)).toBeVisible()
    await readerB.getByRole('button', { name: 'Dùng vị trí máy chủ' }).click()
    await expect(readerB.getByText(textA[2]!, { exact: true })).toBeVisible()

    // Deliver the PUT to Next and lose only its reply. The next send must replay the same key.
    const pendingRequests: string[] = []
    await b.route('**/api/v4/users/me/reading-states/*', async route => {
      if (route.request().method() !== 'PUT') { await route.continue(); return }
      pendingRequests.push(route.request().headers()['idempotency-key'] ?? '')
      if (pendingRequests.length !== 1) { await route.continue(); return }
      const upstream = await route.fetch()
      expect(upstream.status()).toBe(200)
      await route.abort()
    })
    await readerB.getByRole('button', { name: 'Đoạn trước' }).click()
    await readerB.getByRole('button', { name: 'Lưu vị trí', exact: true }).click()
    await expect(readerB.getByText('Vị trí đang chờ đồng bộ.')).toBeVisible()
    await readerB.getByRole('button', { name: 'Gửi lại vị trí' }).click()
    await expect(readerB.getByText('Đã lưu vị trí đọc.')).toBeVisible()
    expect(pendingRequests).toHaveLength(2)
    expect(pendingRequests[0]).toBe(pendingRequests[1])
    expect(await mongo!.db(dbName).collection('reading_states').findOne({ documentId })).toMatchObject({
      versionId: versionA, page: 2, revision: 3,
    })

    // Device A still holds revision 2. Explicitly choosing its local position is a new write.
    await a.bringToFront()
    await readerA.getByRole('button', { name: 'Lưu vị trí', exact: true }).click()
    await expect(readerA.getByRole('region', { name: 'Xung đột vị trí đọc' })).toBeVisible()
    await readerA.getByRole('button', { name: 'Lưu vị trí thiết bị này' }).click()
    await expect(readerA.getByText('Đã lưu vị trí đọc.')).toBeVisible()
    expect(await mongo!.db(dbName).collection('reading_states').findOne({ documentId })).toMatchObject({
      versionId: versionA, page: 3, revision: 4,
    })

    const db = mongo!.db(dbName)
    await db.collection<{ _id: string }>('document_versions').updateOne({ _id: versionB }, { $set: { activatedAt: new Date() } })
    await db.collection<{ _id: string }>('documents').updateOne({ _id: documentId }, { $set: { activeVersionId: versionB, revision: 2 } })
    await b.reload()
    await expect(b.getByRole('button', { name: 'Đăng xuất (Reader FR17)' })).toBeVisible()
    const reopened = await openDocument(b)
    await expect(reopened.getByText(textA[2]!, { exact: true })).toBeVisible()
    await expect(reopened.getByText('Bạn đang đọc phiên bản đã lưu.')).toBeVisible()
    await reopened.getByRole('button', { name: 'Đọc bản hiện hành từ đầu' }).click()
    await expect(reopened.getByText(textB[0]!, { exact: true })).toBeVisible()
  } finally {
    await Promise.all([first.close(), second.close()])
  }
})

test('FR20 owner edits metadata, tracks a real replacement worker and deletes the document', async ({ page }) => {
  test.setTimeout(100_000)
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind: string, options?: unknown) {
      if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null
      return Reflect.apply(getContext, this, [kind, options])
    } as typeof getContext
  })
  await login(page)
  const reader = await openDocument(page)
  await reader.getByText('Quản lý tài liệu', { exact: true }).click()
  await reader.getByLabel('Tên tài liệu').fill('Tài liệu đã chỉnh FR20')
  await reader.getByRole('button', { name: 'Lưu thông tin' }).click()
  await expect(reader.getByRole('heading', { name: 'Tài liệu đã chỉnh FR20' })).toBeVisible()
  await reader.getByLabel('File thay thế').setInputFiles({
    name: 'replacement.txt', mimeType: 'text/plain', buffer: Buffer.from('Nội dung do worker FR20 công bố'),
  })
  await reader.getByRole('button', { name: 'Thay file', exact: true }).click()
  await expect(reader.getByText('Đang chờ xử lý', { exact: true })).toBeVisible()
  const worker = start('--experimental-strip-types', root + 'apps/api', ['lib/document-management/run-worker.ts'], workerEnv)
  try {
    await expect(reader.getByText('Phiên bản mới đã sẵn sàng.', { exact: true })).toBeVisible({ timeout: 35_000 })
  } catch (error) {
    const jobs = await mongo!.db(dbName).collection('document_jobs').find({}, { projection: { kind: 1, status: 1, stage: 1, attempt: 1, error: 1 } }).toArray()
    throw new Error(`Worker exit ${worker.child.exitCode}. ${worker.log()} Jobs: ${JSON.stringify(jobs)}`, { cause: error })
  }
  await reader.getByRole('button', { name: 'Đọc bản hiện hành từ đầu' }).click()
  await expect(reader.getByText('Nội dung do worker FR20 công bố', { exact: true })).toBeVisible()
  await reader.getByRole('button', { name: 'Xóa tài liệu' }).click()
  await reader.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(reader.getByText('Chưa có tài liệu để đọc.', { exact: true })).toBeVisible()
  const current = await page.request.get(web + '/api/v4/documents/' + documentId)
  expect(current.status()).toBe(404)
})
