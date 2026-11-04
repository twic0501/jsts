import path from'node:path';
import fs from'node:fs/promises';
import{createHash}from'node:crypto';
import {env,pipeline}from'@huggingface/transformers';
export const MODEL_ID='Xenova/multilingual-e5-small';
let extractorPromise;
export function getExtractor(root){
 if(!extractorPromise){
  env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=path.join(root,'.local/models/');env.useFSCache=false;
  extractorPromise=(async()=>{const manifest=JSON.parse(await fs.readFile(path.join(root,'data/model-manifest.json'),'utf8'));if(manifest.modelId!==MODEL_ID)throw new Error('Model ID mismatch');for(const file of manifest.files){const bytes=await fs.readFile(path.join(root,'.local/models',MODEL_ID,file.file));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Model file integrity mismatch');}return pipeline('feature-extraction',MODEL_ID,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}})})().catch(error=>{extractorPromise=undefined;throw error});
 }
 return extractorPromise;
}
export async function embedTexts(root,texts){const extractor=await getExtractor(root);const output=await extractor(texts,{pooling:'mean',normalize:true});return output.tolist();}
