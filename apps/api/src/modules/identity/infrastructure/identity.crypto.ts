import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import * as argon2 from 'argon2'
import type { IdentitySecrets, PasswordHasher } from '../ports/authentication'

/** Uses the library implementation; no custom password hashing or reversible encryption. */
export class Argon2PasswordHasher implements PasswordHasher {
  private dummy: Promise<string> | undefined
  hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1, hashLength: 32 })
  }
  verify(hash: string, password: string) { return argon2.verify(hash, password) }
  dummyHash() { return this.dummy ??= this.hash(randomBytes(32).toString('base64url')) }
}

export class IdentityCryptography implements IdentitySecrets {
  constructor(private readonly secret: Buffer) {}
  fingerprint(purpose: string, value: string) {
    return createHmac('sha256', this.secret).update(JSON.stringify([purpose, value])).digest('base64url')
  }
  newSessionToken() { return randomBytes(32).toString('base64url') }
  hashSessionToken(token: string) { return createHash('sha256').update(token).digest('hex') }
  csrfToken(token: string) { return this.fingerprint('csrf-session', token) }
  validCsrf(token: string, submitted: string | undefined) {
    if (!submitted || !/^[A-Za-z0-9_-]{43}$/.test(submitted)) return false
    return timingSafeEqual(Buffer.from(this.csrfToken(token)), Buffer.from(submitted))
  }
}
