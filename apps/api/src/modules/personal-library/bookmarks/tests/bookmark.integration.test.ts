import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { MongoClient, type Db } from 'mongodb'
import path from 'node:path'
import { MongoIdentityRepository } from '../../../identity/infrastructure/mongo-identity.repository'
import { authenticationFixture, post, testConfig } from '../../../identity/tests/authentication.fixtures'
import { MongoBookmarkRepository } from '../infrastructure/mongo-bookmark.repository'
import { createBookmarkModule } from '../bookmark.module'
import { BookmarkCursor } from '../application/bookmark.cursor'
import type { DocumentAccess } from '../ports/document-access'
import { unavailable } from '../domain/bookmark.entity'
// Explicit Document-port fixture, NOT a production Document implementation or seeded Document DB.
const readable=new Map<string,Set<string>|null>()
const documents:DocumentAccess={async ready(){},async readable(user,id){return readable.has(id)&&(readable.get(id)===null||readable.get(id)!.has(user))}}
const dbName='fr14_test_'+randomUUID().replaceAll('-',''),secret=randomBytes(32)
let replica:MongoMemoryReplSet,client:MongoClient,db:Db,identity:MongoIdentityRepository,repository:MongoBookmarkRepository
let auth:ReturnType<typeof authenticationFixture>,bookmarks:ReturnType<typeof createBookmarkModule>,now:Date
let a:{id:string;token:string;csrf:string},b:typeof a
const publicOne='00000000-0000-4000-8000-000000000001',publicTwo='00000000-0000-4000-8000-000000000002',privateOne='00000000-0000-4000-8000-000000000003'
const fingerprint=(purpose:string,value:string)=>createHmac('sha256',secret).update(JSON.stringify([purpose,value])).digest('base64url')
// Use the same Origin validator as the live composition root.
import { assertAllowedOrigin } from '../../../identity/presentation/identity.validation'
function configure(access=documents,fp=fingerprint){
  return createBookmarkModule({authorization:auth.authorization,origin:r=>assertAllowedOrigin(r,testConfig(replica.getUri(),dbName)),dependencies:{authorization:auth.authorization,repository,documents:access,cursor:new BookmarkCursor(secret,60),fingerprint:fp,receiptTtlSeconds:3600,now:()=>now}})
}
async function account(email:string){
  const password='isolated-fr14-test-passphrase'
  const registered=await auth.controller.registerUser(post('/api/v4/users',{email,password,displayName:'FR14 Test'},{'Idempotency-Key':randomUUID()}))
  expect(registered.status).toBe(201)
  const id=(await registered.json()).id as string
  const response=await auth.controller.createSession(post('/api/v4/sessions',{email,password})),body=await response.json()
  const token=response.headers.get('set-cookie')!.match(/^__Host-pm_session=([^;]+)/)![1]!
  return {id,token,csrf:body.csrfToken as string}
}
function req(method:string,user:typeof a|undefined=a,id=publicOne,headers:Record<string,string>={},body:unknown={saved:true}){
  return new Request('https://paper.test/api/v4/users/me/bookmarks/'+id,{method,headers:{Origin:'https://paper.test',...(user?{Cookie:`__Host-pm_session=${user.token}`,'X-CSRF-Token':user.csrf}:{}),'Content-Type':'application/json','Idempotency-Key':randomUUID(),...headers},...(method==='PUT'?{body:JSON.stringify(body)}:{})})
}
function list(user:typeof a|undefined=a,query=''){
  return bookmarks.controller.list(new Request('https://paper.test/api/v4/users/me/bookmarks'+query,{headers:user?{Cookie:`__Host-pm_session=${user.token}`}:{}}))
}
async function put(id=publicOne,user=a,key:string=randomUUID(),precondition:Record<string,string>={'If-None-Match':'*'}){return bookmarks.controller.put(req('PUT',user,id,{'Idempotency-Key':key,...precondition}),id)}
beforeAll(async()=>{
  replica=await MongoMemoryReplSet.create({binary:{version:'8.0.16',downloadDir:path.resolve('.local/fr12-test-mongodb-binaries')},replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}})
  client=new MongoClient(replica.getUri());await client.connect();db=client.db(dbName)
  identity=new MongoIdentityRepository(replica.getUri(),dbName);repository=new MongoBookmarkRepository(replica.getUri(),dbName)
  await identity.findById(randomUUID());await repository.ready()
})
beforeEach(async()=>{
  await Promise.all(['identity_users','identity_sessions','identity_registration_receipts','identity_auth_limits','personal_bookmarks','personal_bookmark_receipts'].map(name=>db.collection(name).deleteMany({})))
  now=new Date();auth=authenticationFixture(identity,testConfig(replica.getUri(),dbName),{now:()=>now})
  a=await account('a@example.test');b=await account('b@example.test')
  readable.clear();readable.set(publicOne,null);readable.set(publicTwo,null);readable.set(privateOne,new Set([a.id]));bookmarks=configure()
})
afterAll(async()=>{await repository?.close();await identity?.close();await client?.close();await replica?.stop()})
describe('FR14 + real FR12 + isolated Mongo, fixture Document boundary',()=>{
  it('returns 401 for Guest, forged and expired sessions before any bookmark access',async()=>{
    const guest=await bookmarks.controller.list(new Request('https://paper.test/api/v4/users/me/bookmarks'))
    expect(guest.status).toBe(401)
    expect((await bookmarks.controller.put(req('PUT',{...a,token:'x'.repeat(43)}),publicOne)).status).toBe(401)
    now=new Date(now.getTime()+3600001)
    expect((await list()).status).toBe(401)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'If-Match':'"1"'}),publicOne)).status).toBe(401)
    expect(await db.collection('personal_bookmarks').countDocuments()).toBe(0)
  })
  it('creates/reads/updates/deletes a bookmark, preserving revision against ABA',async()=>{
    const first=await put();expect(first.status).toBe(200);expect(first.headers.get('etag')).toBe('"1"')
    const original=await first.json();expect(Object.keys(original).sort()).toEqual(['documentId','id','revision','saved','updatedAt'])
    const page=await list();expect(page.headers.get('cache-control')).toBe('private, no-store');expect((await page.json()).items).toHaveLength(1)
    expect((await put(publicOne,a,randomUUID(),{'If-Match':'"1"'})).status).toBe(200)
    const key=randomUUID(),del=req('DELETE',a,publicOne,{'Idempotency-Key':key,'If-Match':'"2"'})
    expect((await bookmarks.controller.remove(del,publicOne)).status).toBe(204)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'Idempotency-Key':key,'If-Match':'"2"'}),publicOne)).status).toBe(204)
    expect((await (await list()).json()).items).toEqual([])
    const revived=await put();expect(revived.status).toBe(200);expect((await revived.json()).revision).toBe(4)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'If-Match':'"1"'}),publicOne)).status).toBe(412)
    expect(await db.collection('personal_bookmarks').countDocuments({ownerId:a.id,documentId:publicOne})).toBe(1)
  })
  it('replays one key and rejects changed precondition/method/document or extra owner fields',async()=>{
    const key=randomUUID();expect((await put(publicOne,a,key)).status).toBe(200)
    expect((await put(publicOne,a,key)).status).toBe(200)
    expect((await put(publicOne,a,key,{'If-Match':'"1"'})).status).toBe(409)
    expect((await put(publicTwo,a,key)).status).toBe(409)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'Idempotency-Key':key,'If-Match':'"1"'}),publicOne)).status).toBe(409)
    expect((await bookmarks.controller.put(req('PUT',a,publicTwo,{'If-None-Match':'*'},{saved:true,ownerId:b.id}),publicTwo)).status).toBe(422)
    expect((await bookmarks.controller.put(req('PUT',a,publicTwo,{'If-None-Match':'*'},{saved:false}),publicTwo)).status).toBe(422)
  })
  it('isolates two owners even when they save the same public document',async()=>{
    expect((await put()).status).toBe(200)
    expect((await (await list(b)).json()).items).toHaveLength(0)
    expect((await bookmarks.controller.remove(req('DELETE',b,publicOne,{'If-Match':'"1"'}),publicOne)).status).toBe(404)
    expect((await put(publicOne,b)).status).toBe(200)
    expect(await db.collection('personal_bookmarks').countDocuments({documentId:publicOne})).toBe(2)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'If-Match':'"1"'}),publicOne)).status).toBe(204)
    expect((await (await list(b)).json()).items).toHaveLength(1)
  })
  it('rejects missing/private documents and filters newly revoked access on reads',async()=>{
    expect((await put(randomUUID())).status).toBe(404)
    expect((await put(privateOne,b)).status).toBe(404)
    expect((await put(privateOne,a)).status).toBe(200)
    readable.set(privateOne,new Set())
    expect((await (await list(a)).json()).items).toEqual([])
    expect((await bookmarks.controller.remove(req('DELETE',a,privateOne,{'If-Match':'"1"'}),privateOne)).status).toBe(404)
  })
  it('serializes concurrent retries and distinct-key creates without duplicates',async()=>{
    const key=randomUUID(),responses=await Promise.all([put(publicOne,a,key),put(publicOne,a,key)])
    expect(responses.map(r=>r.status)).toEqual([200,200])
    const races=await Promise.all([put(publicTwo),put(publicTwo)])
    expect(races.map(r=>r.status).sort()).toEqual([200,412])
    expect(await db.collection('personal_bookmarks').countDocuments({ownerId:a.id})).toBe(2)
  })
  it('binds encrypted cursors to owner/limit and rejects tampering/expiry',async()=>{
    await put(publicOne);await put(publicTwo)
    const first=await (await list(a,'?limit=1')).json();expect(first.items[0].documentId).toBe(publicOne);expect(first.nextCursor).toBeTruthy()
    expect((await (await list(a,'?limit=1&cursor='+first.nextCursor)).json()).items[0].documentId).toBe(publicTwo)
    expect((await list(b,'?limit=1&cursor='+first.nextCursor)).status).toBe(422)
    expect((await list(a,'?limit=2&cursor='+first.nextCursor)).status).toBe(422)
    const bytes=Buffer.from(first.nextCursor,'base64url');bytes[30]=bytes[30]!^1
    expect((await list(a,'?limit=1&cursor='+bytes.toString('base64url'))).status).toBe(422)
    now=new Date(now.getTime()+60001)
    expect((await list(a,'?limit=1&cursor='+first.nextCursor)).status).toBe(410)
    expect((await list(a,'?limit=201')).status).toBe(422)
    expect((await list(a,'?ownerId='+b.id)).status).toBe(422)
  })
  it('enforces UUID, Origin, CSRF and strong preconditions',async()=>{
    expect((await bookmarks.controller.put(req('PUT',a,'arxiv-id',{'If-None-Match':'*'}),'arxiv-id')).status).toBe(422)
    expect((await bookmarks.controller.put(req('PUT',a,publicOne),publicOne)).status).toBe(428)
    expect((await put(publicOne,a,randomUUID(),{'If-Match':'W/"1"'})).status).toBe(422)
    expect((await put(publicOne,a,randomUUID(),{'If-Match':'"1"','If-None-Match':'*'})).status).toBe(422)
    expect((await put(publicOne,a,'not-uuid')).status).toBe(422)
    expect((await bookmarks.controller.put(req('PUT',a,publicOne,{'If-None-Match':'*',Origin:'https://foreign.test'}),publicOne)).status).toBe(403)
    expect((await bookmarks.controller.put(req('PUT',a,publicOne,{'If-None-Match':'*','X-CSRF-Token':'invalid'}),publicOne)).status).toBe(403)
  })
  it('rolls back bookmark state if the actual receipt write fails',async()=>{
    bookmarks=configure(documents,(purpose,value)=>purpose==='fr14:bookmark-request'?'forced':fingerprint(purpose,value))
    await put(publicOne)
    const receipts=db.collection('personal_bookmark_receipts')
    await receipts.createIndex({fingerprint:1},{unique:true,name:'test_force_receipt_failure'})
    try{expect((await put(publicTwo)).status).toBe(503);expect(await db.collection('personal_bookmarks').countDocuments({documentId:publicTwo})).toBe(0)}
    finally{await receipts.dropIndex('test_force_receipt_failure')}
  })
  it('fails closed when Document dependency is missing, without creating bookmark state',async()=>{
    bookmarks=configure({async ready(){throw unavailable()},async readable(){throw unavailable()}})
    expect((await list()).status).toBe(503);expect((await put()).status).toBe(503)
    expect(await db.collection('personal_bookmarks').countDocuments()).toBe(0)
  })
  it('rejects the revoked FR12 session after actual logout',async()=>{
    await put()
    expect((await auth.controller.deleteCurrentSession(req('DELETE'))).status).toBe(204)
    expect((await list()).status).toBe(401)
    expect((await bookmarks.controller.remove(req('DELETE',a,publicOne,{'If-Match':'"1"'}),publicOne)).status).toBe(401)
    expect(await db.collection('personal_bookmarks').countDocuments({ownerId:a.id,saved:true})).toBe(1)
  })
})
