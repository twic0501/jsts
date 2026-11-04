import{parentPort,workerData}from'node:worker_threads';
import{embedTexts}from'./embedding-runtime.mjs';
let queue=Promise.resolve();
parentPort.on('message',message=>{queue=queue.then(async()=>{try{const vectors=await embedTexts(workerData.root,message.texts??['query: '+message.query]);parentPort.postMessage({id:message.id,vector:vectors[0],vectors})}catch(error){parentPort.postMessage({id:message.id,error:error instanceof Error?error.message:'Inference failed'})}})});
