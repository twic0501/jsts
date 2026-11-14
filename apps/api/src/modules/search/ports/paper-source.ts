import { createHash } from 'node:crypto';
import type { Corpus, SemanticIndex } from '@paper-galaxy/core';
import type { IndexedDocument } from '../domain/search.policy';
import type { SearchDocuments } from './search.repository';

function uuid(value: string) {
  const h = createHash('sha256').update(`paper-magic:v4:${value}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
// Read-only adapter for the existing corpus/index. No upload or document storage.
// UUID mapping is deterministic; Documents must reuse this mapping when wiring readers.
export function createPaperSource(load: () => Promise<{corpus: Corpus; index: SemanticIndex}>): SearchDocuments {
  async function read(ids?: string[]): Promise<IndexedDocument[]> {
    const {corpus, index} = await load();
    const wanted = ids ? new Set(ids) : null;
    const vectors = new Map(index.snapshot.papers.map(v => [v.paperId, v]));
    return corpus.papers.flatMap(paper => {
      const id = uuid(paper.id), embedding = vectors.get(paper.id);
      if (!embedding || wanted && !wanted.has(id)) return [];
      return [{summary: {id, kind: 'paper' as const, title: paper.title, authors: paper.authors,
        year: paper.year, subjects: [paper.group], primarySubject: paper.group, visibility: 'public' as const,
        activeVersionId: uuid(`${paper.id}:${corpus.version}:${embedding.textHash}`), coverage: 'abstract' as const,
        indexStatus: 'ready' as const, revision: 1, updatedAt: corpus.fetchedAt},
        ownerId: null, deleted: false, chunkId: uuid(`${paper.id}:abstract`), text: paper.abstract,
        textHash: embedding.textHash, page: null, section: 'Abstract', vector: embedding.vector,
        modelRevision: index.snapshot.model.revision, pipelineRevision: index.snapshot.model.pipelineVersion,
        point: embedding.point, projectionRevision: index.snapshot.version}];
    });
  }
  return {candidates: () => read(), current: ids => ids.length ? read(ids) : Promise.resolve([])};
}
