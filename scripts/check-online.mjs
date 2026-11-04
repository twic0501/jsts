import fs from'node:fs/promises';
import{MongoClient}from'mongodb';
await fs.mkdir('.local',{recursive:true});
const started=performance.now(),response=await fetch((process.env.PAPER_MAGIC_URL||'http://127.0.0.1:5173')+'/api/v2/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'graph neural networks',scope:'online',topK:8}),signal:AbortSignal.timeout(90000)}),text=await response.text();
if(!response.ok)throw new Error('Online search HTTP '+response.status+': '+text.slice(0,300));
const result=JSON.parse(text),ids=result.result.items.map(hit=>hit.paper.id);if(!ids.length||!ids.some(id=>!/^\d{4}\./.test(id)||!['2103.00020','1512.03385','1706.03762'].includes(id)))throw new Error('Nguồn không có bài để kiểm tra.');
if(result.dataset.snapshot.papers.some(p=>p.vector.length!==384||Math.abs(Math.hypot(...p.vector)-1)>.002))throw new Error('Sai vector');
let mongoCount=null;const uri=process.env.MONGODB_URI;if(uri){const client=new MongoClient(uri);try{await client.connect();mongoCount=await client.db().collection('onlinePapers').countDocuments();}finally{await client.close()}}
await fs.writeFile('.local/live-online.json',text);const report={measuredAt:new Date().toISOString(),http:response.status,query:'graph neural networks',durationMs:performance.now()-started,decodedBytes:Buffer.byteLength(text),sources:result.providers,storage:result.storage,mongoCount,paperCount:result.result.total,top:result.result.items.slice(0,3).map(h=>({id:h.paper.id,title:h.paper.title,cosine:h.score,sourceUrl:h.paper.sourceUrl})),vectorDimensions:384,modelTrainedByUs:false,warnings:result.warnings};await fs.writeFile('.local/online-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
