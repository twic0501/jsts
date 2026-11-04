import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {ChatMessage} from './generation';
import {PROMPT_VERSION} from './prompts';
let queue=Promise.resolve();
export function auditPrompt(traceId:string,stage:'plan'|'synthesis',messages:ChatMessage[],output:string,accepted:boolean){
 const root=path.resolve(process.cwd(),'../..'),file=path.join(root,'.local/rag-prompts.json');
 const operation=queue.then(async()=>{await fs.mkdir(path.dirname(file),{recursive:true});let previous:unknown=[];try{previous=JSON.parse(await fs.readFile(file,'utf8'))}catch{}
 const rows=Array.isArray(previous)?previous.slice(-49):[];rows.push({traceId,timestamp:new Date().toISOString(),stage,promptVersion:PROMPT_VERSION,model:'onnx-community/Qwen3-0.6B-ONNX',messages,output:output.slice(0,16000),accepted,inputHash:createHash('sha256').update(JSON.stringify(messages)).digest('hex')});
 const temporary=file+'.tmp';await fs.writeFile(temporary,JSON.stringify(rows,null,2));await fs.rename(temporary,file);
 });queue=operation.catch(()=>{});return operation;
}
