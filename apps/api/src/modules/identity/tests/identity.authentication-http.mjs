// Build API first, then run from jsts. Starts its own Next server and ephemeral Mongo replica.
// It deliberately never uses MONGODB_URI/Identity settings from the caller's environment.
import assert from 'node:assert/strict'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout as wait } from 'node:timers/promises'
import path from 'node:path'
import { MongoClient } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const listener = createServer()
listener.listen(0, '127.0.0.1')
await once(listener, 'listening')
const port = listener.address().port
await new Promise(resolve => listener.close(resolve))
const base = `http://127.0.0.1:${port}`
const allowedOrigin = 'https://paper.test'
const secret = randomBytes(32).toString('base64')
const password = 'isolated-http-test-passphrase'
const databaseName = 'fr12_http_' + randomUUID().replaceAll('-', '')
const replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.16', downloadDir: path.resolve('.local/fr12-test-mongodb-binaries') }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } })
const client = new MongoClient(replica.getUri())
await client.connect()
const database = client.db(databaseName)
const apiRoot = path.resolve('apps/api')
let output = '', server
const tokens = []
const headers = { Origin: allowedOrigin, 'Content-Type': 'application/json' }
const registration = { email: 'http-reader@example.test', password, displayName: 'HTTP Reader' }
async function post(route, body, extra = {}) {
  return fetch(base + route, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) })
}
const hash = token => createHash('sha256').update(token).digest('hex')
function readToken(response) {
  const cookie = response.headers.get('set-cookie') || ''
  const token = cookie.match(/^__Host-pm_session=([^;]+)/)?.[1]
  assert.ok(token, 'Expected opaque session cookie')
  for (const flag of ['HttpOnly', 'Secure', 'Path=/', 'SameSite=Strict', 'Max-Age=3600']) assert.ok(cookie.includes(flag), 'Missing cookie security setting')
  assert.ok(!cookie.includes('Domain='))
  tokens.push(token)
  return token
}

try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: apiRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      MONGODB_URI: replica.getUri(), IDENTITY_MONGODB_DB: databaseName, IDENTITY_SECRET: secret,
      IDENTITY_ALLOWED_ORIGINS: allowedOrigin, IDENTITY_SESSION_TTL_SECONDS: '3600', IDENTITY_SESSION_SAME_SITE: 'Strict',
      IDENTITY_AUTH_WINDOW_SECONDS: '300', IDENTITY_AUTH_MAX_ATTEMPTS: '5', IDENTITY_AUTH_MAX_CONCURRENT: '4',
      IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS: '3600', VITE_AUTH_MODE: 'mock' },
  })
  server.stdout.on('data', data => { output += data.toString() })
  server.stderr.on('data', data => { output += data.toString() })
  server.on('error', () => {})
  let ready = false
  for (let index = 0; index < 100; index++) {
    if (server.exitCode !== null) throw new Error('Test Next server exited before readiness')
    try { if ((await fetch(base)).ok) { ready = true; break } } catch {}
    await wait(100)
  }
  assert.ok(ready, 'Test Next server did not become ready')

  const key = randomUUID()
  const forbiddenRole = await post('/api/v4/users', { ...registration, role: 'admin' }, { 'Idempotency-Key': randomUUID() })
  assert.equal(forbiddenRole.status, 422)
  const registrationResponse = await post('/api/v4/users', registration, { 'Idempotency-Key': key })
  assert.equal(registrationResponse.status, 201)
  assert.equal(registrationResponse.headers.get('location'), '/api/v4/users/me')
  assert.equal(registrationResponse.headers.get('etag'), '"1"')
  assert.equal(registrationResponse.headers.get('set-cookie'), null)
  const user = await registrationResponse.json()
  assert.equal(user.role, 'user')
  assert.deepEqual(Object.keys(user).sort(), ['id', 'email', 'displayName', 'role', 'revision', 'updatedAt'].sort())
  assert.equal(await database.collection('identity_sessions').countDocuments(), 0)
  const retry = await post('/api/v4/users', registration, { 'Idempotency-Key': key })
  assert.equal(retry.status, 201)
  assert.equal((await retry.json()).id, user.id)
  assert.equal((await post('/api/v4/users', registration, { 'Idempotency-Key': randomUUID() })).status, 409)
  const simultaneous = await Promise.all(Array.from({ length: 2 }, () => post('/api/v4/users', { ...registration, email: 'race@example.test' }, { 'Idempotency-Key': randomUUID() })))
  assert.deepEqual(simultaneous.map(response => response.status).sort(), [201, 409])
  assert.equal(await database.collection('identity_users').countDocuments({ email: 'race@example.test' }), 1)
  console.log('PASS HTTP registration: real route/bootstrap/Mongo/Argon2id, role, receipt retry, concurrent unique email, no automatic session')

  const invalid = await post('/api/v4/sessions', { email: registration.email, password: 'wrong' })
  const missing = await post('/api/v4/sessions', { email: 'missing@example.test', password: 'wrong' })
  assert.equal(invalid.status, 401)
  assert.equal(missing.status, 401)
  assert.deepEqual((await invalid.json()).error, (await missing.json()).error)
  const login = await post('/api/v4/sessions', { email: registration.email, password })
  assert.equal(login.status, 200)
  const session = await login.json()
  const token = readToken(login)
  assert.ok(!JSON.stringify(session).includes(token))
  assert.equal(session.user.id, user.id)
  assert.deepEqual(Object.keys(session).sort(), ['user', 'csrfToken', 'expiresAt'].sort())
  assert.ok(await database.collection('identity_sessions').findOne({ _id: hash(token) }))
  assert.equal(login.headers.get('cache-control'), 'private, no-store')
  assert.ok(login.headers.get('x-request-id'))
  const noCsrf = await post('/api/v4/sessions', { email: registration.email, password }, { Cookie: `__Host-pm_session=${token}` })
  assert.equal(noCsrf.status, 403)
  const rotation = await post('/api/v4/sessions', { email: registration.email, password }, { Cookie: `__Host-pm_session=${token}`, 'X-CSRF-Token': session.csrfToken })
  assert.equal(rotation.status, 200)
  const rotatedToken = readToken(rotation)
  const rotatedSession = await rotation.json()
  assert.ok((await database.collection('identity_sessions').findOne({ _id: hash(token) })).revokedAt)
  console.log('PASS HTTP login: generic credential errors, secure opaque cookie, safe JSON, session hashes and CSRF-bound rotation')

  for (let index = 0; index < 5; index++) assert.equal((await post('/api/v4/sessions', { email: 'limited@example.test', password: 'wrong' })).status, 401)
  const limited = await post('/api/v4/sessions', { email: 'limited@example.test', password: 'wrong' })
  assert.equal(limited.status, 429)
  assert.ok(Number(limited.headers.get('retry-after')) > 0)
  const foreign = await post('/api/v4/users', registration, { Origin: 'https://foreign.test', 'Idempotency-Key': randomUUID() })
  assert.equal(foreign.status, 403)
  const accountHeaders = { ...headers, Cookie: `__Host-pm_session=${rotatedToken}`, 'X-CSRF-Token': rotatedSession.csrfToken }
  assert.equal((await fetch(base+'/api/v4/users/me', {headers:accountHeaders})).status, 200)
  const current = await fetch(base+'/api/v4/sessions/current', {headers:accountHeaders})
  assert.equal((await current.json()).user.id, user.id)
  const updated = await fetch(base+'/api/v4/users/me', {method:'PATCH', headers:{...accountHeaders,'If-Match':'"1"','Idempotency-Key':randomUUID()}, body:JSON.stringify({displayName:'HTTP Updated'})})
  assert.equal(updated.status, 200)
  assert.equal(updated.headers.get('etag'), '"2"')
  const logout = await fetch(base+'/api/v4/sessions/current', {method:'DELETE',headers:accountHeaders})
  assert.equal(logout.status, 204)
  assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'))
  assert.equal((await fetch(base+'/api/v4/users/me', {headers:accountHeaders})).status, 401)
  assert.equal((await (await fetch(base+'/api/v4/sessions/current',{headers:accountHeaders})).json()).user, null)
  const records = JSON.stringify(await Promise.all(['identity_users', 'identity_sessions', 'identity_registration_receipts', 'identity_auth_limits'].map(name => database.collection(name).find().toArray())))
  assert.ok(!records.includes(password) && !records.includes(secret))
  assert.ok(tokens.every(token => !records.includes(token)))
  assert.ok(!output.includes(password) && !output.includes(secret))
  assert.ok(tokens.every(token => !output.includes(token)))
  console.log('PASS HTTP profile/session/logout: protected reads, CAS update, revocation and anonymous response; no raw secrets')
} finally {
  if (server && server.exitCode === null) {
    const stopped = once(server, 'exit')
    server.kill()
    await Promise.race([stopped, wait(5000)])
  }
  await client.close()
  await replica.stop()
}
