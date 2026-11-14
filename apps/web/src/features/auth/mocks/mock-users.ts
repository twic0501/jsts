import { AuthClientError, type AuthCredentials, type AuthRegistration, type AuthUser } from '../types/auth.types'

/** Fictional dev-only account. This module is dynamically loaded only in opted-in development. */
export function createMockUserStore() {
  const users = new Map<string, { user: AuthUser; password: string }>([
    ['demo@papermagic.local', {
      user: { id: 'mock-demo', email: 'demo@papermagic.local', displayName: 'Paper Magic Demo', role: 'user' },
      password: 'Demo@123456',
    }],
  ])
  const normalize = (email: string) => email.trim().toLowerCase()
  return {
    authenticate({ email, password }: AuthCredentials): AuthUser {
      const record = users.get(normalize(email))
      if (!record || record.password !== password)
        throw new AuthClientError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác')
      return { ...record.user }
    },
    register({ email, password, confirmPassword }: AuthRegistration): AuthUser {
      const normalized = normalize(email)
      if (!/^[^\s@]+@[^\s@]+$/.test(normalized) || !password || password !== confirmPassword)
        throw new AuthClientError('INVALID_INPUT', 'Kiểm tra email và mật khẩu xác nhận.')
      if (users.has(normalized)) throw new AuthClientError('EMAIL_EXISTS', 'Email này đã có trong phiên demo.')
      const user: AuthUser = { id: `mock-${crypto.randomUUID()}`, email: normalized, displayName: normalized.split('@')[0] || 'Người dùng Demo', role: 'user' }
      users.set(normalized, { user, password })
      return { ...user }
    },
  }
}
