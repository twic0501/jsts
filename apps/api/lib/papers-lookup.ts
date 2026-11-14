import {getDataset} from './repository';
import {paperSchema,type Paper} from '@paper-galaxy/core';
import {MongoClient} from 'mongodb';
let client:MongoClient|undefined;
export async function findPaper(id:string):Promise<{paper:Paper;datasetVersion:string}|null>{
 const base=await getDataset(),local=base.corpus.papers.find(p=>p.id===id);if(local)return{paper:local,datasetVersion:base.corpus.version};
 if(!process.env.MONGODB_URI)return null;client??=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:2500,maxPoolSize:2});await client.connect();const row=await client.db().collection<{_id:string}>('onlinePapers').findOne({_id:id});if(!row)return null;const {_id,...raw}=row,parsed=paperSchema.safeParse(raw);return parsed.success?{paper:parsed.data,datasetVersion:base.corpus.version}:null;
}
export function getOwnerId(){return 'local';}
