import fs from'node:fs/promises';
import path from'node:path';
import {createHash}from'node:crypto';
const modelId='Xenova/multilingual-e5-small';
const revision='761b726dd34fb83930e26aab4e9ac3899aa1fa78';
const root=path.resolve('.local/models',modelId);
const files=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx'];
await fs.mkdir(root,{recursive:true});const manifest=[];
for(const name of files){
 const target=path.join(root,name);await fs.mkdir(path.dirname(target),{recursive:true});
 try{await fs.access(target)}catch{
  console.log('Downloading '+name+' at pinned revision '+revision);
  const response=await fetch(`https://huggingface.co/${modelId}/resolve/${revision}/${name}`,{signal:AbortSignal.timeout(240000)});if(!response.ok)throw new Error('Model HTTP '+response.status);
  await fs.writeFile(target+'.partial',new Uint8Array(await response.arrayBuffer()));await fs.rename(target+'.partial',target);
 }
 const data=await fs.readFile(target);manifest.push({file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
 // Both runtimes read precisely these same assets, not separately downloaded revisions.
 const browserTarget=path.resolve('apps/web/public/models',modelId,name);await fs.mkdir(path.dirname(browserTarget),{recursive:true});await fs.copyFile(target,browserTarget);
}
const metadata={modelId,revision,dtype:'q8',dimensions:384,pipelineVersion:'e5-mean-l2-512-v1',files:manifest};
await fs.writeFile('.local/models/manifest.json',JSON.stringify(metadata,null,2));
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/model-manifest.json',JSON.stringify(metadata,null,2));
console.log('Model ready, local assets '+(manifest.reduce((n,f)=>n+f.bytes,0)/1024/1024).toFixed(1)+' MiB');
