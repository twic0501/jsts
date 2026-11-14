import http from'node:http';
import https from'node:https';
import fs from'node:fs';
import path from'node:path';
import{pipeline}from'node:stream';
import{assertProductionTransport}from'./fr12/https-policy.mjs';
const root=path.resolve('apps/web/dist'),host=process.env.SERVER_HOST||'127.0.0.1',port=Number(process.env.SERVER_PORT||'8080'),api=new URL(process.env.API_ORIGIN||'http://127.0.0.1:3001');
if(api.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(api.hostname))throw new Error('API_ORIGIN phải là backend HTTP nội bộ.');
const cert=process.env.TLS_CERT_FILE,key=process.env.TLS_KEY_FILE;
assertProductionTransport({host,cert,key});
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.wasm':'application/wasm','.onnx':'application/octet-stream','.svg':'image/svg+xml','.png':'image/png'};
const hop=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);
function handle(request,response){
 response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('X-Frame-Options','DENY');response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 if(cert)response.setHeader('Strict-Transport-Security','max-age=31536000');
 let url;try{url=new URL(request.url||'/','http://local')}catch{response.writeHead(400).end();return}
 if(url.pathname.startsWith('/api/')){
  if(request.headers.origin&&process.env.PUBLIC_ORIGIN&&request.headers.origin!==process.env.PUBLIC_ORIGIN){response.writeHead(403).end('Origin rejected');return}
  const headers=Object.fromEntries(Object.entries(request.headers).filter(([name])=>!hop.has(name)&&name!=='host'));headers.host=api.host;
  const proxy=http.request(new URL(url.pathname+url.search,api),{method:request.method,headers},upstream=>{if(response.destroyed||response.writableEnded){upstream.destroy();return}try{for(const[name,value]of Object.entries(upstream.headers))if(value!==undefined&&!hop.has(name))response.setHeader(name,value);response.writeHead(upstream.statusCode||502);pipeline(upstream,response,()=>{})}catch{upstream.destroy();response.destroy()}});
  proxy.setTimeout(90000,()=>proxy.destroy(new Error('API timeout')));proxy.on('error',()=>{if(response.destroyed||response.writableEnded)return;if(!response.headersSent)response.writeHead(502,{'Content-Type':'application/json'}).end(JSON.stringify({error:{code:'API_UNAVAILABLE',message:'Backend chưa sẵn sàng.'}}));else response.destroy()});request.on('aborted',()=>proxy.destroy());response.on('close',()=>{if(!response.writableFinished)proxy.destroy()});pipeline(request,proxy,()=>{});return;
 }
 if(!['GET','HEAD'].includes(request.method||'')){response.writeHead(405,{'Allow':'GET, HEAD'}).end();return}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{response.writeHead(400).end();return}
 let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root||pathname.includes('\0')){response.writeHead(403).end();return}
 if(pathname.split('/').some(part=>part.startsWith('.'))){response.writeHead(404).end();return}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html')}catch{if(!path.extname(pathname))file=path.join(root,'index.html');else{response.writeHead(404).end();return}}
 try{const real=fs.realpathSync(file);if(!real.startsWith(root+path.sep)){response.writeHead(403).end();return}const stat=fs.statSync(real),extension=path.extname(real);response.setHeader('Content-Type',types[extension]||'application/octet-stream');response.setHeader('Content-Length',stat.size);response.setHeader('Cache-Control',extension==='.html'||path.basename(real)==='sw.js'?'no-cache':real.includes(path.sep+'assets'+path.sep)?'public,max-age=31536000,immutable':'public,max-age=3600');if(request.method==='HEAD'){response.end();return}pipeline(fs.createReadStream(real),response,()=>{})}catch{response.writeHead(404).end()}
}
const server=cert?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handle):http.createServer(handle);
server.requestTimeout=120000;server.headersTimeout=15000;server.listen(port,host,()=>console.log(`Paper Magic production ${cert?'https':'http'}://${host}:${port} → Next.js ${api.origin}`));
function stop(){server.close(()=>process.exit());setTimeout(()=>process.exit(1),5000).unref()}process.on('SIGINT',stop);process.on('SIGTERM',stop);
