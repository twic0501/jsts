import {parentPort,workerData} from 'node:worker_threads';
import {generateLocal} from './generation-runtime.mjs';
let queue=Promise.resolve();
parentPort.on('message',message=>{queue=queue.then(async()=>{try{parentPort.postMessage({id:message.id,text:await generateLocal(workerData.root,message.messages,message.maxTokens)})}catch{parentPort.postMessage({id:message.id,error:'Không chạy được model sinh văn bản cục bộ.'})}})});
