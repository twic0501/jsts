// Dedicated local DEVELOPMENT stack. Never connects to a caller-supplied database.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { randomBytes, X509Certificate } from 'node:crypto'
import { createServer } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { setTimeout as wait } from 'node:timers/promises'
import { MongoClient } from 'mongodb'

export const root=fileURLToPath(new URL('../../',import.meta.url))
export const folder=path.join(root,'.local/fr14-persistent')
export const stateFile=path.join(folder,'state.json')
const stopFile=path.join(folder,'stop'), lockFile=path.join(folder,'running.lock')
const dbName='paper_magic_development', replicaSet='pmDevelopment', mongoPort=27114
const apiPort=3342, webPort=5177, tlsPort=5444, origin=`https://localhost:${tlsPort}`
const uri=`mongodb://127.0.0.1:${mongoPort}/${dbName}?replicaSet=${replicaSet}`

async function available(port) {
  const server=createServer()
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})
  await new Promise(resolve=>server.close(resolve))
}
async function until(action, milliseconds=30000) {
  const end=Date.now()+milliseconds
  while(Date.now()<end){try{if(await action())return}catch{}await wait(250)}
  throw new Error('Local development service did not become ready; inspect its local log.')
}
async function stopChild(child) {
  if(!child||child.exitCode!==null||child.signalCode!==null||child.launchFailed)return
  child.kill()
  await until(()=>child.exitCode!==null||child.signalCode!==null,15000)
}

async function certificate() {
  const keyFile=path.join(folder,'key.pem'),certFile=path.join(folder,'cert.pem')
  let existing=await fs.readdir(folder)
  if(!existing.includes('key.pem')&&!existing.includes('cert.pem')){
    const openssl=process.env.PM_DEV_OPENSSL||'C:/Program Files/Git/usr/bin/openssl.exe'
    await fs.access(openssl)
    await new Promise((resolve,reject)=>{
      const child=spawn(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','365','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',keyFile,'-out',certFile],{windowsHide:true,stdio:'ignore'})
      child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Development certificate generation failed.')))
    })
  }
  const key=await fs.readFile(keyFile),cert=await fs.readFile(certFile)
  const parsed=new X509Certificate(cert)
  if(!parsed.checkHost('localhost')||Date.parse(parsed.validTo)<=Date.now())throw new Error('Development certificate expired or invalid; renew the local certificate.')
  return {key,cert}
}

export async function startPersistent({databaseOnly=false}={}) {
  if(process.platform!=='win32'||!process.env.LOCALAPPDATA)throw new Error('This launcher requires Windows LOCALAPPDATA.')
  await fs.mkdir(folder,{recursive:true})
  // Refuse a concurrent/stale lock. Never kill a process based on a saved PID.
  const lock=await fs.open(lockFile,'wx')
  let mongo, proxy, info, stopping=false
  const children=[]
  // Direct connection permits first-start replica initialization before a primary exists.
  const client=new MongoClient(uri,{serverSelectionTimeoutMS:1500,directConnection:true})
  const dataRoot=path.join(process.env.LOCALAPPDATA,'PaperMagic','fr12-fr14-development')
  const dbPath=path.join(dataRoot,'db')
  async function stop() {
    if(stopping)return
    stopping=true
    try {
      if(proxy?.listening){proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve))}
      const results=await Promise.allSettled(children.map(stopChild))
      if(mongo&&mongo.exitCode===null){
        // mongod performs a clean WiredTiger shutdown; do not use taskkill /F.
        try{await client.db('admin').command({shutdown:1})}catch{}
        await until(()=>mongo.exitCode!==null,30000)
      }
      await client.close()
      if(info)await fs.writeFile(stateFile,JSON.stringify({...info,status:'stopped'},null,2))
      if(results.some(result=>result.status==='rejected'))throw new Error('A local application process could not be stopped.')
    } finally {
      await lock.close();await fs.unlink(lockFile)
      await fs.rm(stopFile,{force:true})
    }
  }
  function child(args,cwd,overrides) {
    const env={...process.env}
    for(const name of Object.keys(env))if(name==='MONGODB_URI'||name.startsWith('IDENTITY_')||name.startsWith('BOOKMARK_')||name.startsWith('VITE_AUTH_'))delete env[name]
    const result=spawn(process.execPath,args,{cwd,env:{...env,...overrides,NEXT_TELEMETRY_DISABLED:'1'},windowsHide:true,stdio:'ignore'})
    result.on('error',()=>{result.launchFailed=true});children.push(result);return result
  }
  try {
    for(const port of [mongoPort,...(databaseOnly?[]:[apiPort,webPort,tlsPort])])await available(port)
    const binary=path.join(root,'.local/fr12-test-mongodb-binaries/mongod-x64-win32-8.0.16.exe')
    await fs.access(binary)
    if(!databaseOnly)await fs.access(path.join(root,'apps/api/.next/BUILD_ID'))
    const tls=databaseOnly?undefined:await certificate()
    await fs.mkdir(dataRoot,{recursive:true})
    const ownerFile=path.join(dataRoot,'paper-magic-owner.json')
    const owner={version:1,purpose:'Paper Magic isolated development',database:dbName,replicaSet,port:mongoPort}
    try {
      const existing=JSON.parse(await fs.readFile(ownerFile,'utf8'))
      if(JSON.stringify(existing)!==JSON.stringify(owner))throw new Error('Persistent data directory ownership differs; refusing to reuse it.')
    } catch(error) {
      if(error.code!=='ENOENT')throw error
      if((await fs.readdir(dataRoot)).length)throw new Error('Unowned non-empty data directory; refusing to initialize it.')
      await fs.writeFile(ownerFile,JSON.stringify(owner),{flag:'wx'})
    }
    await fs.mkdir(dbPath,{recursive:true})
    const configFile=path.join(folder,'config.json')
    let config
    try {config=JSON.parse(await fs.readFile(configFile,'utf8'))}
    catch(error){
      if(error.code!=='ENOENT')throw error
      // Losing an existing secret must not silently invalidate all sessions/receipts.
      if((await fs.readdir(dbPath)).length)throw new Error('Existing Mongo data but missing stable identity config; restore config from backup.')
      config={version:1,identitySecret:randomBytes(32).toString('base64')}
      await fs.writeFile(configFile,JSON.stringify(config),{flag:'wx',mode:0o600})
    }
    if(config.version!==1||typeof config.identitySecret!=='string'||Buffer.from(config.identitySecret,'base64').length!==32||Buffer.from(config.identitySecret,'base64').toString('base64')!==config.identitySecret)throw new Error('Invalid persistent identity config; restore it from backup.')
    mongo=spawn(binary,['--dbpath',dbPath,'--port',String(mongoPort),'--bind_ip','127.0.0.1','--replSet',replicaSet,'--logpath',path.join(dataRoot,'mongod.log'),'--logappend'],{windowsHide:true,stdio:'ignore'})
    mongo.on('error',()=>{mongo.launchFailed=true})
    await until(async()=>{if(mongo.launchFailed||mongo.exitCode!==null)throw new Error('Mongo exited');await client.connect();return (await client.db('admin').command({ping:1})).ok===1})
    try{await client.db('admin').command({replSetGetConfig:1})}
    catch(error){
      if(error.code!==94)throw error
      await client.db('admin').command({replSetInitiate:{_id:replicaSet,members:[{_id:0,host:`127.0.0.1:${mongoPort}`}]}})
    }
    await until(async()=>Boolean((await client.db('admin').command({hello:1})).isWritablePrimary))
    const actual=await client.db('admin').command({getCmdLineOpts:1})
    if(path.resolve(actual.parsed.storage.dbPath)!==path.resolve(dbPath)||actual.parsed.replication.replSet!==replicaSet)throw new Error('Unexpected Mongo instance; refusing writes.')
    if(!databaseOnly){
      // Import only into an entirely new dedicated DB. Never update/delete existing corpus or accounts.
      const db=client.db(dbName)
      if((await db.listCollections().toArray()).length===0){
        const corpus=JSON.parse(await fs.readFile(path.join(root,'data/corpus.json'),'utf8'))
        const snapshot=JSON.parse(await fs.readFile(path.join(root,'data/semantic-snapshot.json'),'utf8'))
        const {papers,...semantic}=snapshot
        const session=client.startSession()
        try{await session.withTransaction(async()=>{
          await db.collection('papers').insertMany(corpus.papers,{session})
          await db.collection('embeddings').insertMany(papers.map(p=>({paperId:p.paperId,textHash:p.textHash,vector:Buffer.from(new Float32Array(p.vector).buffer),point:p.point})),{session})
          await db.collection('datasets').insertOne({active:true,version:corpus.version,title:corpus.title,fetchedAt:corpus.fetchedAt,semantic},{session})
        })}finally{await session.endSession()}
      }
      const env={NODE_ENV:'production',MONGODB_URI:uri,IDENTITY_MONGODB_DB:dbName,IDENTITY_SECRET:config.identitySecret,IDENTITY_ALLOWED_ORIGINS:origin,IDENTITY_SESSION_TTL_SECONDS:'86400',IDENTITY_SESSION_SAME_SITE:'Lax',IDENTITY_AUTH_WINDOW_SECONDS:'60',IDENTITY_AUTH_MAX_ATTEMPTS:'100',IDENTITY_AUTH_MAX_CONCURRENT:'4',IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS:'86400',BOOKMARK_RECEIPT_TTL_SECONDS:'86400',BOOKMARK_CURSOR_TTL_SECONDS:'600'}
      child(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(apiPort)],path.join(root,'apps/api'),{...env,PM_API_DOCS:'1'})
      child(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(webPort),'--strictPort'],path.join(root,'apps/web'),{VITE_AUTH_MODE:'real',API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`})
      await until(async()=>{if(children.some(c=>c.launchFailed||c.exitCode!==null))return false;return (await fetch(`http://127.0.0.1:${apiPort}/api/v1/papers`)).ok&&(await fetch(`http://127.0.0.1:${webPort}`)).ok},60000)
      proxy=https.createServer(tls,(request,response)=>{
        const upstream=http.request({hostname:'127.0.0.1',port:webPort,path:request.url,method:request.method,headers:request.headers},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response)})
        upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end()});request.pipe(upstream)
      })
      await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(tlsPort,'127.0.0.1',resolve)})
    }
    await fs.rm(stopFile,{force:true})
    info={status:'running',kind:'persistent-development',pid:process.pid,origin,databaseOnly,dbName,dbPath,mongoPort,apiPort,webPort,tlsPort,startedAt:new Date().toISOString(),fr14:'blocked: authoritative Document adapter and mapping missing'}
    await fs.writeFile(stateFile,JSON.stringify(info,null,2))
    return {info,stop,healthy:()=>mongo.exitCode===null&&!mongo.launchFailed&&children.every(c=>c.exitCode===null&&!c.launchFailed)}
  }catch(error){await stop();throw error}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    if(process.argv.includes('--stop')){
      const state=JSON.parse(await fs.readFile(stateFile,'utf8'))
      if(state.status!=='running'||state.kind!=='persistent-development')throw new Error('Persistent development is not running.')
      await fs.writeFile(stopFile,'stop');console.log('Stop requested. Mongo data and stable configuration are retained.')
    }else{
      const stack=await startPersistent({databaseOnly:process.argv.includes('--mongo-only')})
      console.log(`Persistent development: ${stack.info.databaseOnly?'Mongo only':origin}; database ${dbName}; Mongo 127.0.0.1:${mongoPort}`)
      console.log(`Data: ${stack.info.dbPath}`)
      console.log('FR12 real; FR14 blocked by Document/mapping. Stop: node scripts/fr14/persistent.mjs --stop')
      let stopping=false
      process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true})
      try{while(!stopping){try{await fs.access(stopFile);stopping=true}catch{}if(!stack.healthy())throw new Error('A local child process stopped.');await wait(500)}}finally{await stack.stop()}
    }
  }catch{console.error('Persistent development failed. Check ports, local ownership/configuration and mongod.log; no database is deleted.');process.exitCode=1}
}
