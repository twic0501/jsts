import { openDB } from 'idb';
import { corpusSchema,validateBundle, type Corpus,type DatasetBundle } from '@paper-galaxy/core';
const db=()=>openDB('paper-magic-v1',2,{upgrade(database){if(!database.objectStoreNames.contains('library'))database.createObjectStore('library');if(!database.objectStoreNames.contains('bookmarks'))database.createObjectStore('bookmarks');if(!database.objectStoreNames.contains('online'))database.createObjectStore('online');}});
export async function saveCorpus(corpus:Corpus){const database=await db();try{await database.put('library',corpus,'active')}finally{database.close()}}
export async function loadCorpus():Promise<Corpus|undefined>{const database=await db();try{const raw:unknown=await database.get('library','active');const parsed=corpusSchema.safeParse(raw);return parsed.success?parsed.data:undefined}finally{database.close()}}
export async function loadBookmarks():Promise<string[]>{const database=await db();try{const keys=await database.getAllKeys('bookmarks');return keys.filter((key):key is string=>typeof key==='string')}finally{database.close()}}
export async function setBookmark(id:string,saved:boolean){const database=await db();try{if(saved)await database.put('bookmarks',{savedAt:new Date().toISOString()},id);else await database.delete('bookmarks',id)}finally{database.close()}}
export async function saveOnlineDataset(bundle:DatasetBundle){const database=await db();try{await database.put('online',bundle,'active')}finally{database.close()}}
export async function loadOnlineDataset():Promise<DatasetBundle|undefined>{const database=await db();try{const raw:unknown=await database.get('online','active');return raw?validateBundle(raw):undefined}finally{database.close()}}
