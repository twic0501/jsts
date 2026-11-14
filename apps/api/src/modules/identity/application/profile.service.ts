import type { UserRepository } from '../ports/user.repository'
import type { IdentitySecrets } from '../ports/authentication'
import type { User } from '../domain/user.entity'

/** Principal is resolved by SessionService before this service is invoked. */
export class ProfileService {
  constructor(private readonly users: UserRepository, private readonly crypto: IdentitySecrets, private readonly ttl: number, private readonly now: () => Date) {}
  update(user: User, displayName: string, revision: number, key: string) {
    const at = this.now()
    return this.users.updateProfile(user.id, displayName, revision, {
      keyHash: this.crypto.fingerprint('PATCH /api/v4/users/me', JSON.stringify([user.id, key])),
      fingerprint: this.crypto.fingerprint('profile-payload', JSON.stringify([user.id, displayName, revision])),
      user, expiresAt: new Date(at.getTime() + this.ttl * 1000),
    }, at)
  }
}
