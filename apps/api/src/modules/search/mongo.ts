import { createHash } from 'node:crypto';
import type { Db } from 'mongodb';
import { SearchError } from '../../shared/search-context';
import type { SearchDocuments, SearchRepository, StoredRun } from './ports/search.repository';
type RunRow = StoredRun & { _id: string; scope: string; queryId: string; expiresAt: Date };
const rowId=(owner: string | null,queryId: string)=>createHash('sha256').update(`${owner ?? 'guest'}:${queryId}`).digest('hex');
const conflict=()=>new SearchError(409,'IDEMPOTENCY_CONFLICT','ID hoặc khóa đã được dùng với dữ liệu khác.');
const duplicate=(e:unknown)=>!!e && typeof e==='object' && 'code' in e && e.code===11000;
export function createMongoSearchRepository(db: Db, documents: SearchDocuments): SearchRepository {
  const runs=db.collection<RunRow>('searchRunsV4');
  let ready: Promise<unknown> | undefined;
  function indexes(){return ready ??= Promise.all([
      runs.createIndex({ scope: 1, key: 1 }, { unique: true }),
      runs.createIndex({ 'response.id': 1 }, { unique: true }),
      // Retain expired runs for 24h so reads/retries can return 410 instead of silently recreating.
      runs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 }),
  ]).catch(error=>{ready=undefined;throw error;});}
  return {candidates:p=>documents.candidates(p),current:(ids,p)=>documents.current(ids,p),
    async findRun(ownerId, queryId) { await indexes(); return runs.findOne({ _id: rowId(ownerId, queryId) }); },
    async getRun(id, ownerId) { await indexes(); return runs.findOne({ 'response.id': id, ownerId }); },
    async saveRun(run) {
      await indexes();
      const _id = rowId(run.ownerId, run.response.queryId);
      try {
        await runs.updateOne({ _id }, { $setOnInsert: { ...run, scope: run.ownerId ?? 'guest', queryId: run.response.queryId,
          expiresAt: new Date(run.response.expiresAt) } }, { upsert: true });
      } catch (e) { if (!duplicate(e)) throw e; }
      const stored = await runs.findOne({ _id });
      if (!stored) throw conflict();
      return stored;
    },
  };
}
