import type { SearchHistory, SearchHistoryInput } from '@paper-galaxy/core';
export type { SearchHistory, SearchHistoryInput };
export interface HistoryRepository {
  saveHistory(ownerId: string, key: string, input: SearchHistoryInput, now: string): Promise<SearchHistory>;
  listHistory(ownerId: string, before: string | null, limit: number): Promise<SearchHistory[]>;
  getHistory(ownerId: string, id: string): Promise<SearchHistory | null>;
  deleteHistory(ownerId: string, id: string, revision: number, key: string): Promise<void>;
}
