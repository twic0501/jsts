import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAuthClient } from '../apps/web/src/features/auth/services/mock-auth-client'
import type { AuthClient } from '../apps/web/src/features/auth/types/auth.types'

const demo = { email: 'demo@papermagic.local', password: 'Demo@123456' }
// Attach rejection handlers before advancing timers so rejected requests remain handled.
async function request<T>(operation: Promise<T>) {
  const result = operation.then(value => ({ value }), error => ({ error }))
  await vi.runAllTimersAsync()
  return result
}

describe('Memory-only development authentication', () => {
  let client: AuthClient
  beforeEach(() => { vi.useFakeTimers(); client = createMockAuthClient() })
  afterEach(() => { vi.useRealTimers() })

  it('starts as guest, delays login, returns a marked session without credentials', async () => {
    expect(await request(client.getSession())).toEqual({ value: null })
    let resolved = false
    const pending = client.login(demo).then(session => { resolved = true; return session })
    await vi.advanceTimersByTimeAsync(400)
    expect(resolved).toBe(false)
    const { value: session } = await request(pending) as { value: Awaited<typeof pending> }
    expect(session).toEqual({ source: 'mock', user: { id: 'mock-demo', email: demo.email, displayName: 'Paper Magic Demo', role: 'user' } })
    expect(JSON.stringify(session)).not.toContain(demo.password)
    session.user.displayName = 'Tampered'
    expect(await request(client.getSession())).toMatchObject({ value: { user: { displayName: 'Paper Magic Demo' } } })
  })

  it('rejects incorrect credentials and remains guest', async () => {
    expect(await request(client.login({ ...demo, password: 'wrong' }))).toMatchObject({ error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không chính xác' } })
    expect(await request(client.getSession())).toEqual({ value: null })
  })

  it('registers for this instance only, logs out, and can sign in again without a password length policy', async () => {
    const values = { email: 'Reader@example.com', password: 'x', confirmPassword: 'x' }
    expect(await request(client.register(values))).toMatchObject({ value: { source: 'mock', user: { email: 'reader@example.com', role: 'user' } } })
    await request(client.logout())
    expect(await request(client.getSession())).toEqual({ value: null })
    expect(await request(client.login(values))).toMatchObject({ value: { source: 'mock' } })
    expect(await request(createMockAuthClient().login(values))).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } })
  })

  it('rejects duplicate emails and invalid registration without creating users', async () => {
    expect(await request(client.register({ ...demo, confirmPassword: demo.password }))).toMatchObject({ error: { code: 'EMAIL_EXISTS' } })
    for (const values of [
      { email: 'invalid', password: 'x', confirmPassword: 'x' },
      { email: 'new@example.com', password: 'x', confirmPassword: 'y' },
      { email: 'new@example.com', password: '', confirmPassword: '' },
    ]) expect(await request(client.register(values))).toMatchObject({ error: { code: 'INVALID_INPUT' } })
    expect(await request(client.login({ email: 'new@example.com', password: 'x' }))).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } })
    expect(await request(client.getSession())).toEqual({ value: null })
  })

  it('cancels login or registration before any session or user is created', async () => {
    for (const operation of ['login', 'register'] as const) {
      const abort = new AbortController()
      const pending = request(operation === 'login' ? client.login(demo, abort.signal) : client.register({ email: 'cancel@example.com', password: 'x', confirmPassword: 'x' }, abort.signal))
      abort.abort()
      expect(await pending).toMatchObject({ error: { name: 'AbortError' } })
      expect(await request(client.getSession())).toEqual({ value: null })
    }
    expect(await request(client.login({ email: 'cancel@example.com', password: 'x' }))).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } })
  })
})

describe('Authentication configuration', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it.each([
    { name: 'production even with mock configured', dev: false, mode: 'mock' },
    { name: 'development without mock opt-in', dev: true, mode: 'disabled' },
  ])('cannot authenticate in $name', async ({ dev, mode }) => {
    vi.stubEnv('DEV', dev)
    vi.stubEnv('VITE_AUTH_MODE', mode)
    vi.resetModules()
    const { getAuthClient, mockAuthEnabled } = await import('../apps/web/src/features/auth/services/auth-client')
    const disabled = await getAuthClient()
    expect(mockAuthEnabled).toBe(false)
    if (!dev) { expect(disabled.mode).toBe('backend'); return }
    expect(disabled.mode).toBe('disabled')
    expect(await disabled.getSession()).toBeNull()
    await expect(disabled.login(demo)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    await expect(disabled.register({ ...demo, confirmPassword: demo.password })).rejects.toMatchObject({ code: 'UNAVAILABLE' })
  })
})
