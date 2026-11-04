import {Worker} from 'node:worker_threads';
import path from 'node:path';
export type ChatMessage={role:'system'|'user';content:string};
let worker:Worker|undefined,busy=false,idle:ReturnType<typeof setTimeout>|undefined;
function getWorker(){if(worker)return worker;const current=new Worker(path.resolve(process.cwd(),'lib/rag/generation-worker.mjs'),{workerData:{root:path.resolve(process.cwd(),'../..')}});worker=current;current.on('error',()=>{if(worker===current)worker=undefined});current.on('exit',()=>{if(worker===current)worker=undefined});return current}
export async function generate(messages:ChatMessage[],maxTokens=180):Promise<string>{
 if(busy)throw new Error('Local generator busy');const current=getWorker();busy=true;if(idle)clearTimeout(idle);
 try{return await new Promise<string>((resolve,reject)=>{
  const id=crypto.randomUUID();
  const cleanup=()=>{clearTimeout(timer);current.off('message',receive);current.off('error',fail);current.off('exit',fail)};
  const fail=()=>{cleanup();worker=undefined;reject(new Error('Local generator unavailable'))};
  const receive=(message:{id:string;text?:string;error?:string})=>{if(message.id!==id)return;cleanup();if(message.error||typeof message.text!=='string')reject(new Error('Local generation failed'));else resolve(message.text)};
  const timer=setTimeout(()=>{cleanup();void current.terminate();worker=undefined;reject(new Error('Local generation timeout'))},45000);
  current.on('message',receive);current.once('error',fail);current.once('exit',fail);current.postMessage({id,messages,maxTokens});
 })}finally{busy=false;idle=setTimeout(()=>{if(worker===current&&!busy){worker=undefined;void current.terminate()}},90000);idle.unref()}
}
