import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { MongoClient, type Db } from 'mongodb'
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server'
import path from 'node:path'
import { MongoIdentityRepository } from '../infrastructure/mongo-identity.repository'
import { Argon2PasswordHasher } from '../infrastructure/identity.crypto'
import { IdentityUnavailableError } from '../domain/identity.error'
import type { SessionRepository } from '../ports/session.repository'
import { authenticationFixture, post, testConfig, validRegistration } from './authentication.fixtures'

const binary = { version: '8.0.16', downloadDir: path.resolve('.local/fr12-test-mongodb-binaries') }
let replica: MongoMemoryReplSet, client: MongoClient, db: Db, repository: MongoIdentityRepository
let fixture: ReturnType<typeof authenticationFixture>
let clock: Date
const databaseName = 'fr12_tests_' + randomUUID().replaceAll('-', '')

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ binary, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } })
  const uri = replica.getUri()
  client = new MongoClient(uri)
  await client.connect()
  db = client.db(databaseName)
  repository = new MongoIdentityRepository(uri, databaseName)
  await repository.findById(randomUUID()) // Create the real unique/TTL indexes before tests.
})
beforeEach(async () => {
  await Promise.all(['identity_users', 'identity_sessions', 'identity_registration_receipts', 'identity_auth_limits'].map(name => db.collection(name).deleteMany({})))
  clock = new Date()
  fixture = authenticationFixture(repository, testConfig(replica.getUri(), databaseName), { now: () => clock })
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => { await repository?.close(); await client?.close(); await replica?.stop() })

async function register(value: unknown = validRegistration, key: string = randomUUID()) {
  return fixture.controller.registerUser(post('/api/v4/users', value, { 'Idempotency-Key': key }))
}
async function login(value: unknown = { email: validRegistration.email, password: validRegistration.password }, headers: Record<string, string> = {}) {
  return fixture.controller.createSession(post('/api/v4/sessions', value, headers))
}
function tokenOf(response: Response) {
  const token = response.headers.get('set-cookie')?.match(/^__Host-pm_session=([^;]+)/)?.[1]
  if (!token) throw new Error('Expected a session cookie')
  return token
}

describe('Registration with actual Mongo transactions and Argon2id', () => {
  it('commits a safe User, default user role and password hash without creating a session', async () => {
    const fingerprints=vi.spyOn(fixture.crypto,'fingerprint')
    const response = await register({ ...validRegistration, email: ' READER@EXAMPLE.TEST ' })
    expect(response.status).toBe(201)
    const user = await response.json()
    expect(Object.keys(user).sort()).toEqual(['id', 'displayName', 'email', 'role', 'revision', 'updatedAt'].sort())
    expect(user).toMatchObject({ email: 'reader@example.test', displayName: 'Reader', role: 'user', revision: 1 })
    expect(response.headers.get('location')).toBe('/api/v4/users/me')
    expect(response.headers.get('etag')).toBe('"1"')
    expect(response.headers.get('set-cookie')).toBeNull()
    const row = await db.collection('identity_users').findOne({ email: user.email })
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(await new Argon2PasswordHasher().verify(row!.passwordHash, validRegistration.password)).toBe(true)
    expect(await db.collection('identity_sessions').countDocuments()).toBe(0)
    expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(1)
    const receipt = await db.collection('identity_registration_receipts').findOne({})
    expect(receipt?.fingerprint.startsWith('$argon2id$')).toBe(true)
    expect(JSON.stringify(fingerprints.mock.calls)).not.toContain(validRegistration.password)
    expect(await new Argon2PasswordHasher().verify(receipt!.fingerprint, JSON.stringify([user.email, validRegistration.password, user.displayName]))).toBe(true)
    const stored = JSON.stringify(await Promise.all(['identity_users', 'identity_sessions', 'identity_registration_receipts'].map(name => db.collection(name).find().toArray())))
    expect(stored.includes(validRegistration.password)).toBe(false)
    expect(JSON.stringify(user).includes('passwordHash')).toBe(false)
  })

  it.each([
    null, [], {}, { email: 'invalid', password: 'a'.repeat(12), displayName: 'Reader' },
    { email: 'reader@example.test', displayName: 'Reader' },
    { ...validRegistration, password: 'a'.repeat(11) }, { ...validRegistration, password: 'a'.repeat(257) },
    { ...validRegistration, displayName: '' }, { ...validRegistration, displayName: 'a'.repeat(101) },
    { ...validRegistration, email: ' '.repeat(254) + validRegistration.email },
    { ...validRegistration, role: 'admin' }, { ...validRegistration, userId: randomUUID() },
    { ...validRegistration, confirmPassword: validRegistration.password },
  ])('rejects invalid/extra registration input without inserting an account (%#)', async input => {
    const response = await register(input)
    expect(response.status).toBe(422)
    expect(await db.collection('identity_users').countDocuments()).toBe(0)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('uses the documented Unicode character bounds, without an extra password-complexity policy', async () => {
    expect((await register({ ...validRegistration, password: '🙂'.repeat(12), displayName: '🙂'.repeat(100) })).status).toBe(201)
    expect((await login({ email: validRegistration.email, password: '🙂'.repeat(12) })).status).toBe(200)
  })

  it('requires a UUID idempotency key and does not trust role headers', async () => {
    const missing = await fixture.controller.registerUser(post('/api/v4/users', validRegistration))
    expect(missing.status).toBe(422)
    const invalid = await register(validRegistration, 'not-a-uuid')
    expect(invalid.status).toBe(422)
    const response = await fixture.controller.registerUser(post('/api/v4/users', validRegistration, { 'Idempotency-Key': randomUUID(), 'X-Role': 'admin', 'X-User-Id': randomUUID() }))
    expect((await response.json()).role).toBe('user')
  })

  it('returns 409 for a canonical duplicate email', async () => {
    await register()
    const duplicate=await register({ ...validRegistration, email: 'READER@EXAMPLE.TEST' })
    expect(duplicate.status).toBe(409)
    expect((await duplicate.json()).error).toMatchObject({code:'EMAIL_ALREADY_REGISTERED',message:'Email đã được đăng ký.'})
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
  })

  it('keeps a single account when different keys concurrently register the same canonical email', async () => {
    const config = testConfig(replica.getUri(), databaseName)
    config.authMaxConcurrent = 8
    fixture = authenticationFixture(repository, config)
    const responses = await Promise.all(Array.from({ length: 6 }, () => register()))
    expect(responses.map(response => response.status).sort()).toEqual([201, 409, 409, 409, 409, 409])
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
    expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(1)
  })

  it('replays the same key/body without duplicates and refuses a changed payload', async () => {
    const key = randomUUID()
    const responses = await Promise.all(Array.from({ length: 4 }, () => register(validRegistration, key)))
    expect(responses.map(response => response.status)).toEqual([201, 201, 201, 201])
    const users = await Promise.all(responses.map(response => response.json()))
    expect(new Set(users.map(user => user.id)).size).toBe(1)
    expect((await register(validRegistration, key)).status).toBe(201)
    expect((await register({ ...validRegistration, displayName: 'Changed' }, key)).status).toBe(409)
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
    expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(1)
  })

  it('rolls back the User if the receipt write fails in the actual transaction', async () => {
    await db.command({ collMod: 'identity_registration_receipts', validator: { forcedTestFailure: { $exists: true } } })
    try {
      expect((await register()).status).toBe(503)
      expect(await db.collection('identity_users').countDocuments()).toBe(0)
      expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(0)
    } finally { await db.command({ collMod: 'identity_registration_receipts', validator: {} }) }
  })

  it('does not leave an orphan account when concurrent different payloads reuse a key', async () => {
    const key = randomUUID()
    const responses = await Promise.all([register(validRegistration, key), register({ ...validRegistration, email: 'other@example.test' }, key)])
    expect(responses.map(response => response.status).sort()).toEqual([201, 409])
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
    expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(1)
  })
})

describe('Password login, opaque sessions and abuse controls', () => {
  it('fails closed on a legacy HMAC receipt without migrating it or breaking login', async () => {
    const key=randomUUID()
    expect((await register(validRegistration,key)).status).toBe(201)
    await db.collection('identity_registration_receipts').updateOne({},{$set:{fingerprint:'legacy-fast-verifier'}})
    expect((await register(validRegistration,key)).status).toBe(503)
    expect((await login()).status).toBe(200)
    expect((await db.collection('identity_registration_receipts').findOne({}))?.fingerprint).toBe('legacy-fast-verifier')
  })
  it('returns the Session DTO and a secure cookie; only the token hash is persisted', async () => {
    await register()
    const response = await login()
    expect(response.status).toBe(200)
    const body = await response.json()
    const token = tokenOf(response)
    expect(Object.keys(body).sort()).toEqual(['user', 'csrfToken', 'expiresAt'].sort())
    expect(Object.keys(body.user).sort()).toEqual(['id', 'displayName', 'email', 'role', 'revision', 'updatedAt'].sort())
    const cookie = response.headers.get('set-cookie')!
    for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=3600']) expect(cookie.includes(attribute)).toBe(true)
    expect(cookie.includes('Domain=')).toBe(false)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(body.csrfToken === token).toBe(false)
    expect(JSON.stringify(body).includes(token)).toBe(false)
    const rows = await db.collection('identity_sessions').find().toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]?._id.toString() === fixture.crypto.hashSessionToken(token)).toBe(true)
    expect(JSON.stringify(rows).includes(token)).toBe(false)
    expect(await repository.findActiveByTokenHash(fixture.crypto.hashSessionToken(token), clock)).toMatchObject({ userId: body.user.id })
  })

  it('uses the same public error for an unknown email and a wrong password', async () => {
    await register()
    const wrong = await login({ email: validRegistration.email, password: 'wrong' })
    const unknown = await login({ email: 'missing@example.test', password: 'wrong' })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect((await wrong.json()).error).toEqual((await unknown.json()).error)
    expect(wrong.headers.get('set-cookie')).toBeNull()
    expect(unknown.headers.get('set-cookie')).toBeNull()
    expect(await db.collection('identity_sessions').countDocuments()).toBe(0)
  })

  it.each([{}, { email: 'invalid', password: 'x' }, { email: validRegistration.email }, { email: validRegistration.email, password: '' }, { email: validRegistration.email, password: 'a'.repeat(257) }, { email: validRegistration.email, password: 'x', role: 'admin' }])('rejects invalid login input (%#)', async input => {
    expect((await login(input)).status).toBe(422)
  })

  it('enforces a Mongo global budget across different emails and ignores spoofed IP headers', async () => {
    await register()
    const config = testConfig(replica.getUri(), databaseName)
    config.authMaxAttempts = 3
    fixture = authenticationFixture(repository, config, { now: () => clock })
    for (let index = 0; index < 3; index++) expect((await login({ email: `missing-${index}@example.test`, password: 'wrong' },{'X-Forwarded-For':`192.0.2.${index}`,'X-Real-IP':`192.0.2.${index}`})).status).toBe(401)
    const blocked = await login()
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(blocked.headers.get('set-cookie')).toBeNull()
    clock = new Date(clock.getTime() + config.authWindowSeconds * 1000)
    expect((await login()).status).toBe(200)
    const rows = await db.collection('identity_auth_limits').find().toArray()
    expect(JSON.stringify(rows).includes(validRegistration.email)).toBe(false)
  })
  it('shares trusted-source backoff across instances without locking the victim email for another source', async()=>{
    await register()
    const config=testConfig(replica.getUri(),databaseName)
    config.authMaxAttempts=20;config.authSourceMaxAttempts=2
    const one=authenticationFixture(repository,config,{now:()=>clock})
    const two=authenticationFixture(repository,config,{now:()=>clock})
    const wrong={email:validRegistration.email,password:'wrong'}
    await expect(one.service.login(wrong,{}, {source:'source-a'})).rejects.toMatchObject({status:401})
    await expect(two.service.login(wrong,{}, {source:'source-a'})).rejects.toMatchObject({status:401})
    await expect(one.service.login(wrong,{}, {source:'source-a'})).rejects.toMatchObject({status:429,retryAfterSeconds:expect.any(Number)})
    expect((await two.service.login(validRegistration,{}, {source:'source-b'})).session.user?.email).toBe(validRegistration.email)
  })
  it('commits one receipt/user under concurrent same-payload retries with independent salted verifiers',async()=>{
    const key=randomUUID()
    const results=await Promise.all(Array.from({length:4},()=>register(validRegistration,key)))
    expect(results.map(r=>r.status)).toEqual([201,201,201,201])
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
    expect(await db.collection('identity_registration_receipts').countDocuments()).toBe(1)
  })
  it('authorizes PATCH once and exposes a fail-closed module authorization facade',async()=>{
    const anonymous=new Request('https://paper.test/api/v4/users/me',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{'})
    expect((await fixture.controller.updateCurrentUser(anonymous)).status).toBe(401)
    expect(anonymous.bodyUsed).toBe(false)
    await register();const response=await login(),token=tokenOf(response),session=await response.json()
    const sessionReads=vi.spyOn(repository,'findActiveByTokenHash'),userReads=vi.spyOn(repository,'findById')
    const patched=await fixture.controller.updateCurrentUser(new Request('https://paper.test/api/v4/users/me',{method:'PATCH',headers:{Origin:'https://paper.test',Cookie:`__Host-pm_session=${token}`,'X-CSRF-Token':session.csrfToken,'Content-Type':'application/json','If-Match':'"1"','Idempotency-Key':randomUUID()},body:JSON.stringify({displayName:'Once'})}))
    expect(patched.status).toBe(200);expect(sessionReads).toHaveBeenCalledTimes(1);expect(userReads).toHaveBeenCalledTimes(1)
    expect((await fixture.authorization.requireAuthenticatedUser({sessionToken:token})).displayName).toBe('Once')
    await expect(fixture.authorization.requireRole({sessionToken:token},'admin')).rejects.toMatchObject({status:403})
  })
  it('records safe audit events and tolerates a failing sink',async()=>{
    const events:{kind:string;at:string}[]=[]
    fixture=authenticationFixture(repository,testConfig(replica.getUri(),databaseName),{audit:{write:event=>events.push(event)}})
    await register();await login({email:validRegistration.email,password:'wrong'})
    const response=await login(),token=tokenOf(response),session=await response.json()
    await fixture.controller.deleteCurrentSession(new Request('https://paper.test/api/v4/sessions/current',{method:'DELETE',headers:{Origin:'https://foreign.test'}}))
    await fixture.controller.deleteCurrentSession(new Request('https://paper.test/api/v4/sessions/current',{method:'DELETE',headers:{Origin:'https://paper.test',Cookie:`__Host-pm_session=${token}`,'X-CSRF-Token':session.csrfToken}}))
    expect(events.map(e=>e.kind)).toEqual(expect.arrayContaining(['register_success','login_failure','login_success','csrf_rejected','session_revoked']))
    expect(events.every(event=>Object.keys(event).sort().join(',')==='at,kind')).toBe(true)
    expect(JSON.stringify(events)).not.toContain(token);expect(JSON.stringify(events)).not.toContain(validRegistration.password)
    fixture=authenticationFixture(repository,testConfig(replica.getUri(),databaseName),{audit:{write:()=>{throw new Error('sink down')}}})
    expect((await login()).status).toBe(200)
  })

  it('atomically admits only the configured budget under concurrent limiter requests', async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => repository.consume('test-counter', clock, 60, 3)))
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(3)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(9)
  })

  it('bounds simultaneous password work and releases capacity after an error', async () => {
    await register()
    const config = testConfig(replica.getUri(), databaseName)
    config.authMaxConcurrent = 1
    let release!: () => void
    const waiting = new Promise<void>(resolve => { release = resolve })
    const hasher = new Argon2PasswordHasher()
    fixture = authenticationFixture(repository, config, { hasher: {
      hash: value => hasher.hash(value), dummyHash: () => hasher.dummyHash(),
      verify: async () => { await waiting; return false },
    } })
    const pending = login()
    expect((await login()).status).toBe(429)
    release()
    expect((await pending).status).toBe(401)
    expect((await login()).status).toBe(401)
  })

  it('requires a session-bound CSRF header for active cookies and rotates the old session atomically', async () => {
    await register()
    const first = await login()
    const oldToken = tokenOf(first)
    const firstBody = await first.json()
    const headers = { Cookie: `__Host-pm_session=${oldToken}` }
    expect((await login(undefined, headers)).status).toBe(403)
    expect((await login(undefined, { ...headers, 'X-CSRF-Token': randomBytes(32).toString('base64url') })).status).toBe(403)
    const second = await login(undefined, { ...headers, 'X-CSRF-Token': firstBody.csrfToken })
    expect(second.status).toBe(200)
    expect(tokenOf(second) === oldToken).toBe(false)
    expect(await repository.findActiveByTokenHash(fixture.crypto.hashSessionToken(oldToken), clock)).toBeNull()
  })

  it('treats an expired cookie as pre-auth with mandatory Origin, never as an authenticated subject', async () => {
    await register()
    const first = await login()
    const token = tokenOf(first)
    clock = new Date(clock.getTime() + 3_600_001)
    expect(await repository.findActiveByTokenHash(fixture.crypto.hashSessionToken(token), clock)).toBeNull()
    expect((await login(undefined, { Cookie: `__Host-pm_session=${token}` })).status).toBe(200)
  })

  it('does not issue a cookie when session persistence fails', async () => {
    await register()
    const broken: SessionRepository = { revoke: repository.revoke.bind(repository), findActiveByTokenHash: repository.findActiveByTokenHash.bind(repository), create: async () => { throw new IdentityUnavailableError() } }
    fixture = authenticationFixture(repository, testConfig(replica.getUri(), databaseName), { sessions: broken })
    const response = await login()
    expect(response.status).toBe(503)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await db.collection('identity_sessions').countDocuments()).toBe(0)
  })

  it('sanitizes a real Mongo connection failure without using the existing application database', async () => {
    const unavailable = new MongoIdentityRepository('mongodb://127.0.0.1:1', databaseName)
    try {
      fixture = authenticationFixture(unavailable, testConfig('mongodb://127.0.0.1:1', databaseName))
      const response = await login()
      expect(response.status).toBe(503)
      const body = JSON.stringify(await response.json())
      expect(body.includes('mongodb://')).toBe(false)
      expect(body.includes('stack')).toBe(false)
      expect(response.headers.get('set-cookie')).toBeNull()
    } finally { await unavailable.close() }
  })

  it('never writes credential/session values to console', async () => {
    const log = vi.spyOn(console, 'log'), warn = vi.spyOn(console, 'warn'), error = vi.spyOn(console, 'error')
    await register()
    await login()
    await login({ email: validRegistration.email, password: 'wrong' })
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('sanitizes unexpected password-verifier failures without issuing a cookie', async () => {
    await register()
    await db.collection('identity_users').updateOne({ email: validRegistration.email }, { $set: { passwordHash: 'invalid-encoded-test-hash' } })
    const response = await login()
    expect(response.status).toBe(500)
    const body = JSON.stringify(await response.json())
    expect(body.includes('invalid-encoded-test-hash')).toBe(false)
    expect(body.includes('stack')).toBe(false)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('resolves current profile, updates with CAS/idempotency, checks fresh roles and revokes logout', async () => {
    await register()
    const response = await login(), token = tokenOf(response), session = await response.json()
    const headers = { Cookie: `__Host-pm_session=${token}` }
    const req = (method: string, body?: unknown, extra: Record<string,string> = {}) => new Request('https://paper.test/api/v4/users/me?userId=forged', { method, headers: { ...headers, Origin: 'https://paper.test', 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken, ...extra }, ...(body === undefined ? {} : {body: JSON.stringify(body)}) })
    expect((await fixture.controller.getCurrentUser(req('GET'))).status).toBe(200)
    const current = await fixture.controller.getCurrentSession(req('GET'))
    expect(current.headers.get('cache-control')).toBe('private, no-store')
    expect((await current.json()).user.id).toBe(session.user.id)
    const patch = { displayName: 'Updated' }, key = randomUUID()
    const conditions = { 'If-Match': '"1"', 'Idempotency-Key': key }
    const updated = await fixture.controller.updateCurrentUser(req('PATCH', patch, conditions))
    expect(updated.status).toBe(200)
    expect(updated.headers.get('etag')).toBe('"2"')
    expect((await updated.json()).displayName).toBe('Updated')
    expect((await fixture.controller.updateCurrentUser(req('PATCH', patch, conditions))).status).toBe(200)
    expect((await fixture.controller.updateCurrentUser(req('PATCH', patch, { ...conditions, 'Idempotency-Key': randomUUID() }))).status).toBe(412)
    expect((await fixture.controller.updateCurrentUser(req('PATCH', { role: 'admin' }, conditions))).status).toBe(422)
    expect((await fixture.controller.updateCurrentUser(req('PATCH', patch))).status).toBe(428)
    await expect(fixture.service.requireRole({sessionToken:token}, 'admin')).rejects.toMatchObject({status:403})
    await db.collection('identity_users').updateOne({email:validRegistration.email}, {$set:{role:'admin'}})
    expect((await fixture.service.requireRole({sessionToken:token}, 'admin')).role).toBe('admin')
    await db.collection('identity_users').updateOne({email:validRegistration.email}, {$set:{role:'user'}})
    await expect(fixture.service.requireRole({sessionToken:token}, 'admin')).rejects.toMatchObject({status:403})
    expect((await fixture.controller.deleteCurrentSession(req('DELETE'))).status).toBe(204)
    const repeated = await fixture.controller.deleteCurrentSession(req('DELETE'))
    expect(repeated.status).toBe(204)
    expect(repeated.headers.get('set-cookie')).toContain('Max-Age=0')
    expect((await fixture.controller.getCurrentUser(req('GET'))).status).toBe(401)
    expect((await (await fixture.controller.getCurrentSession(req('GET'))).json()).user).toBeNull()
    expect(await db.collection('identity_users').countDocuments()).toBe(1)
  })

  it('does not clear the cookie or claim logout when revocation fails', async () => {
    const config = testConfig(replica.getUri(),databaseName)
    fixture = authenticationFixture(repository,config)
    await register()
    const response = await login(), token = tokenOf(response), session = await response.json()
    const broken: SessionRepository = { create: repository.create.bind(repository), findActiveByTokenHash:repository.findActiveByTokenHash.bind(repository), revoke:async()=>{throw new IdentityUnavailableError()} }
    fixture = authenticationFixture(repository,config,{sessions:broken})
    const result = await fixture.controller.deleteCurrentSession(new Request('https://paper.test/api/v4/sessions/current',{method:'DELETE',headers:{Origin:'https://paper.test',Cookie:`__Host-pm_session=${token}`,'X-CSRF-Token':session.csrfToken}}))
    expect(result.status).toBe(503)
    expect(result.headers.get('set-cookie')).toBeNull()
  })

  it('rejects missing/deleted/expired/tampered principals and protects mutation CSRF', async () => {
    expect((await fixture.controller.getCurrentUser(new Request('https://paper.test/api/v4/users/me'))).status).toBe(401)
    await register()
    const response = await login(), token = tokenOf(response)
    const req = (cookie: string, method = 'GET') => new Request('https://paper.test/api/v4/users/me', {method, headers:{Cookie:`__Host-pm_session=${cookie}`,Origin:'https://paper.test','Content-Type':'application/json'}, ...(method === 'PATCH'?{body:JSON.stringify({displayName:'New'})}:{})})
    expect((await fixture.controller.updateCurrentUser(req(token, 'PATCH'))).status).toBe(403)
    expect((await fixture.controller.deleteCurrentSession(req(token, 'DELETE'))).status).toBe(403)
    expect((await fixture.controller.getCurrentUser(req(randomBytes(32).toString('base64url')))).status).toBe(401)
    clock = new Date(clock.getTime()+3600001)
    expect((await fixture.controller.getCurrentUser(req(token))).status).toBe(401)
    expect((await (await fixture.controller.getCurrentSession(req(token))).json()).expiresAt).toBeNull()
    clock = new Date()
    await db.collection('identity_users').deleteMany({})
    expect((await fixture.controller.getCurrentUser(req(token))).status).toBe(401)
    expect((await (await fixture.controller.getCurrentSession(req(token))).json()).user).toBeNull()
  })
})

describe('HTTP boundary before any account mutation', () => {
  it.each(['https://foreign.test', 'https://paper.test.attacker.test', 'null', ''])('rejects an unapproved or missing Origin (%#)', async origin => {
    const request = post('/api/v4/users', validRegistration, { Origin: origin, 'Idempotency-Key': randomUUID(), 'X-Forwarded-Host': 'paper.test', Referer: 'https://paper.test/' })
    expect((await fixture.controller.registerUser(request)).status).toBe(403)
    expect(request.bodyUsed).toBe(false)
    expect(await db.collection('identity_users').countDocuments()).toBe(0)
  })

  it('rejects malformed JSON, wrong media, oversized bodies and duplicate session cookies', async () => {
    const request = (body: string, headers: Record<string, string> = {}) => new Request('https://paper.test/api/v4/users', { method: 'POST', headers: { Origin: 'https://paper.test', 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(), ...headers }, body })
    expect((await fixture.controller.registerUser(request('{'))).status).toBe(400)
    expect((await fixture.controller.registerUser(request('{}', { 'Content-Type': 'text/plain' }))).status).toBe(415)
    expect((await fixture.controller.registerUser(request(' '.repeat(65_537), { 'Content-Length': '1' }))).status).toBe(413)
    const token = randomBytes(32).toString('base64url')
    expect((await fixture.controller.registerUser(request('{}', { Cookie: `__Host-pm_session=${token}; __Host-pm_session=${token}` }))).status).toBe(403)
    expect(await db.collection('identity_users').countDocuments()).toBe(0)
  })

  it('refuses standalone Mongo instead of claiming atomic receipt guarantees', async () => {
    const standalone = await MongoMemoryServer.create({ binary, instance: { ip: '127.0.0.1' } })
    const unconfigured = new MongoIdentityRepository(standalone.getUri(), databaseName)
    try {
      const controller = authenticationFixture(unconfigured, testConfig(standalone.getUri(), databaseName)).controller
      expect((await controller.registerUser(post('/api/v4/users', validRegistration, { 'Idempotency-Key': randomUUID() }))).status).toBe(503)
    } finally { await unconfigured.close(); await standalone.stop() }
  })
})
