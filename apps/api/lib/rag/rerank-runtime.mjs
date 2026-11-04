import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AutoTokenizer,AutoModelForSequenceClassification,env} from '@huggingface/transformers';
let resources;
export async function rerankLocal(root,query,texts){
 if(!resources)resources=(async()=>{env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=path.join(root,'.local/models/');env.useFSCache=false;const manifest=JSON.parse(await fs.readFile(path.join(root,'data/rerank-model-manifest.json'),'utf8'));for(const file of manifest.files){const hash=createHash('sha256');for await(const part of createReadStream(path.join(env.localModelPath,manifest.modelId,file.file)))hash.update(part);if(hash.digest('hex')!==file.sha256)throw new Error('Reranker integrity mismatch')}const tokenizer=await AutoTokenizer.from_pretrained(manifest.modelId,{local_files_only:true}),model=await AutoModelForSequenceClassification.from_pretrained(manifest.modelId,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});return{tokenizer,model}})().catch(error=>{resources=undefined;throw error});
 const {tokenizer,model}=await resources,scores=[];
 for(let i=0;i<texts.length;i+=2){const batch=texts.slice(i,i+2),inputs=tokenizer(batch.map(()=>query),{text_pair:batch,padding:true,truncation:true,max_length:384}),output=await model(inputs);scores.push(...Array.from(output.logits.data,Number))}
 if(scores.length!==texts.length||scores.some(x=>!Number.isFinite(x)))throw new Error('Invalid reranker output');return scores;
}
