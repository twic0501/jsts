import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'node:fs/promises';
import path from 'node:path';
const folder=path.resolve('.local/mongo');await fs.mkdir(folder,{recursive:true});
const mongo=await MongoMemoryServer.create({binary:{version:'8.0.16',downloadDir:path.resolve('.local/mongodb-binaries')},instance:{ip:'127.0.0.1',port:27017,dbPath:folder,storageEngine:'wiredTiger',dbName:'paper_galaxy'},dispose:{cleanup:false}});
console.log('MongoDB local: '+mongo.getUri('paper_galaxy')+' · lưu tại .local/mongo');
const stop=async()=>{await mongo.stop({doCleanup:false});process.exit(0)};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
