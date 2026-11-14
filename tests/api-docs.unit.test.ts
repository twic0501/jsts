import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET as page } from '../apps/api/app/api-docs/route'
import { GET as specification } from '../apps/api/app/api-docs/openapi.json/route'
import { GET as asset } from '../apps/api/app/api-docs/assets/[asset]/route'

afterEach(()=>vi.unstubAllEnvs())
describe('API docs deployment boundary',()=>{
  it('does not expose UI, specification or assets by default in production',async()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('PM_API_DOCS',undefined)
    expect(page().status).toBe(404)
    expect(specification().status).toBe(404)
    expect((await asset(new Request('http://localhost/api-docs/assets/init.js'),{params:Promise.resolve({asset:'init.js'})})).status).toBe(404)
  })
  it('explicit development launcher opt-in serves a same-origin spec without caching',async()=>{
    vi.stubEnv('NODE_ENV','production');vi.stubEnv('PM_API_DOCS','1')
    const response=specification()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const spec=await response.json()
    expect(spec.servers[0].url).toBe('/')
    expect(page().headers.get('content-security-policy')).toContain("connect-src 'self'")
    expect(spec.paths['/api/v4/users/me/bookmarks'].get.description).toContain('503')
  })
  it('explicit disable closes development docs and asset traversal is never served',async()=>{
    vi.stubEnv('NODE_ENV','development');vi.stubEnv('PM_API_DOCS','0')
    expect(page().status).toBe(404)
    vi.stubEnv('PM_API_DOCS','1')
    expect((await asset(new Request('http://localhost/api-docs/assets/anything'),{params:Promise.resolve({asset:'../../.env'})})).status).toBe(404)
  })
})
