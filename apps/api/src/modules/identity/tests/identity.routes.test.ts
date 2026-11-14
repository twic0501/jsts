import { afterEach, describe, expect, it, vi } from 'vitest'
import * as users from '../../../../app/api/v4/users/route'
import * as profile from '../../../../app/api/v4/users/me/route'
import * as sessions from '../../../../app/api/v4/sessions/route'
import * as current from '../../../../app/api/v4/sessions/current/route'
import reference from '../contracts/fr12.reference.json'

const endpoints = [
  { method: 'POST', path: '/api/v4/users', handler: users.POST },
  { method: 'POST', path: '/api/v4/sessions', handler: sessions.POST },
  { method: 'GET', path: '/api/v4/sessions/current', handler: current.GET },
  { method: 'DELETE', path: '/api/v4/sessions/current', handler: current.DELETE },
  { method: 'GET', path: '/api/v4/users/me', handler: profile.GET },
  { method: 'PATCH', path: '/api/v4/users/me', handler: profile.PATCH },
]

describe('FR12 Next Route Handlers', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

  it.each(endpoints)('$method $path fails closed without consuming credentials or issuing cookies', async ({ method, path, handler }) => {
    vi.stubEnv('VITE_AUTH_MODE', 'mock') // A frontend demo flag cannot enable backend identity.
    const log = vi.spyOn(console, 'log')
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    const headers = { Origin: 'https://untrusted.invalid', Cookie: '__Host-pm_session=untrusted-sentinel', 'Content-Type': 'application/json' }
    const request = new Request(`http://localhost${path}`, {
      method, headers,
      ...(method === 'GET' ? {} : { body: JSON.stringify({ userId: 'forged', role: 'admin', password: 'input-sentinel' }) }),
    })
    const response = await handler(request)
    const contract = reference.endpoints.find(endpoint => endpoint.method === method && endpoint.path === path)
    expect(contract?.errorStatuses).toContain(response.status)
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toEqual({
      error: { code: 'IDENTITY_UNAVAILABLE', message: 'Chức năng tài khoản FR12 chưa sẵn sàng.' },
      requestId: expect.any(String),
    })
    expect(request.bodyUsed).toBe(false)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-request-id')).toBe(body.requestId)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
