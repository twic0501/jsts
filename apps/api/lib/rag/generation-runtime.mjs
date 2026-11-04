import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {env,pipeline} from '@huggingface/transformers';
let generator;
export async function generateLocal(root,messages,maxTokens=180){
 if(!generator){
  env.allowRemoteModels=false;env.allowLocalModels=true;env.useFSCache=false;env.localModelPath=path.join(root,'.local/models/');
  const manifest=JSON.parse(await fs.readFile(path.join(root,'data/rag-model-manifest.json'),'utf8'));
  for(const file of manifest.files){const hash=createHash('sha256');for await(const part of createReadStream(path.join(env.localModelPath,manifest.modelId,file.file)))hash.update(part);if(hash.digest('hex')!==file.sha256)throw new Error('RAG model integrity mismatch');}
  generator=await pipeline('text-generation',manifest.modelId,{dtype:'q4',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 }
 const prompt=generator.tokenizer.apply_chat_template(messages,{tokenize:false,add_generation_prompt:true,enable_thinking:false});
 const result=await generator(prompt,{max_new_tokens:maxTokens,do_sample:false,return_full_text:false});
 const generated=result[0]?.generated_text;
 return typeof generated==='string'?generated:generated?.at(-1)?.content??'';
}
