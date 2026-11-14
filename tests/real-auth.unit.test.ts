import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRealAuthClient } from '../apps/web/src/features/auth/services/real-auth-client'
const wireUser={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',displayName:'Reader',role:'user',revision:1,updatedAt:new Date().toISOString()}
const session=(signed=true)=>({user:signed?wireUser:null,csrfToken:'c'.repeat(43),expiresAt:signed?new Date(Date.now()+3600000).toISOString():null})
const response=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers})
afterEach(()=>vi.unstubAllGlobals())
describe('Real FR12 browser adapter',()=>{
 it('provides only a CSRF header after checking the expected Backend account',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>response(session())))
  const client=createRealAuthClient()
  expect(await client.getMutationHeaders!(wireUser.id)).toEqual({'X-CSRF-Token':'c'.repeat(43)})
  await expect(client.getMutationHeaders!('00000000-0000-4000-8000-000000000099')).rejects.toMatchObject({code:'SESSION_EXPIRED'})
 })
 it.each([
  response(session(false)),response(session(),201),new Response('<html/>',{headers:{'Content-Type':'text/html'}}),response({...session(),user:{...wireUser,passwordHash:'must-not-be-public'}}),
 ])('rejects an invalid login response before publishing a session (%#)',async result=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(session(false))).mockResolvedValueOnce(result)
  vi.stubGlobal('fetch',fetcher)
  await expect(createRealAuthClient().login({email:wireUser.email,password:'example'})).rejects.toMatchObject({code:'UNAVAILABLE'})
  expect(fetcher).toHaveBeenCalledTimes(2)
 })
 it.each([
  [409,'EMAIL_ALREADY_REGISTERED','EMAIL_EXISTS'],[409,'IDEMPOTENCY_CONFLICT','IDEMPOTENCY_CONFLICT'],[409,'OTHER','CONFLICT'],[403,'CSRF_REJECTED','FORBIDDEN'],[429,'AUTH_RATE_LIMIT','RATE_LIMITED'],
 ])('maps %s/%s safely to %s',async(status,serverCode,code)=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({error:{code:serverCode,message:'raw-sensitive-sentinel'}},Number(status),{'Retry-After':'17'})))
  await expect(createRealAuthClient().getSession()).rejects.toMatchObject({code,...(code==='RATE_LIMITED'?{retryAfterSeconds:17}:{})})
  try{await createRealAuthClient().getSession()}catch(error){expect(String(error)).not.toContain('raw-sensitive-sentinel')}
 })
 it.each([
  new Response('<html>fallback</html>',{status:200,headers:{'Content-Type':'text/html'}}),
  response({},202),new Response('{',{status:201,headers:{'Content-Type':'application/json'}}),response({},201),
 ])('rejects registration outside the response contract (%#)',async result=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session(false))).mockResolvedValueOnce(result))
  await expect(createRealAuthClient().register({email:wireUser.email,displayName:'Reader',password:'a'.repeat(12),confirmPassword:'a'.repeat(12)})).rejects.toMatchObject({code:'UNAVAILABLE'})
 })
 it.each([200,201,202])('rejects logout status %s rather than claiming revocation',async status=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response({},status)))
  await expect(createRealAuthClient().logout()).rejects.toMatchObject({code:'UNAVAILABLE'})
 })
 it.each([new Response('{}',{headers:{'Content-Type':'text/html'}}),response({csrfToken:'c'.repeat(43),expiresAt:null}),new Response('{',{headers:{'Content-Type':'application/json'}})])('rejects malformed sessions (%#)',async result=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(result))
  await expect(createRealAuthClient().getSession()).rejects.toMatchObject({code:'UNAVAILABLE'})
 })
 it('registers the exact DTO and does not grant a session',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(session(false))).mockResolvedValueOnce(response(wireUser,201))
  vi.stubGlobal('fetch',fetcher)
  expect(await createRealAuthClient().register({email:wireUser.email,displayName:'Reader',password:'a'.repeat(12),confirmPassword:'a'.repeat(12)})).toBeNull()
  const options=fetcher.mock.calls[1]![1] as RequestInit
  expect(Object.keys(JSON.parse(String(options.body))).sort()).toEqual(['displayName','email','password'])
  expect(options.credentials).toBe('include')
  expect(new Headers(options.headers).get('Idempotency-Key')).toBeTruthy()
 })
 it('only authenticates after a second server session confirmation',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session(false))).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session())))
  expect(await createRealAuthClient().login({email:wireUser.email,password:'example'})).toMatchObject({source:'backend',user:{id:wireUser.id}})
 })
 it('refuses login when the browser did not retain the cookie',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session(false))).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session(false))))
  await expect(createRealAuthClient().login({email:wireUser.email,password:'example'})).rejects.toMatchObject({code:'UNAVAILABLE'})
 })
 it('does not turn network/server failures into Guest and does not claim logout',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')))
  await expect(createRealAuthClient().getSession()).rejects.toMatchObject({code:'UNAVAILABLE'})
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response(session())).mockRejectedValue(new Error('offline')))
  await expect(createRealAuthClient().logout()).rejects.toMatchObject({code:'UNAVAILABLE'})
 })
 it('ignores an older refresh that completes after logout',async()=>{
  let complete!:(value:Response)=>void
  const pending=new Promise<Response>(resolve=>{complete=resolve})
  vi.stubGlobal('fetch',vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(new Response(null,{status:204})))
  const client=createRealAuthClient(), old=client.getSession()
  const ignored=old.catch(error=>error)
  await client.logout();complete(response(session()))
  expect((await ignored).name).toBe('AbortError')
 })
 it('loads profile ETag and sends a displayName-only PATCH',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(wireUser,200,{ETag:'"1"'})).mockResolvedValueOnce(response({...wireUser,displayName:'New',revision:2},200,{ETag:'"2"'}))
  vi.stubGlobal('fetch',fetcher)
  expect((await createRealAuthClient().updateProfile!('New')).displayName).toBe('New')
  expect(JSON.parse(fetcher.mock.calls[2]![1].body)).toEqual({displayName:'New'})
  expect(new Headers(fetcher.mock.calls[2]![1].headers).get('if-match')).toBe('"1"')
 })
 it('keeps the loaded ETag so a concurrent profile change is reported as a conflict',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(wireUser,200,{ETag:'"1"'})).mockResolvedValueOnce(response({...session(),user:{...wireUser,revision:2}})).mockResolvedValueOnce(response({},412))
  vi.stubGlobal('fetch',fetcher)
  const client=createRealAuthClient()
  await client.getProfile!()
  await expect(client.updateProfile!('New')).rejects.toMatchObject({code:'CONFLICT'})
  expect(new Headers(fetcher.mock.calls[2]![1].headers).get('if-match')).toBe('"1"')
 })
})
