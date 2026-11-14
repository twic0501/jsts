import {cosineSimilarity} from '@paper-galaxy/core';
import {indexedSearchDocumentSchema, type IndexedSearchDocument, type DocumentSearchFilters} from '@paper-galaxy/core';
import type { Principal } from '../../../shared/search-context';
export { SearchError, type Principal } from '../../../shared/search-context';
export const indexedDocumentSchema = indexedSearchDocumentSchema;
export type IndexedDocument = IndexedSearchDocument;
export function canRead(document: IndexedDocument, principal: Principal): boolean {
  return !document.deleted && (document.summary.visibility === 'public' ||
    principal !== null && document.ownerId === principal.id);
}
export function matches(document: IndexedDocument, filters: DocumentSearchFilters): boolean {
  const d = document.summary;
  return (!filters.kinds || filters.kinds.includes(d.kind)) &&
    (!filters.subjects || filters.subjects.some(s => d.subjects.includes(s))) &&
    (!filters.documentIds || filters.documentIds.includes(d.id)) &&
    (filters.yearFrom === undefined || d.year !== null && d.year >= filters.yearFrom) &&
    (filters.yearTo === undefined || d.year !== null && d.year <= filters.yearTo);
}
export function score(vector: number[], document: IndexedDocument): number {
  return Math.max(-1, Math.min(1, cosineSimilarity(vector, document.vector)));
}
