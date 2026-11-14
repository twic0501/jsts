import type {CollectionStore} from './store';import type {Paper} from '@paper-galaxy/core';
export const collectionsService=(store:CollectionStore,findPaper:(id:string)=>Promise<{paper:Paper}|null>)=>({
 storage:store.storage,create:(x:{name:string;description?:string|null})=>store.create({name:x.name,description:x.description??null}),list:()=>store.list(),get:(id:string)=>store.get(id),update:(id:string,x:Partial<{name:string;description:string|null}>)=>store.update(id,x),remove:(id:string)=>store.remove(id),
 async add(id:string,paperId:string){if(!await findPaper(paperId))return 'paper_missing' as const;try{return await store.addPaper(id,paperId)}catch(error){if(error instanceof Error&&error.message==='NOT_FOUND')return 'collection_missing' as const;throw error}},removePaper:(id:string,paperId:string)=>store.removePaper(id,paperId),
 async papers(id:string){const ids=await store.papers(id);if(ids===null)return null;const found=await Promise.all(ids.map(findPaper));return found.flatMap(x=>x?[x.paper]:[])},forPaper:(id:string)=>store.forPaper(id)
});
