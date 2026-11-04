import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const backendPort=process.env.API_PORT||'3001';
if(backendPort!=='3001')throw new Error('Bản cơ bản dùng API_PORT=3001 để khớp proxy Vite.');
const children=[
 spawn(process.execPath,[path.join(root,'apps/api/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',backendPort],{cwd:path.join(root,'apps/api'),stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}}),
 spawn(process.execPath,[path.join(root,'apps/web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',process.env.WEB_PORT||'5173'],{cwd:path.join(root,'apps/web'),stdio:'inherit'})
];
let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children){if(child.pid){if(process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGTERM');}}setTimeout(()=>process.exit(code),500).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const child of children){child.on('error',e=>{console.error(e.message);stop(1)});child.on('exit',code=>{if(!closing)stop(code||0)});}
