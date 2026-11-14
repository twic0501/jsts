import { IdentityService, UnavailableIdentityService } from './application/identity.service'
import { createIdentityModule, type IdentityModule } from './identity.module'
import { readIdentityConfig } from './identity.config'
import { Argon2PasswordHasher, IdentityCryptography } from './infrastructure/identity.crypto'
import { MongoIdentityRepository } from './infrastructure/mongo-identity.repository'
import { SessionService } from './application/session.service'
import { ConsoleIdentityAuditSink } from './infrastructure/identity.audit'

let identity: IdentityModule | undefined
let store: MongoIdentityRepository | undefined
const unavailable = createIdentityModule({ identity: new UnavailableIdentityService() })

/** Module-local composition root: the current checkout has no shared Bootstrap/DI. */
export function getIdentityModule(): IdentityModule {
  if (identity) return identity
  try {
    const config = readIdentityConfig(process.env)
    const repository = new MongoIdentityRepository(config.mongoUri, config.databaseName)
    store = repository
    const crypto = new IdentityCryptography(config.secret)
    const now = () => new Date()
    const audit = new ConsoleIdentityAuditSink()
    const sessions = new SessionService(repository, crypto, config, now, audit)
    const service = new IdentityService({ users: repository, attempts: repository, hasher: new Argon2PasswordHasher(), crypto, sessions, config, now, audit })
    return identity = createIdentityModule({ authentication: service, audit, readiness: ()=>repository.checkReady() })
  } catch {
    // Missing/invalid configuration never enables mocks or leaks secret env values.
    return unavailable
  }
}

export async function closeIdentityModule() {
  await store?.close()
  store = undefined
  identity = undefined
}
