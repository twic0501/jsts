import type { User } from '../domain/user.entity'

export interface PasswordHasher {
  hash: (password: string) => Promise<string>
  verify: (hash: string, password: string) => Promise<boolean>
  dummyHash: () => Promise<string>
}
export interface AttemptLimiter {
  consume: (key: string, now: Date, windowSeconds: number, maxAttempts: number) => Promise<void>
}
export interface StoredCredential { user: User; passwordHash: string }
export interface NewAccount { user: User; passwordHash: string }
export interface RegistrationReceipt {
  keyHash: string
  fingerprint: string
  user: User
  expiresAt: Date
}
/** Raw cookie material stays in memory and never crosses a repository port. */
export interface SessionWrite {
  tokenHash: string
  userId: string
  createdAt: Date
  expiresAt: Date
}
export interface MutationProof { sessionToken?: string; csrfToken?: string }
export interface IdentitySecrets {
  fingerprint: (purpose: string, value: string) => string
  newSessionToken: () => string
  hashSessionToken: (token: string) => string
  csrfToken: (token: string) => string
  validCsrf: (token: string, submitted: string | undefined) => boolean
}
