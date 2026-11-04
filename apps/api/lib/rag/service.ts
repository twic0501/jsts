import type {ResearchRequest,ResearchResponse} from '@paper-galaxy/core';
import {getDataset} from '../repository';
import {embedBatch} from '../embedding';
import {searchProvider} from '../online/providers';
import {generate} from './generation';
import {auditPrompt} from './audit';
import {runResearch} from './search';
import {loadResearchDataset,saveResearch} from './repository';
import {rerankLocal} from './rerank-runtime.mjs';
import path from 'node:path';
const cache=new Map<string,{until:number;response:ResearchResponse}>();
export async function researchSearch(input:ResearchRequest){
 const data=await getDataset(),warnings:string[]=[];let base={corpus:data.corpus,snapshot:data.index.snapshot};
 try{base=await loadResearchDataset(base)}catch{warnings.push('Chưa đọc được bài đã cache trong MongoDB; vẫn tìm trong corpus gốc.')}
 const key=JSON.stringify(input)+base.corpus.version,found=cache.get(key);if(found&&found.until>Date.now())return found.response;
 const response=await runResearch(input,{dataset:async()=>base,embed:embedBatch,provider:searchProvider,generate,audit:auditPrompt,rerank:(query,texts)=>rerankLocal(path.resolve(process.cwd(),'../..'),query,texts)});response.warnings.push(...warnings);
 try{await saveResearch(response)}catch{response.warnings.push('Đã có kết quả; chưa lưu được phiên nghiên cứu vào MongoDB.')}
 if(cache.size>=20)cache.delete(cache.keys().next().value??'');cache.set(key,{until:Date.now()+5*60000,response});return response;
}
