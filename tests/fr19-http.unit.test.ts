import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {documentSearchInputSchema} from '@paper-galaxy/core';
import {createSearchController} from '../apps/api/src/modules/search/presentation/search.controller';
import {createSearchService} from '../apps/api/src/modules/search/application/search.service';
import {SearchError} from '../apps/api/src/shared/search-context';
// Test guard fixture: FR12 supplies the application's real mutation guard.
function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new SearchError(403,'ORIGIN_REJECTED','Fixture rejected origin.');}
import {document,MemoryRepository,principal,other,vector} from './helpers/fr19-fixture';
const input=()=>({queryId:randomUUID(),query:'học máy',topK:20,filters:{kinds:['paper','study']}});
function setup(auth=true){const repository=new MemoryRepository();repository.docs=[document(),document()];repository.docs[1]!.summary.kind='study';repository.docs[1]!.summary.visibility='private';
 const embed=vi.fn(async()=>vector()),service=createSearchService({repository,embed,revisions:async()=>({model:'model-v1',pipeline:'pipeline-v1',projection:'pca-v1'})});
 const controller=createSearchController({principal:async()=>auth?principal:null,authorizeMutation:async r=>sameOrigin(r),runtime:async()=>({service})});
 return{repository,embed,service,controller};}
function request(body:unknown,headers:Record<string,string>={}){return new Request('http://localhost/api/v4/searches',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'key',...headers},body:JSON.stringify(body)});}
describe('FR19 bound HTTP workflow',()=>{
 it('returns paper + own study, exposes Location and supports reading the SearchRun',async()=>{const f=setup(),response=await f.controller.search(request(input()));expect(response.status).toBe(201);const data=await response.json();expect(response.headers.get('location')).toBe(`/api/v4/searches/${data.id}`);expect(data.hits.map((h:{document:{kind:string}})=>h.document.kind).sort()).toEqual(['paper','study']);
  const read=await f.controller.getSearch(new Request('http://localhost'),data.id);expect(read.status).toBe(200);expect((await read.json()).hits).toHaveLength(2);});
 it('guest and forged ownership headers cannot see private study',async()=>{const f=setup(false),response=await f.controller.search(request(input(),{'X-Owner-Id':principal.id}));const data=await response.json();expect(data.hits.map((h:{document:{kind:string}})=>h.document.kind)).toEqual(['paper']);});
 it('filters study-only without falling back to paper',async()=>{const f=setup(),i=input();i.filters.kinds=['study'];const response=await f.controller.search(request(i));expect((await response.json()).hits.every((h:{document:{kind:string}})=>h.document.kind==='study')).toBe(true);});
 it('same submission retries one result; changed payload with same key conflicts',async()=>{const f=setup(),i=input();const a=await(await f.controller.search(request(i))).json(),b=await(await f.controller.search(request(i))).json();expect(a.id).toBe(b.id);expect(f.embed).toHaveBeenCalledOnce();expect((await f.controller.search(request({...i,query:'query khác'}))).status).toBe(409);});
 it('checks current permission when re-reading an existing result',async()=>{const f=setup(),a=await(await f.controller.search(request(input()))).json();f.repository.docs[1]!.ownerId=other;const b=await(await f.controller.getSearch(new Request('http://localhost'),a.id)).json();expect(b.hits).toHaveLength(1);});
 it('rejects wrong media, owner injection, invalid filters and oversized bodies',async()=>{const f=setup();expect((await f.controller.search(request(input(),{'Content-Type':'text/plain'}))).status).toBe(415);expect((await f.controller.search(request({...input(),ownerId:other}))).status).toBe(422);expect((await f.controller.search(request({...input(),filters:{yearFrom:2026,yearTo:2020}}))).status).toBe(422);expect((await f.controller.search(request({query:'a'.repeat(9000)}))).status).toBe(413);});
 it('enforces same-origin before doing embedding',async()=>{const f=setup();expect((await f.controller.search(request(input(),{Origin:'https://other.example'}))).status).toBe(403);expect(f.embed).not.toHaveBeenCalled();});
 it('does not accept missing keys or malformed resource IDs',async()=>{const f=setup();expect((await f.controller.search(request(input(),{'Idempotency-Key':''}))).status).toBe(400);expect((await f.controller.getSearch(new Request('http://localhost'),'bad')).status).toBe(422);});
 it('does not accept arbitrary query vectors or database filters from clients',()=>{expect(documentSearchInputSchema.safeParse({...input(),vector:vector()}).success).toBe(false);expect(documentSearchInputSchema.safeParse({...input(),filters:{$where:'true'}}).success).toBe(false);});
});


it('leaves an unbound v4 route inactive instead of guessing identity or storage',async()=>{
 const {searchController}=await import('../apps/api/src/modules/search/integration');
 const response=await searchController.search(request(input(),{'X-Owner-Id':principal.id}));
 expect(response.status).toBe(503);
 expect(await response.json()).toMatchObject({error:{code:'SEARCH_INTEGRATION_REQUIRED'}});
});

it('lets the owning bootstrap inject the existing identity and search service',async()=>{
 const {configureSearchIntegration,searchController}=await import('../apps/api/src/modules/search/integration');
 const f=setup();
 configureSearchIntegration({principal:async()=>principal,authorizeMutation:async r=>sameOrigin(r),runtime:async()=>({service:f.service})});
 const response=await searchController.search(request(input()));
 expect(response.status).toBe(201);
 expect((await response.json()).hits.map((hit:{document:{kind:string}})=>hit.document.kind).sort()).toEqual(['paper','study']);
});
