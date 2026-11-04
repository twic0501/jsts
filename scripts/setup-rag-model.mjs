import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const reranker=process.argv.includes('--reranker'),modelId=reranker?'Xenova/ms-marco-MiniLM-L-6-v2':'onnx-community/Qwen3-0.6B-ONNX',revision=reranker?'a09144355adeed5f58c8ed011d209bf8ee5a1fec':'58ca03a5e7b354b480b1a82b34bde8dc7b854cc0';
const files=reranker?['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx']:['config.json','generation_config.json','tokenizer.json','tokenizer_config.json','onnx/model_q4.onnx'];
const root=path.resolve('.local/models',modelId),manifest=[];
for(const file of files){
 const target=path.join(root,file);await fs.mkdir(path.dirname(target),{recursive:true});
 try{await fs.access(target)}catch{
  console.log('Downloading '+file+' @ '+revision);
  const response=await fetch(`https://huggingface.co/${modelId}/resolve/${revision}/${file}`,{signal:AbortSignal.timeout(240000)});
  if(!response.ok||!response.body)throw new Error('Model download HTTP '+response.status);
  const temporary=target+'.download';await pipeline(Readable.fromWeb(response.body),createWriteStream(temporary));await fs.rename(temporary,target);
 }
 const hash=createHash('sha256');for await(const part of createReadStream(target))hash.update(part);
 manifest.push({file,bytes:(await fs.stat(target)).size,sha256:hash.digest('hex')});
}
await fs.writeFile(reranker?'data/rerank-model-manifest.json':'data/rag-model-manifest.json',JSON.stringify({modelId,revision,dtype:reranker?'q8':'q4',purpose:reranker?'English query-passage relevance reranking':'local query planning and evidence-guided synthesis',files:manifest},null,2));
console.log('Local RAG model ready: '+(manifest.reduce((sum,file)=>sum+file.bytes,0)/1024/1024).toFixed(1)+' MiB');
