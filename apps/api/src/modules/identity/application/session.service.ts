import type { User } from '../domain/user.entity'
import { publicUser } from '../domain/role.policy'
import { csrfRejected, IdentityError } from '../domain/identity.error'
import type { UserRepository } from '../ports/user.repository'
import type { SessionRepository } from '../ports/session.repository'
import type { IdentitySecrets, MutationProof } from '../ports/authentication'
import type { SessionView } from './identity.models'
import { emitAudit, type IdentityAuditSink } from '../ports/audit'

export interface LoginResult { session: SessionView; cookieToken: string; expiresAt: Date }

/** Session orchestration only. No HTTP, cookie serialization, profile or logout endpoint. */
export class SessionService {
  async current(proof: MutationProof, users: UserRepository): Promise<SessionView> {
    const record = proof.sessionToken ? await this.repository.findActiveByTokenHash(this.crypto.hashSessionToken(proof.sessionToken), this.now()) : null
    const user = record ? await users.findById(record.userId) : null
    return { user: user ? publicUser(user) : null, expiresAt: user && record ? record.expiresAt : null,
      csrfToken: this.crypto.csrfToken(proof.sessionToken ?? this.crypto.newSessionToken()) }
  }
  async requireAuthenticatedUser(proof: MutationProof, users: UserRepository, mutation = false) {
    const session = await this.current(proof, users)
    if (!session.user) throw new IdentityError(401, 'AUTHENTICATION_REQUIRED', 'Cần đăng nhập.')
    if (mutation && (!proof.sessionToken || !this.crypto.validCsrf(proof.sessionToken, proof.csrfToken))) throw csrfRejected()
    return session.user
  }
  async logout(proof: MutationProof) {
    await this.assertMutationProof(proof)
    if (proof.sessionToken && await this.repository.revoke(this.crypto.hashSessionToken(proof.sessionToken), this.now())) emitAudit(this.audit,'session_revoked',this.now)
  }
  constructor(
    private readonly repository: SessionRepository,
    private readonly crypto: IdentitySecrets,
    private readonly config: { readonly sessionTtlSeconds: number },
    private readonly now: () => Date,
    private readonly audit?: IdentityAuditSink,
  ) {}
  async assertMutationProof(proof: MutationProof) {
    if (!proof.sessionToken) return // Pre-auth uses mandatory Origin + JSON at the controller.
    const session = await this.repository.findActiveByTokenHash(this.crypto.hashSessionToken(proof.sessionToken), this.now())
    // An expired/revoked cookie is pre-auth, never an identity. Origin/JSON still apply.
    if (session && !this.crypto.validCsrf(proof.sessionToken, proof.csrfToken)) throw csrfRejected()
  }
  async create(user: User, previousToken?: string): Promise<LoginResult> {
    const token = this.crypto.newSessionToken()
    const now = this.now()
    const expiresAt = new Date(now.getTime() + this.config.sessionTtlSeconds * 1000)
    await this.repository.create({ tokenHash: this.crypto.hashSessionToken(token), userId: user.id, createdAt: now, expiresAt }, previousToken ? this.crypto.hashSessionToken(previousToken) : undefined)
    return { cookieToken: token, expiresAt, session: { user: publicUser(user), csrfToken: this.crypto.csrfToken(token), expiresAt: expiresAt.toISOString() } }
  }
}
