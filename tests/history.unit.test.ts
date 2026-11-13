import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createHistoryService} from '../apps/api/src/modules/personal-library/search-history/history.service';
import {createHistoryController} from '../apps/api/src/modules/personal-library/search-history/history.controller';
import {SearchError} from '../apps/api/src/shared/search-context';
import {fingerprint} from '../apps/api/src/shared/search-fingerprint';
import type {HistoryRepository,SearchHistory,SearchHistoryInput} from '../apps/api/src/modules/personal-library/search-history/history.types';
import {createSearchSubmission,saveAccountHistory,repeatHistory} from '../apps/web/src/features/search/client';

const owner=randomUUID();
function setup(){
 const rows=new Map<string,{owner:string;key:string;hash:string;deleted:boolean;deleteKey?:string;value:SearchHistory}>();
 const repository:HistoryRepository={
  async saveHistory(user,key,input,now){const id=user+input.queryId,old=rows.get(id),hash=fingerprint(input);
   if(old){if(old.hash!==hash||old.key!==key)throw new SearchError(409,'CONFLICT','Conflict');if(old.deleted)throw new SearchError(410,'DELETED','Deleted');return old.value}
   const value={...input,revision:1,updatedAt:now};rows.set(id,{owner:user,key,hash,deleted:false,value});return value},
  async listHistory(user,_cursor,limit){return [...rows.values()].filter(r=>r.owner===user&&!r.deleted).map(r=>r.value).slice(0,limit)},
  async getHistory(user,id){return [...rows.values()].find(r=>r.owner===user&&r.value.id===id&&!r.deleted)?.value??null},
  async deleteHistory(user,id,revision,key){const r=[...rows.values()].find(r=>r.owner===user&&r.value.id===id);if(!r)throw new SearchError(404,'MISSING','Missing');if(r.deleted&&r.deleteKey===key)return;if(r.deleted||r.value.revision!==revision)throw new SearchError(412,'STALE','Stale');r.deleted=true;r.deleteKey=key;r.value.revision++},
 };
 const history=createHistoryService(repository,()=>new Date('2026-11-14T00:00:00Z'));
 const http=createHistoryController({principal:async()=>({id:owner}),authorizeMutation:async()=>{},runtime:async()=>({repository,history})});
 return{rows,repository,history,http};
}
const input=():SearchHistoryInput=>({id:randomUUID(),queryId:randomUUID(),query:'deep learning',filters:{subjects:['ai'],yearFrom:2020}});
it('one submit is one record; a fresh submit with the same query is a new record',async()=>{
 const f=setup(),i=input();expect(await f.history.save(i,i.queryId,{id:owner})).toEqual(await f.history.save(i,i.queryId,{id:owner}));
 await f.history.save(input(),randomUUID(),{id:owner});expect(f.rows.size).toBe(2);
});
it('stores filters/server time and rejects conflicting queryId replay',async()=>{
 const f=setup(),i=input(),row=await f.history.save(i,i.queryId,{id:owner});expect(row.filters).toEqual(i.filters);expect(row.updatedAt).toBe('2026-11-14T00:00:00.000Z');
 await expect(f.history.save({...i,query:'changed'},i.queryId,{id:owner})).rejects.toMatchObject({status:409});
});
it('requires identity and keeps history in its owner namespace',async()=>{
 const f=setup(),i=input();await expect(f.history.save(i,i.queryId,null)).rejects.toMatchObject({status:401});await f.history.save(i,i.queryId,{id:owner});
 expect(await f.repository.getHistory(randomUUID(),i.id)).toBeNull();expect(await f.repository.listHistory(randomUUID(),null,20)).toEqual([]);
});
it('delete retry is safe and old POST cannot resurrect a deleted record',async()=>{
 const f=setup(),i=input();await f.history.save(i,i.queryId,{id:owner});await expect(f.repository.deleteHistory(owner,i.id,2,'del')).rejects.toMatchObject({status:412});
 await f.repository.deleteHistory(owner,i.id,1,'del');await f.repository.deleteHistory(owner,i.id,1,'del');expect(await f.repository.listHistory(owner,null,20)).toEqual([]);
 await expect(f.history.save(i,i.queryId,{id:owner})).rejects.toMatchObject({status:410});
});
it('history HTTP creation returns Location and ETag; delete requires If-Match',async()=>{
 const f=setup(),i=input(),headers={'Content-Type':'application/json','Idempotency-Key':i.queryId};const r=await f.http.createHistory(new Request('http://localhost/api/v4/users/me/search-history',{method:'POST',headers,body:JSON.stringify(i)}));
 expect(r.status).toBe(201);expect(r.headers.get('etag')).toBe('"1"');expect(r.headers.get('location')).toContain(i.id);
 expect((await f.http.deleteHistory(new Request('http://localhost',{method:'DELETE',headers}),i.id)).status).toBe(428);
});
it('existing frontend transport retries stable IDs and re-search creates a fresh ID',async()=>{
 const f=setup(),s=createSearchSubmission('deep learning',{yearFrom:2020});const send=(path:string,init?:RequestInit)=>f.http.createHistory(new Request('http://localhost'+path,init));
 const row=await saveAccountHistory(s,send);await saveAccountHistory(s,send);expect(f.rows.size).toBe(1);const again=repeatHistory(row);expect(again.input.queryId).not.toBe(s.input.queryId);expect(again.input.filters).toEqual(s.input.filters);
});
it('unconfigured FR12 fails closed rather than inventing an account',async()=>{
 const r=await createHistoryController().listHistory(new Request('http://localhost'));expect(r.status).toBe(503);expect(await r.json()).toMatchObject({error:{code:'HISTORY_INTEGRATION_REQUIRED'}});
});
