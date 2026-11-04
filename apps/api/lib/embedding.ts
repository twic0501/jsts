import{Worker}from'node:worker_threads';
import path from'node:path';
let worker:Worker|undefined;
const pending=new Map<string,{resolve:(vectors:number[][])=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
const cache=new Map<string,number[]>();
function getWorker(){
 if(worker)return worker;
 const current=new Worker(path.resolve(process.cwd(),'lib/embedding-worker.mjs'),{workerData:{root:path.resolve(process.cwd(),'../..')}});worker=current;
 current.on('message',(message:{id:string;vectors?:number[][];error?:string})=>{const request=pending.get(message.id);if(!request)return;clearTimeout(request.timer);pending.delete(message.id);if(message.error||!message.vectors){request.reject(new Error('Không chạy được model cục bộ.'));return}request.resolve(message.vectors)});
 const fail=()=>{if(worker!==current)return;for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('Model worker đã dừng.'))}pending.clear();worker=undefined};current.on('error',fail);current.on('exit',fail);return current;
}
export async function embedBatch(texts:string[]):Promise<number[][]>{
 if(!texts.length||texts.length>3||texts.some(text=>!text||text.length>22000))throw new Error('Batch embedding không hợp lệ.');
 const cached=texts.map(text=>cache.get(text));if(cached.every((value):value is number[]=>value!==undefined))return cached;
 if(pending.size>=12)throw new Error('Model đang bận.');const current=getWorker(),id=crypto.randomUUID();
 const vectors=await new Promise<number[][]>((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Model timeout.'))},45000);pending.set(id,{resolve,reject,timer});current.postMessage({id,texts})});
 if(vectors.length!==texts.length||vectors.some(vector=>vector.length!==384||vector.some(x=>!Number.isFinite(x))||Math.abs(Math.hypot(...vector)-1)>.002))throw new Error('Vector model không hợp lệ.');
 vectors.forEach((vector,i)=>{if(cache.size>=600)cache.delete(cache.keys().next().value??'');cache.set(texts[i]!,vector)});return vectors;
}
export async function embedQuery(query:string):Promise<number[]>{return(await embedBatch(['query: '+query]))[0]!}