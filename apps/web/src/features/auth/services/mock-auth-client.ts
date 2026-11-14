import { createMockUserStore } from '../mocks/mock-users'
import type { AuthClient, AuthSession } from '../types/auth.types'

function delay(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, 450)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Memory-only simulation. No cookies, tokens, storage, fetch, or backend permissions. */
export function createMockAuthClient(): AuthClient {
  const users = createMockUserStore()
  let session: AuthSession | null = null
  const snapshot = () => session ? { source: session.source, user: { ...session.user } } : null
  return {
    mode: 'mock',
    async getSession(signal) { await delay(signal); return snapshot() },
    async login(values, signal) {
      await delay(signal)
      session = { source: 'mock', user: users.authenticate(values) }
      return snapshot()!
    },
    async register(values, signal) {
      await delay(signal)
      session = { source: 'mock', user: users.register(values) }
      return snapshot()!
    },
    async logout(signal) { await delay(signal); session = null },
  }
}
