import { randomBytes } from 'node:crypto'
import { readIdentityConfig, type IdentityConfig } from '../identity.config'
import { IdentityService } from '../application/identity.service'
import { SessionService } from '../application/session.service'
import { IdentityCryptography, Argon2PasswordHasher } from '../infrastructure/identity.crypto'
import type { MongoIdentityRepository } from '../infrastructure/mongo-identity.repository'
import type { UserRepository } from '../ports/user.repository'
import type { SessionRepository } from '../ports/session.repository'
import type { PasswordHasher } from '../ports/authentication'
import type { IdentityAuditSink } from '../ports/audit'
import { createIdentityModule } from '../identity.module'

export function testConfig(uri: string, databaseName: string): IdentityConfig {
  return readIdentityConfig({ NODE_ENV: 'test', MONGODB_URI: uri, IDENTITY_MONGODB_DB: databaseName,
    IDENTITY_SECRET: randomBytes(32).toString('base64'), IDENTITY_ALLOWED_ORIGINS: 'https://paper.test',
    IDENTITY_SESSION_TTL_SECONDS: '3600', IDENTITY_SESSION_SAME_SITE: 'Lax',
    IDENTITY_AUTH_WINDOW_SECONDS: '60', IDENTITY_AUTH_MAX_ATTEMPTS: '1000', IDENTITY_AUTH_MAX_CONCURRENT: '4',
    IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS: '3600',
  })
}
export function authenticationFixture(repository: MongoIdentityRepository, config: IdentityConfig, options: {
  users?: UserRepository; sessions?: SessionRepository; hasher?: PasswordHasher; now?: () => Date; audit?: IdentityAuditSink; requestSource?: (request: Request) => string | undefined
} = {}) {
  const crypto = new IdentityCryptography(config.secret)
  const now = options.now ?? (() => new Date())
  const sessions = new SessionService(options.sessions ?? repository, crypto, config, now, options.audit)
  const service = new IdentityService({ users: options.users ?? repository, attempts: repository, hasher: options.hasher ?? new Argon2PasswordHasher(), crypto, sessions, config, now, ...(options.audit?{audit:options.audit}:{}) })
  const module=createIdentityModule({ authentication: service, ...(options.audit?{audit:options.audit}:{}), ...(options.requestSource?{requestSource:options.requestSource}:{}) })
  return { controller: module.controller, authorization: module.authorization, service, crypto }
}
export function post(path: string, value: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://paper.test${path}`, {
    method: 'POST', headers: { Origin: 'https://paper.test', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value),
  })
}
export const validRegistration = { email: 'reader@example.test', password: 'a-test-password-12', displayName: 'Reader' }
