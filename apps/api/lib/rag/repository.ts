import {MongoClient} from 'mongodb';
import {validateBundle,paperSchema,type DatasetBundle,type Paper,type ResearchResponse} from '@paper-galaxy/core';
let client:MongoClient|undefined;
async function database(){if(!process.env.MONGODB_URI)return null;client??=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:2500,maxPoolSize:2});await client.connect();return client.db()}
export async function loadResearchDataset(base:DatasetBundle):Promise<DatasetBundle>{
 const db=await database();if(!db)return base;
 const raw=await db.collection('onlinePapers').find({}).sort({'provenance.fetchedAt':-1}).limit(60).toArray(),originalIds=new Set(base.corpus.papers.map(p=>p.id)),papers:Paper[]=[];
 for(const row of raw){const {_id,...rest}=row;const parsed=paperSchema.safeParse(rest);if(parsed.success&&!originalIds.has(parsed.data.id))papers.push(parsed.data)}
 if(!papers.length)return base;
 const vectors=await db.collection('onlineEmbeddings').find({paperId:{$in:papers.map(p=>p.id)},modelRevision:base.snapshot.model.revision}).toArray(),byId=new Map(vectors.map(({_id,modelRevision,...row})=>[row.paperId,row]));
 const valid=papers.filter(p=>byId.has(p.id)),version=base.corpus.version+'-mongo-'+valid.map(p=>p.id).sort().join('-');
 return validateBundle({corpus:{...base.corpus,version,papers:[...base.corpus.papers,...valid]},snapshot:{...base.snapshot,corpusVersion:version,papers:[...base.snapshot.papers,...valid.map(p=>byId.get(p.id))]}});
}
export async function saveResearch(response:ResearchResponse){
 const db=await database();if(!db)return;
 const papers=response.dataset.corpus.papers.filter(p=>p.provenance),ids=new Set(papers.map(p=>p.id));
 if(papers.length){await db.collection<Paper&{_id:string}>('onlinePapers').bulkWrite(papers.map(p=>({replaceOne:{filter:{_id:p.id},replacement:{_id:p.id,...p},upsert:true}})));await db.collection<{_id:string;paperId:string;vector:number[];point:{x:number;y:number;z:number};textHash:string;modelRevision:string}>('onlineEmbeddings').bulkWrite(response.dataset.snapshot.papers.filter(p=>ids.has(p.paperId)).map(p=>({replaceOne:{filter:{_id:p.paperId},replacement:{_id:p.paperId,...p,modelRevision:response.dataset.snapshot.model.revision},upsert:true}})))}
 await db.collection('ragRuns').updateOne({traceId:response.research.traceId},{$set:{traceId:response.research.traceId,query:response.research.query,plan:response.research.plan,mode:response.research.mode,evidence:response.research.evidence,claims:response.research.claims,createdAt:new Date(),expiresAt:new Date(Date.now()+7*86400000)}},{upsert:true});
 await db.collection('ragRuns').createIndex({expiresAt:1},{expireAfterSeconds:0});response.storage='mongodb';
}
