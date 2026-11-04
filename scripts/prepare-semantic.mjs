import fs from'node:fs/promises';
import{createHash}from'node:crypto';
import{embedTexts}from'../apps/api/lib/embedding-runtime.mjs';
import{fitPca3,projectPca}from'../packages/core/src/vector.ts';
const corpus=JSON.parse(await fs.readFile('data/corpus.json','utf8'));
const manifest=JSON.parse(await fs.readFile('data/model-manifest.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const passages=corpus.papers.map(p=>'passage: '+p.title+'\n'+p.abstract);
const vectors=[];const start=performance.now();
for(let i=0;i<passages.length;i+=3){vectors.push(...await embedTexts(process.cwd(),passages.slice(i,i+3)));console.log('Embedded '+Math.min(i+3,passages.length)+'/'+passages.length)}
const projection=fitPca3(vectors,42);
const snapshot={version:'semantic-e5-q8-v1',corpusVersion:corpus.version,createdAt:new Date().toISOString(),corpusHash:hash(JSON.stringify(passages)),model:{id:manifest.modelId,revision:manifest.revision,dtype:manifest.dtype,dimensions:384,pipelineVersion:manifest.pipelineVersion},projection,papers:corpus.papers.map((p,i)=>({paperId:p.id,textHash:hash(passages[i]),vector:vectors[i],point:projectPca(vectors[i],projection)}))};
await fs.writeFile('data/semantic-snapshot.json',JSON.stringify(snapshot)+'\n');
console.log(JSON.stringify({ms:performance.now()-start,explainedVariance:projection.explainedVariance,dimensions:vectors[0].length}));
