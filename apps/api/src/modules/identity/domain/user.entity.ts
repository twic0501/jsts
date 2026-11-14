/** Public domain read model from the 2026-11-13 User schema; not a Mongo document. */
export const userRoles = ['user', 'admin'] as const
export type UserRole = typeof userRoles[number]

export interface User {
  /** UUID. Never a client-asserted identity or a Mongo _id leaked into the DTO. */
  readonly id: string
  readonly displayName: string
  readonly email: string
  readonly role: UserRole
  readonly revision: number
  /** ISO date-time; adapters must map any persistence Date explicitly. */
  readonly updatedAt: string
}
