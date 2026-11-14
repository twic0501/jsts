import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockBookmarkClient } from '../apps/web/src/features/auth/services/mock-bookmark-client'
import type { AuthSession } from '../apps/web/src/features/auth/types/auth.types'
import type { BookmarkClient } from '../apps/web/src/features/auth/types/bookmark.types'

const account = (id: string): AuthSession => ({ source: 'mock', user: { id, email: `${id}@papermagic.local`, displayName: id, role: 'user' } })
const a = account('mock-a'), b = account('mock-b')
async function request<T>(operation: Promise<T>) {
  const result = operation.then(value => ({ value }), error => ({ error }))
  await vi.runAllTimersAsync()
  return result
}

describe('Account-scoped memory bookmarks', () => {
  let client: BookmarkClient
  beforeEach(() => { vi.useFakeTimers(); client = createMockBookmarkClient() })
  afterEach(() => { vi.useRealTimers() })

  it('keeps account lists separate and does not inherit any legacy data', async () => {
    expect(await request(client.list(a))).toEqual({ value: [] })
    await request(client.save(a, '2103.00020'))
    expect(await request(client.list(a))).toEqual({ value: ['2103.00020'] })
    expect(await request(client.list(b))).toEqual({ value: [] })
    await request(client.save(b, 'oa:W123'))
    expect(await request(client.list(a))).toEqual({ value: ['2103.00020'] })
    expect(await request(client.list(b))).toEqual({ value: ['oa:W123'] })
  })

  it('makes save and remove idempotent, including concurrent duplicate saves', async () => {
    await request(Promise.all(Array.from({ length: 6 }, () => client.save(a, '2103.00020'))))
    expect(await request(client.list(a))).toEqual({ value: ['2103.00020'] })
    await request(client.remove(a, '2103.00020'))
    await request(client.remove(a, '2103.00020'))
    expect(await request(client.list(a))).toEqual({ value: [] })
  })

  it('retains the same user data across new sessions, with snapshots that cannot mutate storage', async () => {
    await request(client.save(a, 'oa:W123'))
    const result = await request(client.list(a))
    if ('value' in result) result.value.push('tampered')
    expect(await request(client.list(account('mock-a')))).toEqual({ value: ['oa:W123'] })
    expect(await request(createMockBookmarkClient().list(a))).toEqual({ value: [] })
  })

  it.each(['save', 'remove'] as const)('aborting %s prevents mutation', async action => {
    if (action === 'remove') await request(client.save(a, '2103.00020'))
    const abort = new AbortController()
    const pending = request(client[action](a, '2103.00020', abort.signal))
    abort.abort()
    expect(await pending).toMatchObject({ error: { name: 'AbortError' } })
    expect(await request(client.list(a))).toEqual({ value: action === 'save' ? [] : ['2103.00020'] })
  })

  it('rejects backend sessions rather than treating them as demo sessions', async () => {
    expect(await request(client.save({ ...a, source: 'backend' }, '2103.00020'))).toMatchObject({ error: { name: 'BookmarkClientError' } })
    expect(await request(client.list(a))).toEqual({ value: [] })
  })
})

describe('Bookmark configuration fails closed', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
  it.each([
    { name: 'production', dev: false, mode: 'mock' },
    { name: 'development without opt-in', dev: true, mode: 'disabled' },
  ])('disables account bookmark operations in $name', async ({ dev, mode }) => {
    vi.stubEnv('DEV', dev)
    vi.stubEnv('VITE_AUTH_MODE', mode)
    vi.resetModules()
    const { getBookmarkClient } = await import('../apps/web/src/features/auth/services/bookmark-client')
    const disabled = await getBookmarkClient()
    expect(disabled.mode).toBe(dev?'disabled':'backend')
    await expect(disabled.list(a)).rejects.toMatchObject({ name: 'BookmarkClientError' })
    await expect(disabled.save(a, '2103.00020')).rejects.toMatchObject({ name: 'BookmarkClientError' })
    await expect(disabled.remove(a, '2103.00020')).rejects.toMatchObject({ name: 'BookmarkClientError' })
  })
})
