import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import{readFile}from'node:fs/promises';
import path from'node:path';
export default defineConfig({
  plugins: [react(),{name:'local-onnx-assets',configureServer(server){server.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith('/wasm/')){next();return}const filename=new URL(req.url,'http://local').pathname.slice('/wasm/'.length);if(!/^ort-wasm-simd-threaded(?:\.(?:asyncify|jsep|jspi))?\.(?:mjs|wasm)$/.test(filename)){next();return}try{const bytes=await readFile(path.join(server.config.publicDir,'wasm',filename));res.setHeader('Content-Type',filename.endsWith('.wasm')?'application/wasm':'text/javascript');res.end(bytes)}catch{next()}})}}],
  worker:{format:'es'},
  optimizeDeps:{include:['@huggingface/transformers']},
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } } },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: (id) => id.includes('node_modules/three/') || id.includes('node_modules\\three\\') ? 'three' : undefined } } }
});
