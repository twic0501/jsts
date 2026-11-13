import { createHash } from 'node:crypto';
import type { Db } from 'mongodb';
import { type SearchHistory, type SearchHistoryInput } from '@paper-galaxy/core';
import { SearchError } from '../../../shared/search-context';
import { fingerprint } from '../../../shared/search-fingerprint';
import type { HistoryRepository } from './history.types';

type HistoryRow = SearchHistory & { _id: string; ownerId: string; key: string; hash: string; deleted: boolean; deleteKey: string | null };
const dto = ({ id, queryId, query, filters, revision, updatedAt }: HistoryRow): SearchHistory =>
  ({ id, queryId, query, filters, revision, updatedAt });
const rowId = (owner: string | null, queryId: string) => createHash('sha256').update(`${owner ?? 'guest'}:${queryId}`).digest('hex');
const conflict = () => new SearchError(409, 'IDEMPOTENCY_CONFLICT', 'ID hoặc khóa đã được dùng với dữ liệu khác.');
const missing = () => new SearchError(404, 'HISTORY_NOT_FOUND', 'Không tìm thấy lịch sử.');
const duplicate = (e: unknown) => !!e && typeof e === 'object' && 'code' in e && e.code === 11000;
export function createHistoryRepository(db: Db): HistoryRepository {
  const history=db.collection<HistoryRow>('searchHistoryV4');
  let ready: Promise<unknown> | undefined;
  function indexes() { return ready ??= Promise.all([
      history.createIndex({ ownerId: 1, id: 1 }, { unique: true }),
      history.createIndex({ ownerId: 1, key: 1 }, { unique: true }),
      history.createIndex({ ownerId: 1, updatedAt: -1, id: -1 }),
  ]).catch(error => { ready=undefined; throw error; }); }
  return {
    async saveHistory(ownerId, key, input: SearchHistoryInput, now) {
      await indexes();
      const _id = rowId(ownerId, input.queryId), hash = fingerprint(input);
      try {
        await history.updateOne({ _id }, { $setOnInsert: { ...input, ownerId, key, hash,
          revision: 1, updatedAt: now, deleted: false, deleteKey: null } }, { upsert: true });
      } catch (e) { if (!duplicate(e)) throw e; }
      const stored = await history.findOne({ _id });
      if (!stored || stored.hash !== hash || stored.key !== key) throw conflict();
      if (stored.deleted) throw new SearchError(410, 'HISTORY_DELETED', 'Mục lịch sử đã bị xóa.');
      return dto(stored);
    },
    async listHistory(ownerId, before, limit) {
      await indexes();
      const cursor = before ? await history.findOne({ ownerId, id: before }) : null;
      if (before && !cursor) throw new SearchError(422, 'CURSOR_INVALID', 'Cursor không thuộc lịch sử hiện tại.');
      return (await history.find({ ownerId, deleted: false, ...(cursor ? { $or: [
        { updatedAt: { $lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { $lt: cursor.id } },
      ] } : {}) }).sort({ updatedAt: -1, id: -1 }).limit(limit).toArray()).map(dto);
    },
    async getHistory(ownerId, id) {
      await indexes(); const row = await history.findOne({ ownerId, id, deleted: false });
      return row ? dto(row) : null;
    },
    async deleteHistory(ownerId, id, revision, key) {
      await indexes();
      const row = await history.findOne({ ownerId, id });
      if (!row) throw missing();
      if (row.deleted && row.deleteKey === key) return;
      if (row.deleted || row.revision !== revision) throw new SearchError(412, 'REVISION_CONFLICT', 'Lịch sử đã thay đổi.');
      const result = await history.updateOne({ _id: row._id, deleted: false, revision },
        { $set: { deleted: true, deleteKey: key }, $inc: { revision: 1 } });
      if (result.modifiedCount !== 1) {
        const current = await history.findOne({ _id: row._id });
        if (current?.deleted && current.deleteKey === key) return;
        throw new SearchError(412, 'REVISION_CONFLICT', 'Lịch sử đã thay đổi.');
      }
    },
  };
}
