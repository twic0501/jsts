import type { Db } from 'mongodb';
import { createHistoryRepository } from './search-history/history.repository';
import { createHistoryService } from './search-history/history.service';
export function createPersonalLibraryModule(db: Db) {
  const repository=createHistoryRepository(db);
  return {repository,history:createHistoryService(repository)};
}
