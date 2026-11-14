import type { User } from '../domain/user.entity'

export interface RegisterInput { email: string; password: string; displayName: string }
export interface LoginInput { email: string; password: string }
export interface SessionView { user: User | null; csrfToken: string; expiresAt: string | null }
/** Boundary supplies validated data only after the principal has been checked. */
export interface ProfileChange { displayName: string; revision: number; key: string }
/** Only supplied by a trusted server-side ingress adapter, never client IP headers. */
export interface AuthenticationContext { source?: string }
