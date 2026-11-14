import {SearchError} from '../../apps/api/src/modules/search/domain/search.policy';
import type {SearchDocuments,SearchRepository,StoredRun} from '../../apps/api/src/modules/search/ports/search.repository';
// Test-only repository fixture. Application storage is injected by the owning bootstrap.
export function createMemorySearchRepository(documents:SearchDocuments,now=()=>Date.now(),capacity=1000):SearchRepository {
 const runs=new Map<string,StoredRun>();
 const scope=(owner:string|null)=>owner??'public';
 const rowKey=(owner:string|null,query:string)=>`${scope(owner)}:${query}`;
 function prune(){for(const [key,run]of runs)if(Date.parse(run.response.expiresAt)+86400000<=now())runs.delete(key);}
 return {candidates:p=>documents.candidates(p),current:(ids,p)=>documents.current(ids,p),
  async findRun(owner,query){prune();return runs.get(rowKey(owner,query))??null;},
  async getRun(id,owner){prune();return [...runs.values()].find(r=>r.ownerId===owner&&r.response.id===id)??null;},
  async saveRun(run){prune();const key=rowKey(run.ownerId,run.response.queryId),existing=runs.get(key);if(existing)return existing;
   if([...runs.values()].some(r=>r.ownerId===run.ownerId&&r.key===run.key))throw new SearchError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho lượt khác.');
   if(runs.size>=capacity)throw new SearchError(503,'SEARCH_CAPACITY','Bộ nhớ lượt tìm đã đầy. Hãy thử lại sau.');
   runs.set(key,structuredClone(run));return structuredClone(run);
  }};
}
