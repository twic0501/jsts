import { openDB } from 'idb';
import { searchHistoryInputSchema, type SearchHistory, type SearchHistoryInput } from '@paper-galaxy/core';

// Guest history belongs to this browser/device, never to an authenticated account.
type Entry = SearchHistory & {deleted: boolean};
const database = () => openDB('paper-magic-device-history', 1, {upgrade(db) {
  const store = db.createObjectStore('entries', {keyPath:'id'});
  store.createIndex('queryId','queryId',{unique:true});
  store.createIndex('recent',['updatedAt','id']);
}});
const view = ({id,queryId,query,filters,revision,updatedAt}: Entry):SearchHistory =>
  ({id,queryId,query,filters,revision,updatedAt});

export async function saveDeviceHistory(raw: SearchHistoryInput):Promise<SearchHistory> {
  const input = searchHistoryInputSchema.parse(raw), db = await database();
  try {
    const tx = db.transaction('entries','readwrite');
    const old:Entry|undefined = await tx.store.index('queryId').get(input.queryId);
    if (old) {
      if (old.deleted) throw new Error('Lượt tìm đã bị xóa; hãy tạo lượt tìm mới.');
      if (old.id !== input.id || old.query !== input.query || JSON.stringify(old.filters) !== JSON.stringify(input.filters))
        throw new Error('Mã lượt tìm đã được dùng với nội dung khác.');
      await tx.done; return view(old);
    }
    const entry:Entry = {...input,revision:1,updatedAt:new Date().toISOString(),deleted:false};
    await tx.store.add(entry); await tx.done;
    return view(entry);
  } finally {db.close();}
}
export async function loadDeviceHistory(before:string|null = null, limit=20) {
  const db = await database();
  try {
    const anchor:Entry|undefined = before ? await db.get('entries',before) : undefined;
    if (before && !anchor) throw new Error('Mốc lịch sử không còn hợp lệ. Hãy tải lại.');
    const range = anchor ? IDBKeyRange.upperBound([anchor.updatedAt,anchor.id],true) : undefined;
    let cursor = await db.transaction('entries').store.index('recent').openCursor(range,'prev');
    const items:SearchHistory[] = [];
    while (cursor && items.length <= limit) {
      const row = cursor.value as Entry;
      if (!row.deleted) items.push(view(row));
      cursor = await cursor.continue();
    }
    return {items:items.slice(0,limit),nextCursor:items.length>limit ? items[limit-1]!.id : null};
  } finally {db.close();}
}
export async function removeDeviceHistory(id:string) {
  const db = await database();
  try {
    const tx = db.transaction('entries','readwrite');
    const old:Entry|undefined = await tx.store.get(id);
    if (old && !old.deleted) await tx.store.put({...old,deleted:true,revision:old.revision+1});
    await tx.done;
  } finally {db.close();}
}
