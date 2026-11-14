import { describe, expect, it } from 'vitest'
import { assertProductionTransport } from '../scripts/fr12/https-policy.mjs'
describe('FR12 production transport guard',()=>{
  it.each(['127.0.0.1','127.1.2.3','localhost','::1','0:0:0:0:0:0:0:1'])('permits local HTTP on %s',host=>{
    expect(()=>assertProductionTransport({host})).not.toThrow()
  })
  it.each(['0.0.0.0','::','192.0.2.12','2001:db8::1','127.0.0.1.attacker.test','public.example'])('requires TLS on %s',host=>{
    expect(()=>assertProductionTransport({host})).toThrow()
    expect(()=>assertProductionTransport({host,cert:'test-cert-path',key:'test-key-path'})).not.toThrow()
  })
  it('rejects incomplete TLS without relying on forwarded headers',()=>{
    expect(()=>assertProductionTransport({host:'127.0.0.1',cert:'test-cert-path'})).toThrow()
  })
})
