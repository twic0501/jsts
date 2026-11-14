import { describe, expect, it, vi } from 'vitest'
import {
  IdentityUnavailableError,
  UnavailableIdentityService,
  identityOperations,
  type IdentityApplication,
} from '../application/identity.service'
import { createIdentityModule } from '../identity.module'
import { getIdentityModule } from '../identity.bootstrap'

describe('FR12 Stage 5.1 application boundary', () => {
  it.each(identityOperations)('%s cannot create a successful identity result', async operation => {
    await expect(new UnavailableIdentityService().execute(operation)).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      code: 'IDENTITY_UNAVAILABLE',
    })
  })

  it('bootstrap reuses stateless dependencies without creating a session', () => {
    expect(getIdentityModule()).toBe(getIdentityModule())
  })
  it('keeps the public authorization/readiness boundary fail-closed without configuration',async()=>{
    const module=createIdentityModule({})
    await expect(module.authorization.requireAuthenticatedUser({})).rejects.toMatchObject({status:503})
    await expect(module.authorization.requireRole({},'admin')).rejects.toMatchObject({status:503})
    await expect(module.readiness()).rejects.toMatchObject({status:503})
  })

  it.each(identityOperations)('controller delegates %s to the injected application boundary', async operation => {
    const execute = vi.fn<IdentityApplication['execute']>().mockRejectedValue(new IdentityUnavailableError())
    const module = createIdentityModule({ identity: { execute } })
    const response = await module.controller[operation](new Request('http://localhost/api/v4'))
    expect(execute).toHaveBeenCalledExactlyOnceWith(operation)
    expect(response.status).toBe(503)
  })

  it('unexpected application exceptions are sanitized by the existing HTTP error format', async () => {
    const execute = vi.fn<IdentityApplication['execute']>().mockRejectedValue(new Error('sensitive-internal-sentinel'))
    const module = createIdentityModule({ identity: { execute } })
    const response = await module.controller.getCurrentUser(new Request('http://localhost/api/v4/users/me'))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toMatchObject({ error: { code: 'INTERNAL_ERROR' }, requestId: expect.any(String) })
    expect(JSON.stringify(body)).not.toContain('sensitive-internal-sentinel')
    expect(JSON.stringify(body)).not.toContain('stack')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-request-id')).toBe(body.requestId)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
