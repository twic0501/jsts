import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRealBookmarkClient } from '../apps/web/src/features/bookmarks/services/real-bookmark-client'
import { unavailableMapping, type DocumentMapping } from '../apps/web/src/features/bookmarks/types/bookmark.types'
import type { AuthClient, AuthSession } from '../apps/web/src/features/auth/types/auth.types'
const session:AuthSession={source:'backend',user:{id:'00000000-0000-4000-8000-000000000011',email:'unit@example.test',displayName:'Unit',role:'user'}}
const documentId='00000000-0000-4000-8000-000000000001',paperId='2402.04299'
const row={id:'00000000-0000-4000-8000-000000000002',documentId,saved:true as const,revision:1,updatedAt:new Date().toISOString()}
const mapping:DocumentMapping={async ready(){},async toDocumentId(paper){return paper===paperId?documentId:null},async toPaperId(id){return id===documentId?paperId:null}}
function auth():AuthClient{return {mode:'backend',async getSession(){return session},async getMutationHeaders(){return {'X-CSRF-Token':'c'.repeat(43)}},async login(){throw new Error('unused')},async register(){return null},async logout(){}}}
const page=(items:unknown[]=[])=>Response.json({items,nextCursor:null})
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
describe('FR14 real adapter transport (synthetic unit responses, not an integration demo)',()=>{
  it('rejects missing mapping and mock identities before any FR14 request',async()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher)
    const c=createRealBookmarkClient(auth(),unavailableMapping)
    await expect(c.list(session)).rejects.toMatchObject({code:'MAPPING_UNAVAILABLE'})
    await expect(c.save(session,paperId)).rejects.toMatchObject({code:'MAPPING_UNAVAILABLE'})
    await expect(c.list({...session,source:'mock'})).rejects.toMatchObject({code:'SESSION_EXPIRED'})
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('maps both directions, sends no owner and only confirms PUT/DELETE responses',async()=>{
    let items:typeof row[]=[]
    const fetcher=vi.fn(async(_url:string,init:RequestInit)=>{
      if(init.method==='PUT'){items=[row];return Response.json(row,{headers:{ETag:'"1"'}})}
      if(init.method==='DELETE'){items=[];return new Response(null,{status:204})}
      return page(items)
    });vi.stubGlobal('fetch',fetcher)
    const c=createRealBookmarkClient(auth(),mapping)
    await c.save(session,paperId)
    expect(await c.list(session)).toEqual([paperId])
    expect(await createRealBookmarkClient(auth(),mapping).list(session)).toEqual([paperId])
    await c.remove(session,paperId);expect(await c.list(session)).toEqual([])
    const put=fetcher.mock.calls.find(call=>call[1].method==='PUT')!
    expect(put[0]).toBe('/api/v4/users/me/bookmarks/'+documentId)
    expect(JSON.parse(String(put[1].body))).toEqual({saved:true})
    expect(put[1].credentials).toBe('include')
    expect(new Headers(put[1].headers).get('If-None-Match')).toBe('*')
    expect(new Headers(put[1].headers).get('X-CSRF-Token')).toBe('c'.repeat(43))
    const del=fetcher.mock.calls.find(call=>call[1].method==='DELETE')!
    expect(new Headers(del[1].headers).get('If-Match')).toBe('"1"')
  })
  it('keeps the same key/precondition for an ambiguous committed write and deduplicates clicks',async()=>{
    const keys:string[]=[];let attempts=0
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{
      if(init.method==='GET')return page()
      keys.push(new Headers(init.headers).get('Idempotency-Key')!)
      expect(new Headers(init.headers).get('If-None-Match')).toBe('*')
      if(++attempts===1)throw new Error('response lost after commit')
      return Response.json(row,{headers:{ETag:'"1"'}})
    }))
    const c=createRealBookmarkClient(auth(),mapping)
    await expect(c.save(session,paperId)).rejects.toMatchObject({code:'UNAVAILABLE'})
    await Promise.all([c.save(session,paperId),c.save(session,paperId)])
    expect(attempts).toBe(2);expect(keys[0]).toBe(keys[1])
  })
  it.each([[401,'SESSION_EXPIRED'],[403,'FORBIDDEN'],[409,'CONFLICT'],[412,'STALE_REVISION'],[429,'RATE_LIMITED'],[503,'DEPENDENCY_UNAVAILABLE']])('maps HTTP %s without exposing raw server text',async(status,code)=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:{message:'sensitive-sentinel'}},{status:Number(status),headers:{'Retry-After':'5'}})))
    const result=await createRealBookmarkClient(auth(),mapping).list(session).catch(error=>error)
    expect(result.code).toBe(code);expect(result.message).not.toContain('sensitive-sentinel')
  })
  it.each([new Response('<html/>',{headers:{'Content-Type':'text/html'}}),Response.json({items:[],nextCursor:null}, {status:201}),Response.json({items:[{...row,saved:false}],nextCursor:null}),Response.json({items:[]})])('rejects responses outside contract (%#)',async result=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(result))
    await expect(createRealBookmarkClient(auth(),mapping).list(session)).rejects.toMatchObject({code:'INVALID_RESPONSE'})
  })
  it('does not silently omit a bookmark without reverse metadata mapping',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(page([{...row,documentId:'00000000-0000-4000-8000-000000000099'}])))
    await expect(createRealBookmarkClient(auth(),mapping).list(session)).rejects.toMatchObject({code:'MAPPING_UNAVAILABLE'})
  })
  it('does not let a late list replace the revision cache after a write',async()=>{
    let slow=false,complete:((r:Response)=>void)|undefined,deletes=0
    vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{
      if(init.method==='PUT')return Response.json(row,{headers:{ETag:'"1"'}})
      if(init.method==='DELETE'){deletes++;expect(new Headers(init.headers).get('If-Match')).toBe('"1"');return new Response(null,{status:204})}
      if(slow){slow=false;return new Promise<Response>(resolve=>{complete=resolve})}
      return page()
    }))
    const c=createRealBookmarkClient(auth(),mapping);await c.list(session)
    slow=true;const old=c.list(session);await vi.waitFor(()=>expect(complete).toBeDefined())
    await c.save(session,paperId);complete!(page());await old
    await c.remove(session,paperId);expect(deletes).toBe(1)
  })
  it('discards late reads after logout/reset',async()=>{
    let complete!:(r:Response)=>void
    vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{complete=resolve})))
    const c=createRealBookmarkClient(auth(),mapping),pending=c.list(session).catch(error=>error)
    await vi.waitFor(()=>expect(complete).toBeDefined());c.reset!();complete(page([row]))
    expect((await pending).name).toBe('AbortError')
  })
  it('times out without claiming saved state',async()=>{
    vi.useFakeTimers()
    vi.stubGlobal('fetch',vi.fn((_url:string,init:RequestInit)=>new Promise((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError'))))))
    const result=createRealBookmarkClient(auth(),mapping,10).list(session).catch(error=>error)
    await vi.advanceTimersByTimeAsync(20)
    expect((await result).code).toBe('UNAVAILABLE')
  })
})
