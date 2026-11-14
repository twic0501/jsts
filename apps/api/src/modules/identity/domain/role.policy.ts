import type { User } from './user.entity'
import { IdentityError } from './identity.error'

export function isAdmin(user: User) { return user.role === 'admin' }
export function requireRole(user: User, role: User['role']) {
  if (user.role !== 'admin' && user.role !== role) throw new IdentityError(403, 'FORBIDDEN', 'Không có quyền thực hiện thao tác.')
  return user
}

/** Registration never accepts a client role, including a syntactically valid 'admin'. */
export function registrationRole(): User['role'] { return 'user' }
export function canonicalEmail(email: string) { return email.trim().toLowerCase() }

/** Explicit allowlist: persistence/credential fields cannot enter a wire User. */
export function publicUser(user: User): User {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, revision: user.revision, updatedAt: user.updatedAt }
}
