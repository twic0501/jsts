import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { readIdentityConfig } from '../identity.config'
import { IdentityUnavailableError } from '../domain/identity.error'

function environment(): NodeJS.ProcessEnv {
  return { NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017', IDENTITY_MONGODB_DB: 'identity_test_config',
    IDENTITY_SECRET: randomBytes(32).toString('base64'), IDENTITY_ALLOWED_ORIGINS: 'https://paper.test',
    IDENTITY_SESSION_TTL_SECONDS: '3600', IDENTITY_SESSION_SAME_SITE: 'Lax',
    IDENTITY_AUTH_WINDOW_SECONDS: '60', IDENTITY_AUTH_MAX_ATTEMPTS: '5', IDENTITY_AUTH_MAX_CONCURRENT: '2',
    IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS: '3600' }
}
describe('Required server configuration', () => {
  it('requires source budget to be strictly below the shared global budget',()=>{
    expect(readIdentityConfig({...environment(),IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS:'2'}).authSourceMaxAttempts).toBe(2)
    expect(()=>readIdentityConfig({...environment(),IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS:'5'})).toThrow(IdentityUnavailableError)
  })
  it('accepts explicit server policy without using any VITE mock setting', () => {
    const env = environment()
    env.VITE_AUTH_MODE = 'mock'
    const config = readIdentityConfig(env)
    expect(config.sameSite).toBe('Lax')
    expect(config.allowedOrigins.has('https://paper.test')).toBe(true)
  })
  it.each(['MONGODB_URI', 'IDENTITY_MONGODB_DB', 'IDENTITY_SECRET', 'IDENTITY_ALLOWED_ORIGINS', 'IDENTITY_SESSION_TTL_SECONDS', 'IDENTITY_SESSION_SAME_SITE', 'IDENTITY_AUTH_WINDOW_SECONDS', 'IDENTITY_AUTH_MAX_ATTEMPTS', 'IDENTITY_AUTH_MAX_CONCURRENT', 'IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS'])('fails closed when %s is missing', name => {
    const env = environment()
    delete env[name]
    expect(() => readIdentityConfig(env)).toThrow(IdentityUnavailableError)
  })
  it.each([
    ['IDENTITY_SECRET', 'short'], ['IDENTITY_SESSION_TTL_SECONDS', '0'], ['IDENTITY_AUTH_MAX_ATTEMPTS', '1.5'],
    ['IDENTITY_SESSION_SAME_SITE', 'invalid'], ['IDENTITY_ALLOWED_ORIGINS', 'http://paper.test'],
    ['IDENTITY_ALLOWED_ORIGINS', 'https://paper.test/path'], ['IDENTITY_ALLOWED_ORIGINS', '*'],
    ['IDENTITY_MONGODB_DB', '../unsafe'], ['MONGODB_URI', 'https://foreign.test'],
  ])('rejects invalid %s without exposing configuration values', (name, value) => {
    const env = environment()
    env[name!] = value
    try { readIdentityConfig(env); throw new Error('Expected config failure') }
    catch (error) {
      expect(error).toBeInstanceOf(IdentityUnavailableError)
      expect((error as Error).message).toBe('Chức năng tài khoản FR12 chưa sẵn sàng.')
    }
  })
})
