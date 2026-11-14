import { AuthClientError, type AuthClient } from '../types/auth.types'

/** Explicit development-only switch to exercise unavailable authentication. */
const disabledClient: AuthClient = {
  mode: 'disabled',
  async getSession() { return null },
  async login() { throw new AuthClientError('UNAVAILABLE', 'Đăng nhập hiện chưa khả dụng. Vui lòng thử lại sau.') },
  async register() { throw new AuthClientError('UNAVAILABLE', 'Đăng ký hiện chưa khả dụng. Vui lòng thử lại sau.') },
  async logout() {},
}

export const mockAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'mock'
let client: Promise<AuthClient> | undefined
export function getAuthClient(): Promise<AuthClient> {
  client ??= mockAuthEnabled
    ? import('./mock-auth-client').then(({ createMockAuthClient }) => createMockAuthClient())
    : import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'disabled'
      ? Promise.resolve(disabledClient)
      : import('./real-auth-client').then(({ createRealAuthClient }) => createRealAuthClient())
  return client
}
