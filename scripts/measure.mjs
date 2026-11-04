import fs from'node:fs/promises';
const url='http://127.0.0.1:5173/api/v1/search';
const input=JSON.stringify({query:'learning',topK:20});
for(let i=0;i<3;i++)await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:input}).then(r=>r.arrayBuffer());
const samples=[];for(let i=0;i<30;i++){const query='research about learning and biomedical images sample '+i;const start=performance.now();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,topK:20})});const body=await response.arrayBuffer();if(!response.ok||JSON.parse(new TextDecoder().decode(body)).method!=='semantic')throw new Error('Benchmark semantic API failed');samples.push({query,durationMs:performance.now()-start,decodedBytes:body.byteLength,status:response.status});}
const times=samples.map(s=>s.durationMs).sort((a,b)=>a-b);const percentile=p=>times[Math.ceil(p*times.length)-1];
const report={measuredAt:new Date().toISOString(),conditions:'30 sequential local HTTP requests with distinct queries, 3 model warmup calls, corpus 30, real E5 Q8 inference in Node worker plus cosine ranking from MongoDB snapshot. Excludes browser rendering and model cold start. Not a 20,000-paper / 20-VU benchmark.',unit:'milliseconds',p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),maxDecodedBytes:Math.max(...samples.map(s=>s.decodedBytes)),samples};
await fs.writeFile('.local/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({p50:report.p50,p95:report.p95,p99:report.p99,maxDecodedBytes:report.maxDecodedBytes}));
