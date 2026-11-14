import type { Db } from 'mongodb';
import { createMongoSearchRepository } from './mongo';
import { createSearchService } from './application/search.service';
import type { SearchDependencies, SearchDocuments } from './ports/search.repository';
export function createSearchModule(db: Db,documents: SearchDocuments,embed: SearchDependencies['embed'],revisions: SearchDependencies['revisions'],projectQuery?: SearchDependencies['projectQuery']) {
  const repository=createMongoSearchRepository(db,documents);
  return {repository,service:createSearchService({repository,embed,revisions,...(projectQuery ? {projectQuery} : {})})};
}
