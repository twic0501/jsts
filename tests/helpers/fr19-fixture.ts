import {createHash,randomUUID} from 'node:crypto';
import type {IndexedDocument} from '../../apps/api/src/modules/search/domain/search.policy';
import type {SearchRepository,StoredRun} from '../../apps/api/src/modules/search/ports/search.repository';
import type {Principal} from '../../apps/api/src/shared/search-context';
import {createMemorySearchRepository} from './fr19-memory-repository';
export const owner='11111111-1111-4111-a111-111111111111',other='22222222-2222-4222-a222-222222222222';
export const principal={id:owner};
export const vector=(axis=0)=>Array.from({length:384},(_,i)=>i===axis?1:0);
export function document(overrides:Partial<IndexedDocument>={}):IndexedDocument{
 return {summary:{id:randomUUID(),kind:'paper',title:'Neural networks',authors:['Author'],year:2024,subjects:['ai'],primarySubject:'ai',visibility:'public',activeVersionId:randomUUID(),coverage:'abstract',indexStatus:'ready',revision:1,updatedAt:'2026-11-13T00:00:00.000Z'},
 ownerId:owner,deleted:false,chunkId:randomUUID(),text:'A source excerpt about neural networks.',textHash:createHash('sha256').update('passage: Neural networks\nA source excerpt about neural networks.').digest('hex'),page:null,section:'Abstract',vector:vector(),modelRevision:'model-v1',pipelineRevision:'pipeline-v1',...overrides};
}
export class MemoryRepository implements SearchRepository{
 docs:IndexedDocument[]=[];
 private storage=createMemorySearchRepository({candidates:async()=>this.docs,current:async ids=>this.docs.filter(d=>ids.includes(d.summary.id))});
 async candidates(_p:Principal){return structuredClone(this.docs);}
 async current(ids:string[],_p:Principal){return structuredClone(this.docs.filter(d=>ids.includes(d.summary.id)));}
 findRun(ownerId:string|null,queryId:string){return this.storage.findRun(ownerId,queryId);}
 getRun(id:string,ownerId:string|null){return this.storage.getRun(id,ownerId);}
 saveRun(run:StoredRun){return this.storage.saveRun(run);}
}
