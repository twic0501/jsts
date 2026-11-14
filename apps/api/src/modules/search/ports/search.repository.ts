import type { Point3 } from '@paper-galaxy/core';
import type { DocumentSearch, DocumentSearchInput } from '@paper-galaxy/core';
import type { IndexedDocument, Principal } from '../domain/search.policy';

export type StoredRun = { ownerId: string | null; key: string; fingerprint: string; response: DocumentSearch };
// Provided by the document/index module; search does not own ingestion storage.
export interface SearchDocuments {
  candidates(principal: Principal): Promise<IndexedDocument[]>;
  current(ids: string[], principal: Principal): Promise<IndexedDocument[]>;
}
export interface SearchRepository extends SearchDocuments {
  findRun(ownerId: string | null, queryId: string): Promise<StoredRun | null>;
  getRun(id: string, ownerId: string | null): Promise<StoredRun | null>;
  saveRun(run: StoredRun): Promise<StoredRun>;
}
export type SearchDependencies = {
  repository: SearchRepository;
  embed: (query: string) => Promise<number[]>;
  revisions: () => Promise<{ model: string; pipeline: string; projection: string }>;
  now?: () => Date;
  projectQuery?: (vector: number[]) => Point3 | Promise<Point3>;
};
export type SearchCommand = { input: DocumentSearchInput; key: string; principal: Principal };
