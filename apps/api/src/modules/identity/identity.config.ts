import { IdentityUnavailableError } from './domain/identity.error'

export interface IdentityHttpPolicy {
  allowedOrigins: ReadonlySet<string>
  sessionTtlSeconds: number
  sameSite: 'Lax' | 'Strict' | 'None'
}
export interface IdentityConfig extends IdentityHttpPolicy {
  mongoUri: string
  databaseName: string
  secret: Buffer
  authWindowSeconds: number
  authMaxAttempts: number
  authMaxConcurrent: number
  authSourceMaxAttempts?: number
  receiptTtlSeconds: number
}

/** No guessed production defaults. Never include env values in configuration errors. */
export function readIdentityConfig(env: NodeJS.ProcessEnv): IdentityConfig {
  const required = (name: string) => {
    const value = env[name]?.trim()
    if (!value) throw new IdentityUnavailableError()
    return value
  }
  const integer = (name: string, max: number) => {
    const raw = required(name)
    const value = Number(raw)
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) throw new IdentityUnavailableError()
    return value
  }
  const mongoUri = required('MONGODB_URI')
  const databaseName = required('IDENTITY_MONGODB_DB')
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri) || !/^[a-zA-Z0-9_-]{1,63}$/.test(databaseName)) throw new IdentityUnavailableError()
  const encoded = required('IDENTITY_SECRET')
  const secret = Buffer.from(encoded, 'base64')
  if (secret.length < 32 || secret.toString('base64') !== encoded) throw new IdentityUnavailableError()
  const sameSite = required('IDENTITY_SESSION_SAME_SITE')
  if (sameSite !== 'Lax' && sameSite !== 'Strict' && sameSite !== 'None') throw new IdentityUnavailableError()
  const origins = required('IDENTITY_ALLOWED_ORIGINS').split(',').map(value => value.trim())
  try {
    for (const origin of origins) {
      const parsed = new URL(origin)
      if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
        throw new IdentityUnavailableError()
      if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') throw new IdentityUnavailableError()
    }
  } catch { throw new IdentityUnavailableError() }
  const authMaxAttempts=integer('IDENTITY_AUTH_MAX_ATTEMPTS',10_000)
  const authSourceMaxAttempts=env.IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS===undefined?undefined:integer('IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS',authMaxAttempts-1)
  return {
    mongoUri, databaseName, secret, sameSite, allowedOrigins: new Set(origins),
    sessionTtlSeconds: integer('IDENTITY_SESSION_TTL_SECONDS', 31_536_000),
    authWindowSeconds: integer('IDENTITY_AUTH_WINDOW_SECONDS', 86_400),
    authMaxAttempts,
    ...(authSourceMaxAttempts===undefined?{}:{authSourceMaxAttempts}),
    authMaxConcurrent: integer('IDENTITY_AUTH_MAX_CONCURRENT', 16),
    receiptTtlSeconds: integer('IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS', 604_800),
  }
}
