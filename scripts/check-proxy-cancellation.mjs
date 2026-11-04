import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
const upstream=http.createServer((request,response)=>{setTimeout(()=>{if(!response.destroyed)response.writeHead(200,{'Content-Type':'application/json'}).end('{"alive":true}')},100)});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');const apiPort=upstream.address().port;
const child=spawn(process.execPath,['scripts/serve-production.mjs'],{env:{...process.env,SERVER_HOST:'127.0.0.1',SERVER_PORT:'8189',API_ORIGIN:'http://127.0.0.1:'+apiPort},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',part=>{output+=part});child.stderr.on('data',part=>{output+=part});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),5000);child.stdout.on('data',()=>{if(output.includes('production http')){clearTimeout(timer);resolve()}});child.once('exit',()=>{clearTimeout(timer);reject(new Error(output))})});
 await Promise.all(Array.from({length:12},()=>new Promise(resolve=>{const request=http.get('http://127.0.0.1:8189/api/test');request.on('error',()=>resolve());request.on('response',response=>response.resume());setTimeout(()=>{request.destroy();resolve()},15)})));
 await new Promise(resolve=>setTimeout(resolve,200));const response=await fetch('http://127.0.0.1:8189/api/health'),body=await response.json();if(response.status!==200||!body.alive||child.exitCode!==null)throw new Error('Proxy failed after cancellation: '+output);
 const report={date:new Date().toISOString(),abortedRequests:12,delayedUpstreamMs:100,survived:true,followupStatus:response.status};await fs.writeFile('.local/proxy-cancellation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{child.kill();upstream.closeAllConnections();upstream.close()}
