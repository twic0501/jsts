/** Shared UI model; the real adapter validates and maps the FR12 wire DTO. */
export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: 'user' | 'admin'
}
export interface AuthSession {
  expiresAt?: string
  source: 'mock' | 'backend'
  user: AuthUser
}
export interface AuthCredentials { email: string; password: string }
export interface AuthRegistration extends AuthCredentials { confirmPassword: string; displayName?: string }
export interface AuthClient {
  mode: 'mock' | 'disabled' | 'backend'
  getSession: (signal?: AbortSignal) => Promise<AuthSession | null>
  login: (values: AuthCredentials, signal?: AbortSignal) => Promise<AuthSession>
  register: (values: AuthRegistration, signal?: AbortSignal) => Promise<AuthSession | null>
  getProfile?: (signal?: AbortSignal) => Promise<AuthUser>
  /** CSRF proof after a fresh Backend session matches the expected account. Never a session token. */
  getMutationHeaders?: (expectedUserId: string, signal?: AbortSignal) => Promise<Record<string,string>>
  updateProfile?: (displayName: string, signal?: AbortSignal) => Promise<AuthUser>
  logout: (signal?: AbortSignal) => Promise<void>
}
export type AuthState =
  | { status: 'loading' | 'guest' | 'error'; session: null }
  | { status: 'authenticated'; session: AuthSession }
export type AuthActionResult = { ok: true } | { ok: false; code: AuthClientError['code'] | 'BUSY' | 'CANCELLED'; retryAfterSeconds?: number }
export class AuthClientError extends Error {
  constructor(public readonly code: 'INVALID_CREDENTIALS' | 'EMAIL_EXISTS' | 'INVALID_INPUT' | 'UNAVAILABLE' | 'SESSION_EXPIRED' | 'CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'FORBIDDEN' | 'RATE_LIMITED', message: string, public readonly retryAfterSeconds?: number) {
    super(message)
    this.name = 'AuthClientError'
  }
}
