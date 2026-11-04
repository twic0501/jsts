import fs from 'node:fs/promises';
import { MongoClient } from 'mongodb';
const corpus=JSON.parse(await fs.readFile('data/corpus.json','utf8'));
const snapshot=JSON.parse(await fs.readFile('data/semantic-snapshot.json','utf8'));
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/paper_galaxy',{serverSelectionTimeoutMS:4000});
try{await client.connect();const db=client.db();await db.collection('papers').createIndex({id:1},{unique:true});await db.collection('papers').bulkWrite(corpus.papers.map(p=>({replaceOne:{filter:{id:p.id},replacement:p,upsert:true}})));await db.collection('papers').deleteMany({id:{$nin:corpus.papers.map(p=>p.id)}});
await db.collection('embeddings').createIndex({paperId:1},{unique:true});await db.collection('embeddings').bulkWrite(snapshot.papers.map(p=>({replaceOne:{filter:{paperId:p.paperId},replacement:{paperId:p.paperId,textHash:p.textHash,vector:Buffer.from(new Float32Array(p.vector).buffer),point:p.point},upsert:true}})));await db.collection('embeddings').deleteMany({paperId:{$nin:corpus.papers.map(p=>p.id)}});
const{papers:_,...semanticMetadata}=snapshot;await db.collection('datasets').replaceOne({active:true},{active:true,version:corpus.version,title:corpus.title,fetchedAt:corpus.fetchedAt,semantic:semanticMetadata},{upsert:true});console.log('Seeded '+corpus.papers.length+' papers and 384D embeddings into local MongoDB.')}finally{await client.close()}
