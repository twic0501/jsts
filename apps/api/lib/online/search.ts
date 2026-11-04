import{createHash}from'node:crypto';
import{MongoClient}from'mongodb';
import{SemanticIndex,embeddingText,projectPca,onlineSearchSchema,type DatasetBundle,type OnlineResponse,type Paper}from'@paper-galaxy/core';
import{getDataset}from'../repository';
import{embedBatch,embedQuery}from'../embedding';
import{searchProvider,deduplicatePapers}from'./providers';
type Input=ReturnType<typeof onlineSearchSchema.parse>;
type Dependencies={dataset:()=>Promise<DatasetBundle>;query:(query:string)=>Promise<number[]>;passages:(texts:string[])=>Promise<number[][]>;provider:typeof searchProvider};
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export async function runOnlineSearch(input:Input,deps:Dependencies):Promise<OnlineResponse>{
 const started=performance.now(),base=await deps.dataset();const [queryVector,sources]=await Promise.all([deps.query(input.query),Promise.all([deps.provider('arxiv',input.query),deps.provider('openalex',input.query)])]);
 const matches=(p:Paper)=>!input.group||p.group===input.group;
 const candidates=Array.from({length:8},(_,i)=>sources.flatMap(source=>source.papers[i]?[source.papers[i]!]:[])).flat();
 const fresh=deduplicatePapers(candidates,base.corpus.papers).filter(p=>matches(p)&&(input.yearFrom===undefined||p.year>=input.yearFrom)&&(input.yearTo===undefined||p.year<=input.yearTo)).slice(0,12);
 const embeddings=[];for(let i=0;i<fresh.length;i+=2){const papers=fresh.slice(i,i+2),vectors=await deps.passages(papers.map(embeddingText));if(vectors.length!==papers.length)throw new Error('Thiếu vector bài mới.');for(let j=0;j<papers.length;j++){const paper=papers[j]!,vector=vectors[j]!;embeddings.push({paperId:paper.id,textHash:hash(embeddingText(paper)),vector,point:projectPca(vector,base.snapshot.projection)})}}
 const papers=[...base.corpus.papers,...fresh],version='online-'+hash(papers.map(p=>p.id).join('|')).slice(0,16),corpus={...base.corpus,version,title:'Thư viện và kết quả trực tuyến',fetchedAt:new Date().toISOString(),papers},snapshot={...base.snapshot,corpusVersion:version,createdAt:new Date().toISOString(),corpusHash:hash(papers.map(embeddingText).join('\n')),papers:[...base.snapshot.papers,...embeddings]};
 const index=new SemanticIndex(corpus,snapshot),searchInput={query:input.query,topK:50,...(input.group?{group:input.group}:{}),...(input.yearFrom!==undefined?{yearFrom:input.yearFrom}:{}),...(input.yearTo!==undefined?{yearTo:input.yearTo}:{})},result=index.search(searchInput,queryVector);
 const externalIds=new Set(sources.flatMap(source=>source.papers.map(p=>p.id))),eligible=result.items.filter(hit=>input.scope==='combined'||externalIds.has(hit.paper.id));result.total=eligible.length;result.items=eligible.slice(0,input.topK);result.queryPoint=index.projectQuery(queryVector);result.durationMs=performance.now()-started;
 const warnings=sources.filter(source=>source.status.status==='error'||source.status.status==='rate-limited').map(source=>source.status.provider+': '+source.status.message);if(fresh.some(p=>p.provenance?.abstractAvailable===false))warnings.push('Một số bài thiếu abstract: chỉ tính vector từ tiêu đề.');
 return{dataset:{corpus,snapshot},result,providers:sources.map(source=>source.status),scope:input.scope,ranking:'e5-cosine-384d',storage:'memory',warnings};
}
let mongo:MongoClient|undefined;
export async function onlineSearch(input:Input):Promise<OnlineResponse>{
 const result=await runOnlineSearch(input,{dataset:async()=>{const data=await getDataset();return{corpus:data.corpus,snapshot:data.index.snapshot}},query:embedQuery,passages:embedBatch,provider:searchProvider});
 if(process.env.MONGODB_URI){try{mongo??=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:2500,maxPoolSize:3});await mongo.connect();const db=mongo.db(),papers=result.dataset.corpus.papers.filter(p=>p.provenance);if(papers.length){await db.collection<Paper&{_id:string}>('onlinePapers').bulkWrite(papers.map(paper=>({replaceOne:{filter:{_id:paper.id},replacement:{_id:paper.id,...paper},upsert:true}})));const ids=new Set(papers.map(p=>p.id));await db.collection<{_id:string;paperId:string;textHash:string;vector:number[];point:{x:number;y:number;z:number};modelRevision:string}>('onlineEmbeddings').bulkWrite(result.dataset.snapshot.papers.filter(p=>ids.has(p.paperId)).map(p=>({replaceOne:{filter:{_id:p.paperId},replacement:{_id:p.paperId,...p,modelRevision:result.dataset.snapshot.model.revision},upsert:true}})))}result.storage='mongodb'}catch{result.warnings.push('Kết quả đang có trong phiên; chưa lưu được vào MongoDB.')}}
 return result;
}
