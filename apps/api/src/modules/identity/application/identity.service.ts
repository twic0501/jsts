import { randomUUID } from 'node:crypto'
import type { IdentityConfig, IdentityHttpPolicy } from '../identity.config'
import type { User } from '../domain/user.entity'
import { canonicalEmail, publicUser, registrationRole } from '../domain/role.policy'
import { duplicateEmail, IdentityError, IdentityUnavailableError, invalidCredentials, receiptConflict, tooManyAttempts } from '../domain/identity.error'
import type { UserRepository } from '../ports/user.repository'
import type { AttemptLimiter, IdentitySecrets, MutationProof, PasswordHasher, RegistrationReceipt } from '../ports/authentication'
import type { LoginInput, RegisterInput, SessionView, ProfileChange } from './identity.models'
import { SessionService, type LoginResult } from './session.service'
import { ProfileService } from './profile.service'
import { requireRole } from '../domain/role.policy'
import { emitAudit, type IdentityAuditSink } from '../ports/audit'
import type { AuthenticationContext } from './identity.models'
export { IdentityUnavailableError } from '../domain/identity.error'

/** Operation names retained for the compatibility unavailable boundary. */
export const identityOperations = [
  'registerUser',
  'createSession',
  'getCurrentSession',
  'deleteCurrentSession',
  'getCurrentUser',
  'updateCurrentUser',
] as const

export type IdentityOperation = typeof identityOperations[number]

/** Readiness boundary only; typed wire DTOs now exist in presentation/identity.dto.ts. */
export interface IdentityApplication {
  execute: (operation: IdentityOperation) => Promise<never>
}

export interface AuthenticationApplication {
  current: (proof: MutationProof) => Promise<SessionView>
  requireAuthenticatedUser: (proof: MutationProof, mutation?: boolean) => Promise<User>
  requireRole: (proof: MutationProof, role: User['role']) => Promise<User>
  logout: (proof: MutationProof) => Promise<void>
  updateProfile: (proof: MutationProof, input: string | (() => Promise<ProfileChange>), revision?: number, key?: string) => Promise<User>
  readonly policy: IdentityHttpPolicy
  assertMutationProof: (proof: MutationProof) => Promise<void>
  register: (input: RegisterInput, idempotencyKey: string, context?: AuthenticationContext) => Promise<User>
  login: (input: LoginInput, proof: MutationProof, context?: AuthenticationContext) => Promise<LoginResult>
}
export interface IdentityDependencies {
  users: UserRepository
  attempts: AttemptLimiter
  hasher: PasswordHasher
  crypto: IdentitySecrets
  sessions: SessionService
  config: Pick<IdentityConfig, 'allowedOrigins' | 'sameSite' | 'sessionTtlSeconds' | 'authMaxConcurrent' | 'authMaxAttempts' | 'authSourceMaxAttempts' | 'authWindowSeconds' | 'receiptTtlSeconds'>
  now: () => Date
  audit?: IdentityAuditSink
}

/** Active application implementation; no unavailable placeholder paths. */
export class IdentityService implements AuthenticationApplication {
  current(proof: MutationProof) { const d = this.dependenciesOrFail(); return d.sessions.current(proof, d.users) }
  requireAuthenticatedUser(proof: MutationProof, mutation = false) { const d = this.dependenciesOrFail(); return d.sessions.requireAuthenticatedUser(proof, d.users, mutation) }
  async requireRole(proof: MutationProof, role: User['role']) { return requireRole(await this.requireAuthenticatedUser(proof), role) }
  logout(proof: MutationProof) { return this.dependenciesOrFail().sessions.logout(proof) }
  async updateProfile(proof: MutationProof, input: string | (() => Promise<ProfileChange>), revision?: number, key?: string) {
    const d = this.dependenciesOrFail()
    const user = await this.requireAuthenticatedUser(proof, true)
    const change = typeof input === 'function' ? await input() : { displayName: input, revision, key }
    if (change.revision === undefined || change.key === undefined) throw new IdentityUnavailableError()
    return new ProfileService(d.users, d.crypto, d.config.receiptTtlSeconds, d.now).update(user, change.displayName, change.revision, change.key)
  }
  private active = 0
  constructor(private readonly dependencies: IdentityDependencies) {}
  private dependenciesOrFail() {
    if (!this.dependencies) throw new IdentityUnavailableError()
    return this.dependencies
  }
  get policy(): IdentityHttpPolicy {
    const { config } = this.dependenciesOrFail()
    return { allowedOrigins: config.allowedOrigins, sameSite: config.sameSite, sessionTtlSeconds: config.sessionTtlSeconds }
  }
  assertMutationProof(proof: MutationProof) { return this.dependenciesOrFail().sessions.assertMutationProof(proof) }
  private async limited<T>(work: (dependencies: IdentityDependencies) => Promise<T>) {
    const dependencies = this.dependenciesOrFail()
    if (this.active >= dependencies.config.authMaxConcurrent) throw tooManyAttempts(1)
    this.active++
    try { return await work(dependencies) } finally { this.active-- }
  }
  private async budget(operation: 'login' | 'register', context: AuthenticationContext) {
    const d=this.dependenciesOrFail(), at=d.now()
    const source=context.source
    if (source !== undefined && (!source || source.length>256)) throw new IdentityUnavailableError()
    if (source && d.config.authSourceMaxAttempts) await d.attempts.consume(d.crypto.fingerprint(operation+'-source',source),at,d.config.authWindowSeconds,d.config.authSourceMaxAttempts)
    // Shared Mongo budget remains mandatory even when ingress cannot establish a trusted source.
    await d.attempts.consume(d.crypto.fingerprint(operation+'-global','all'),at,d.config.authWindowSeconds,d.config.authMaxAttempts)
  }
  private async audited<T>(operation: 'login' | 'register', work: () => Promise<T>): Promise<T> {
    const d=this.dependenciesOrFail()
    try { const value=await work(); emitAudit(d.audit,operation==='login'?'login_success':'register_success',d.now); return value }
    catch(error) {
      emitAudit(d.audit,operation==='login'?'login_failure':'register_failure',d.now)
      if(error instanceof IdentityError && error.status===429) emitAudit(d.audit,'rate_limited',d.now)
      throw error
    }
  }
  register(input: RegisterInput, idempotencyKey: string, context: AuthenticationContext = {}): Promise<User> {
    input = { ...input, email: canonicalEmail(input.email) }
    return this.audited('register',()=>this.limited(async ({ users, hasher, crypto, config, now }) => {
      const timestamp = now()
      await this.budget('register',context)
      const keyHash = crypto.fingerprint('POST /api/v4/users', idempotencyKey)
      const payload = JSON.stringify([input.email, input.password, input.displayName])
      const replay = async (receipt: RegistrationReceipt) => {
        // Legacy fast-HMAC receipts are never verified or upgraded implicitly.
        if (!receipt.fingerprint.startsWith('$argon2id$')) throw new IdentityUnavailableError()
        if (!await hasher.verify(receipt.fingerprint, payload)) throw receiptConflict()
        return publicUser(receipt.user)
      }
      const receipt = await users.findRegistrationReceipt(keyHash, timestamp)
      if (receipt) {
        return replay(receipt)
      }
      if (await users.findCredentialsByEmail(input.email)) {
        // The first request may have committed between the receipt and email reads.
        const committed = await users.findRegistrationReceipt(keyHash, timestamp)
        if (committed) {
          return replay(committed)
        }
        throw duplicateEmail()
      }
      const user: User = { id: randomUUID(), email: input.email, displayName: input.displayName, role: registrationRole(), revision: 1, updatedAt: timestamp.toISOString() }
      const passwordHash = await hasher.hash(input.password)
      const fingerprint = await hasher.hash(payload)
      const committed = await users.commitRegistration({ user, passwordHash }, {
        keyHash, fingerprint, user, expiresAt: new Date(timestamp.getTime() + config.receiptTtlSeconds * 1000),
      }, timestamp)
      // A concurrent request may have won with a different salted verifier/payload.
      return committed.fingerprint === fingerprint ? publicUser(committed.user) : replay(committed)
    }))
  }
  login(input: LoginInput, proof: MutationProof, context: AuthenticationContext = {}): Promise<LoginResult> {
    input = { ...input, email: canonicalEmail(input.email) }
    return this.audited('login',()=>this.limited(async ({ users, hasher, sessions }) => {
      await this.budget('login',context)
      const account = await users.findCredentialsByEmail(input.email)
      const dummy = await hasher.dummyHash()
      const valid = await hasher.verify(account?.passwordHash ?? dummy, input.password)
      if (!account || !valid) throw invalidCredentials()
      return sessions.create(account.user, proof.sessionToken)
    }))
  }
}

/** Explicit fail-closed compatibility boundary, never an active service. */
export class UnavailableIdentityService implements IdentityApplication {
  async execute(_operation: IdentityOperation): Promise<never> { throw new IdentityUnavailableError() }
}
