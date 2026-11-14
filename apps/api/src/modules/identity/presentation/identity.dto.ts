import type { User } from '../domain/user.entity'

/** Types mirror the delivered OpenAPI, not frontend mock values or DB documents.
 * Registration/login runtime validation lives in identity.validation.ts.
 */
export type { RegisterInput, LoginInput } from '../application/identity.models'
/** Exactly this field; the schema has minProperties: 1 and forbids extra fields. */
export interface ProfilePatch { displayName: string }
export type UserDto = User

export interface SessionDto {
  user: UserDto | null
  /** 20..512 characters. Required even for the anonymous/pre-auth representation. */
  csrfToken: string
  expiresAt: string | null
}

export interface IdentityErrorDto {
  error: {
    code: string
    message: string
    details?: { path: string; reason: string }[]
  }
  requestId: string
}
