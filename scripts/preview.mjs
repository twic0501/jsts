import {spawn}from'node:child_process';
import path from'node:path';
const children=[spawn(process.execPath,[path.resolve('apps/api/node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3001'],{cwd:path.resolve('apps/api'),stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}}),spawn(process.execPath,[path.resolve('apps/web/node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','5173'],{cwd:path.resolve('apps/web'),stdio:'inherit'})];
let closing=false;function stop(){if(closing)return;closing=true;for(const child of children){if(child.pid&&process.platform==='win32')spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGTERM')}setTimeout(()=>process.exit(),500).unref()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);for(const child of children){child.on('error',stop);child.on('exit',stop)}
