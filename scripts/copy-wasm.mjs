import fs from'node:fs/promises';
import path from'node:path';
const store=path.resolve('node_modules/.pnpm');const entries=await fs.readdir(store);const pkg=entries.find(n=>n.startsWith('onnxruntime-web@'));if(!pkg)throw new Error('Missing onnxruntime-web');
const dir=path.join(store,pkg,'node_modules/onnxruntime-web/dist');await fs.mkdir('apps/web/public/wasm',{recursive:true});
for(const name of await fs.readdir(dir)){if(name.endsWith('.wasm')||name.startsWith('ort-wasm')&&name.endsWith('.mjs')){await fs.copyFile(path.join(dir,name),path.resolve('apps/web/public/wasm',name));console.log('Local WASM '+name)}}
