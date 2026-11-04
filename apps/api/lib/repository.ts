import { readFile } from 'node:fs/promises';
import path from 'node:path';
import{createHash}from'node:crypto';
import { MongoClient,Binary } from 'mongodb';
import { corpusSchema, type Corpus, SemanticIndex,validateSnapshot } from '@paper-galaxy/core';
export type StorageMode='json'|'mongodb';
let client:MongoClient|undefined;
let cached:{corpus:Corpus;index:SemanticIndex;storage:StorageMode}|undefined;
let pending:Promise<NonNullable<typeof cached>>|undefined;
export async function getDataset(){
 if(cached)return cached;
 if(pending)return pending;
 pending=(async()=>{
  const uri=process.env.MONGODB_URI;
  let raw:unknown,semanticRaw:unknown;const storage:StorageMode=uri?'mongodb':'json';
  if(uri){
   client??=new MongoClient(uri,{serverSelectionTimeoutMS:2500,maxPoolSize:5});
   await client.connect();const db=client.db();
   const metadata=await db.collection('datasets').findOne({active:true},{projection:{_id:0}});
   if(!metadata)throw new Error('MongoDB chưa có corpus. Chạy pnpm db:seed.');
   const papers=await db.collection('papers').find({},{projection:{_id:0}}).toArray();
   raw={version:metadata.version,title:metadata.title,fetchedAt:metadata.fetchedAt,papers};
   const embeddings=await db.collection('embeddings').find({},{projection:{_id:0}}).toArray();semanticRaw={...metadata.semantic,papers:embeddings.map(e=>{const bytes=e.vector instanceof Binary?Buffer.from(e.vector.buffer):undefined;if(!bytes||bytes.length!==384*4)throw new Error('Mongo vector sai định dạng.');return{paperId:e.paperId,textHash:e.textHash,point:e.point,vector:Array.from({length:384},(_,i)=>bytes.readFloatLE(i*4))}})};
  }else{raw=JSON.parse(await readFile(path.resolve(process.cwd(),'../../data/corpus.json'),'utf8'));semanticRaw=JSON.parse(await readFile(path.resolve(process.cwd(),'../../data/semantic-snapshot.json'),'utf8'));}
  const corpus=corpusSchema.parse(raw);const snapshot=validateSnapshot(corpus,semanticRaw);
  for(const paper of corpus.papers){const hash=createHash('sha256').update('passage: '+paper.title+'\n'+paper.abstract).digest('hex');if(snapshot.papers.find(p=>p.paperId===paper.id)?.textHash!==hash)throw new Error('Nội dung paper không khớp embedding.');}
  const manifest=JSON.parse(await readFile(path.resolve(process.cwd(),'../../data/model-manifest.json'),'utf8'));if(snapshot.model.revision!==manifest.revision||snapshot.model.pipelineVersion!==manifest.pipelineVersion)throw new Error('Model revision không khớp vector.');
  const result={corpus,index:new SemanticIndex(corpus,snapshot),storage};cached=result;return result;
 })();
 try{return await pending}finally{pending=undefined}
}
