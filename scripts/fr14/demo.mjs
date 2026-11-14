// Local, disposable demo. It never accepts a caller-supplied Mongo URI or seeds Documents/mappings.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createServer as probe } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { randomBytes, randomUUID } from 'node:crypto'
import { setTimeout as wait } from 'node:timers/promises'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=path.join(root,'.local/fr14-demo'),stopFile=path.join(folder,'stop'),stateFile=path.join(folder,'state.json')
await fs.mkdir(folder,{recursive:true})
if(process.argv.includes('--stop')){
  const state=JSON.parse(await fs.readFile(stateFile,'utf8'))
  if(state.status!=='running')throw new Error('Demo is not running.')
  await fs.writeFile(stopFile,'stop');console.log('Stop requested for the disposable FR14 demo.');process.exit(0)
}
const apiPort=3341,webPort=5176,tlsPort=5443,origin=`https://localhost:${tlsPort}`
for(const port of [apiPort,webPort,tlsPort]){
  const server=probe();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});await new Promise(resolve=>server.close(resolve))
}
await fs.access(path.join(root,'apps/api/.next/BUILD_ID'))
const key=await fs.readFile(path.join(root,'.local/fr12-browser-tls/key.pem')),cert=await fs.readFile(path.join(root,'.local/fr12-browser-tls/cert.pem'))
await fs.rm(stopFile,{force:true})
let replica,proxy,info,stopping=false
const children=[]
process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true})
function child(args,cwd,overrides={}){
  const env={...process.env}
  for(const name of Object.keys(env))if(name==='MONGODB_URI'||name.startsWith('IDENTITY_')||name.startsWith('BOOKMARK_'))delete env[name]
  const processChild=spawn(process.execPath,args,{cwd,env:{...env,...overrides,NEXT_TELEMETRY_DISABLED:'1'},windowsHide:true,stdio:'ignore'})
  processChild.once('error',()=>{stopping=true});children.push(processChild);return processChild
}
async function ready(url){for(let i=0;i<150;i++){if(stopping||children.some(c=>c.exitCode!==null))throw new Error('Demo child process stopped.');try{if((await fetch(url)).ok)return}catch{}await wait(100)}throw new Error('Demo server did not become ready.')}
try{
  replica=await MongoMemoryReplSet.create({binary:{version:'8.0.16',downloadDir:path.join(root,'.local/fr12-test-mongodb-binaries')},replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1'}})
  const dbName='fr14_demo_'+randomUUID().replaceAll('-',''),uri=replica.getUri(dbName)
  const mongo=new MongoClient(uri);await mongo.connect()
  try{if((await mongo.db().listCollections().toArray()).length)throw new Error('Disposable demo DB must be empty.');await mongo.db().command({ping:1})}finally{await mongo.close()}
  // Reuse the existing legacy Paper seed, exclusively against this newly created empty replica.
  // This creates no canonical Document rows, UUID mapping, or access policy.
  const seed=child(['scripts/seed.mjs'],root,{MONGODB_URI:uri})
  await new Promise((resolve,reject)=>seed.once('exit',code=>code===0?resolve():reject(new Error('Legacy corpus seed failed.'))))
  children.splice(children.indexOf(seed),1)
  const env={NODE_ENV:'production',MONGODB_URI:uri,IDENTITY_MONGODB_DB:dbName,IDENTITY_SECRET:randomBytes(32).toString('base64'),IDENTITY_ALLOWED_ORIGINS:origin,IDENTITY_SESSION_TTL_SECONDS:'3600',IDENTITY_SESSION_SAME_SITE:'Lax',IDENTITY_AUTH_WINDOW_SECONDS:'60',IDENTITY_AUTH_MAX_ATTEMPTS:'100',IDENTITY_AUTH_MAX_CONCURRENT:'4',IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS:'10',IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS:'3600',BOOKMARK_RECEIPT_TTL_SECONDS:'3600',BOOKMARK_CURSOR_TTL_SECONDS:'600'}
  child(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(apiPort)],path.join(root,'apps/api'),env)
  child(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(webPort),'--strictPort'],path.join(root,'apps/web'),{VITE_AUTH_MODE:'real',API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`})
  await Promise.all([ready(`http://127.0.0.1:${apiPort}`),ready(`http://127.0.0.1:${webPort}`)])
  proxy=https.createServer({key,cert},(request,response)=>{
    const upstream=http.request({hostname:'127.0.0.1',port:webPort,path:request.url,method:request.method,headers:request.headers},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response)})
    upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end()});request.pipe(upstream)
  })
  await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(tlsPort,'127.0.0.1',resolve)})
  const corpus=await fetch(`http://127.0.0.1:${apiPort}/api/v1/papers`)
  if(!corpus.ok)throw new Error('Legacy public corpus readiness failed.')
  info={status:'running',pid:process.pid,origin,apiPort,webPort,tlsPort,dbName,startedAt:new Date().toISOString(),fr14:'blocked: authoritative Document adapter and mapping missing'}
  await fs.writeFile(stateFile,JSON.stringify(info,null,2))
  console.log(`Local demo: ${origin} | API 127.0.0.1:${apiPort} | Vite 127.0.0.1:${webPort}`)
  console.log('Mongo replica and legacy public corpus ready. FR12 is real; FR14 writes remain blocked by missing Document/mapping.')
  console.log('No accounts preseeded. Data disappears when stopped. Stop: node scripts/fr14/demo.mjs --stop')
  while(!stopping){try{await fs.access(stopFile);stopping=true}catch{}if(children.some(c=>c.exitCode!==null))throw new Error('Demo server exited.');await wait(500)}
}finally{
  if(proxy?.listening){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
  for(const c of children)if(c.exitCode===null)c.kill()
  await wait(500);await replica?.stop()
  if(info)await fs.writeFile(stateFile,JSON.stringify({...info,status:'stopped'},null,2))
  await fs.rm(stopFile,{force:true})
}
