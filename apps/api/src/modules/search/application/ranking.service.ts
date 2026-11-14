import { createHash } from 'node:crypto';
import type { DocumentSearchFilters } from '@paper-galaxy/core';
import { canRead, matches, score, indexedDocumentSchema, type IndexedDocument, type Principal } from '../domain/search.policy';

export function validateIndexedDocuments(documents: IndexedDocument[]): IndexedDocument[] {
  return documents.flatMap(row => {
    const parsed = indexedDocumentSchema.safeParse(row);
    if (!parsed.success || parsed.data.textHash !== createHash('sha256')
      .update(`passage: ${parsed.data.summary.title}\n${parsed.data.text}`).digest('hex')) return [];
    return [parsed.data];
  });
}
export function rankDocuments(documents: IndexedDocument[], queryVector: number[], principal: Principal,
  filters: DocumentSearchFilters, revisions: { model: string; pipeline: string }) {
  const seen = new Set<string>();
  return validateIndexedDocuments(documents).filter(d => {
    if (!canRead(d, principal) || !matches(d, filters) || d.modelRevision !== revisions.model ||
      d.pipelineRevision !== revisions.pipeline || seen.has(d.summary.id)) return false;
    seen.add(d.summary.id); return true;
  }).map(document => ({ document, cosine: score(queryVector, document) }))
    .sort((a, b) => b.cosine - a.cosine || a.document.summary.id.localeCompare(b.document.summary.id));
}
export function sameIndexedVersion(a: IndexedDocument, b: IndexedDocument) {
  return a.summary.id === b.summary.id && a.summary.revision === b.summary.revision &&
    a.summary.activeVersionId === b.summary.activeVersionId && a.chunkId === b.chunkId &&
    a.textHash === b.textHash && a.modelRevision === b.modelRevision && a.pipelineRevision === b.pipelineRevision &&
    a.vector.every((value, i) => value === b.vector[i]);
}
