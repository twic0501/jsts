import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash}from'node:crypto';
const folder=path.resolve('apps/web/dist');
async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});const lists=await Promise.all(entries.map(async e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(folder,path.join(dir,e.name)).replaceAll('\\','/')]));return lists.flat();}
const files=(await walk(folder)).filter(f=>!f.endsWith('.map')&&f!=='sw.js');
const version=createHash('sha256').update(await fs.readFile(path.join(folder,'index.html'))).digest('hex').slice(0,12);
const sw=`const CACHE='paper-magic-${version}-v2';
const ASSETS=${JSON.stringify(files.map(f=>'/'+f))};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('paper-magic-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type!=='offline-status')return;event.waitUntil((async()=>{const cache=await caches.open(CACHE);let missing=(await Promise.all(ASSETS.map(async url=>await cache.match(url,{ignoreVary:true})?null:url))).filter(Boolean);if(missing.length){try{await cache.addAll(missing.map(url=>new Request(url,{cache:'reload'})));missing=[]}catch{}}event.ports[0]?.postMessage({ready:missing.length===0,version:CACHE,missing})})())});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;if(event.request.mode==='navigate'){event.respondWith((async()=>{try{return await fetch(event.request)}catch{const cache=await caches.open(CACHE);return await cache.match('/index.html',{ignoreVary:true})||new Response('Chưa cài đủ dữ liệu offline. Mở trang có mạng một lần để cài lại.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}})());return;}event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request)));});
`;
await fs.writeFile(path.join(folder,'sw.js'),sw);console.log('Offline shell: '+files.length+' local assets, cache '+version);
