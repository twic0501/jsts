import { describe, expect, expectTypeOf, it } from 'vitest'
import reference from '../contracts/fr12.reference.json'
import type { RegisterInput, LoginInput, ProfilePatch, SessionDto, UserDto } from '../presentation/identity.dto'
import type { User } from '../domain/user.entity'
import type { UserRepository } from '../ports/user.repository'
import type { SessionRepository } from '../ports/session.repository'

describe('Delivered FR12 wire and read-port boundaries', () => {
  it('keeps registration and profile edits separate from server-owned identity fields', () => {
    expectTypeOf<keyof RegisterInput>().toEqualTypeOf<'email' | 'password' | 'displayName'>()
    expectTypeOf<keyof LoginInput>().toEqualTypeOf<'email' | 'password'>()
    expectTypeOf<keyof ProfilePatch>().toEqualTypeOf<'displayName'>()
    expectTypeOf<UserDto>().toEqualTypeOf<User>()
    expectTypeOf<UserDto['role']>().toEqualTypeOf<'user' | 'admin'>()
    expect(Object.keys(reference.schemas.RegisterInput.properties).sort()).toEqual(['displayName', 'email', 'password'])
    expect(Object.keys(reference.schemas.ProfilePatch.properties)).toEqual(['displayName'])
  })

  it('supports the anonymous Session representation without leaking an opaque session token', () => {
    expectTypeOf<SessionDto['user']>().toEqualTypeOf<User | null>()
    expectTypeOf<SessionDto['expiresAt']>().toEqualTypeOf<string | null>()
    expectTypeOf<keyof SessionDto>().toEqualTypeOf<'user' | 'csrfToken' | 'expiresAt'>()
    expect(reference.schemas.Session.required).toEqual(['user', 'csrfToken', 'expiresAt'])
    expect(reference.securitySchemes.sessionCookie.name).toBe('__Host-pm_session')
  })

  it('defines repository reads with no HTTP or cookie types and no persistence adapter', () => {
    expectTypeOf<Parameters<UserRepository['findById']>>().toEqualTypeOf<[id: string]>()
    expectTypeOf<ReturnType<UserRepository['findById']>>().toEqualTypeOf<Promise<User | null>>()
    expectTypeOf<Parameters<SessionRepository['findActiveByTokenHash']>>().toEqualTypeOf<[tokenHash: string, at: Date]>()
  })
})
