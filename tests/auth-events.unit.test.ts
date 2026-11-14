import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAuthEvents } from '../apps/web/src/features/auth/services/auth-events'
afterEach(()=>vi.unstubAllGlobals())
describe('Auth cross-tab invalidation',()=>{
  it('broadcasts no identity or secret and only requests verification on a valid event',()=>{
    let listener: ((event:{data:unknown})=>void) | null=null
    const send=vi.fn(),close=vi.fn(),invalidate=vi.fn()
    vi.stubGlobal('BroadcastChannel',class {
      postMessage=send;close=close
      set onmessage(value:typeof listener){listener=value}
    })
    const bus=createAuthEvents(invalidate)
    bus.publish();expect(send).toHaveBeenCalledExactlyOnceWith({type:'identity-changed',version:1})
    listener!({data:{type:'authenticate',user:{role:'admin'}}});expect(invalidate).not.toHaveBeenCalled()
    listener!({data:{type:'identity-changed',version:1}});expect(invalidate).toHaveBeenCalledTimes(1)
    bus.close();expect(close).toHaveBeenCalledOnce()
  })
  it('falls back safely when the browser denies BroadcastChannel',()=>{
    vi.stubGlobal('BroadcastChannel',class {constructor(){throw new Error('denied')}})
    expect(()=>{const bus=createAuthEvents(vi.fn());bus.publish();bus.close()}).not.toThrow()
  })
})
