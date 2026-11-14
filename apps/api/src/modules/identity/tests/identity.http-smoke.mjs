import assert from 'node:assert/strict'

// Run after starting the built Next.js app. No database or auth credentials required.
const origin = process.env.FR12_TEST_ORIGIN || 'http://127.0.0.1:3003'
const endpoints = [
  ['POST', '/api/v4/users'],
  ['POST', '/api/v4/sessions'],
  ['GET', '/api/v4/sessions/current'],
  ['DELETE', '/api/v4/sessions/current'],
  ['GET', '/api/v4/users/me'],
  ['PATCH', '/api/v4/users/me'],
]
const ids = new Set()
for (const [method, path] of endpoints) {
  const response = await fetch(new URL(path, origin), {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.invalid', Cookie: '__Host-pm_session=untrusted-sentinel' },
    ...(method === 'GET' ? {} : { body: JSON.stringify({ role: 'admin', userId: 'forged', password: 'input-sentinel' }) }),
  })
  assert.equal(response.status, 503, `${method} ${path}`)
  const body = await response.json()
  assert.deepEqual(body.error, { code: 'IDENTITY_UNAVAILABLE', message: 'Chức năng tài khoản FR12 chưa sẵn sàng.' })
  assert.match(body.requestId, /^[0-9a-f-]{36}$/i)
  assert.equal(ids.has(body.requestId), false)
  ids.add(body.requestId)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.match(response.headers.get('cache-control'), /private/)
  assert.equal(response.headers.get('x-request-id'), body.requestId)
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  console.log(`PASS ${method} ${path}: 503, private/no-store, request ID, no cookie`)
}
for (const [method, path] of [
  ['GET', '/api/v4/users'],
  ['GET', '/api/v4/sessions'],
  ['POST', '/api/v4/users/me'],
  ['POST', '/api/v4/sessions/current'],
]) {
  const response = await fetch(new URL(path, origin), { method })
  assert.equal(response.status, 405, `${method} ${path}`)
  console.log(`PASS ${method} ${path}: 405`)
}
