import{embedTexts}from'../apps/api/lib/embedding-runtime.mjs';
const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('External network is disabled for this inference check')};
try{const started=performance.now();const vectors=await embedTexts(process.cwd(),['query: phát hiện tế bào trong ảnh y sinh','passage: Biomedical image segmentation with neural networks']);console.log(JSON.stringify({dimensions:vectors.map(v=>v.length),norms:vectors.map(v=>Math.hypot(...v)),ms:performance.now()-started}));}finally{globalThis.fetch=originalFetch}
