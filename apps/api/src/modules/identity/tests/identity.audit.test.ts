import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConsoleIdentityAuditSink } from '../infrastructure/identity.audit'
import { emitAudit } from '../ports/audit'
afterEach(()=>vi.restoreAllMocks())
describe('Identity audit allowlist',()=>{
  it('drops arbitrary credential fields rather than serializing the supplied object',()=>{
    const output=vi.spyOn(console,'info').mockImplementation(()=>{})
    const event={kind:'login_success' as const,at:'2026-01-01T00:00:00Z',password:'sensitive-sentinel',cookie:'sensitive-sentinel',secret:'sensitive-sentinel',body:{password:'sensitive-sentinel'}}
    new ConsoleIdentityAuditSink().write(event)
    expect(JSON.parse(output.mock.calls[0]![0])).toEqual({scope:'identity',event:'login_success',at:'2026-01-01T00:00:00.000Z'})
    expect(JSON.stringify(output.mock.calls)).not.toContain('sensitive-sentinel')
  })
  it('isolates sink failures from authentication',()=>{
    expect(()=>emitAudit({write:()=>{throw new Error('sensitive-sentinel')}},'login_failure',()=>new Date())).not.toThrow()
  })
})
