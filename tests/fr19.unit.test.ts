import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { corpusSchema, SemanticIndex, validateSnapshot } from '@paper-galaxy/core';
import corpusFile from '../data/corpus.json';
import snapshotFile from '../data/semantic-snapshot.json';
import { createDocumentSources } from '../apps/api/src/modules/search/ports/document-sources';
import { createPaperSource } from '../apps/api/src/modules/search/ports/paper-source';
import { createSearchService } from '../apps/api/src/modules/search/application/search.service';
import { document, MemoryRepository, vector } from './helpers/fr19-fixture';

function setup() {
  const repository = new MemoryRepository();
  const service = createSearchService({repository, embed: async () => vector(),
    revisions: async () => ({model: 'model-v1', pipeline: 'pipeline-v1', projection: 'pca-v1'})});
  const input = {queryId: randomUUID(), query: 'semantic search', topK: 12, filters: {}};
  return {repository, service, input, search: () => service.search({input, key: input.queryId, principal: null})};
}
describe('FR19 paper first, study optional', () => {
  it('paper-only source works; requesting study yields an empty list', async () => {
    const f = setup(), paper = document();
    const source = createDocumentSources({paper: {candidates: async () => [paper], current: async ids => ids.includes(paper.summary.id) ? [paper] : []}});
    f.repository.candidates = source.candidates; f.repository.current = source.current;
    expect((await f.search()).hits.map(h => h.document.kind)).toEqual(['paper']);
    const input = {...f.input, queryId: randomUUID(), filters: {kinds: ['study' as const]}};
    expect((await f.service.search({input, key: input.queryId, principal: null})).hits).toEqual([]);
  });
  it('paper and study share one cosine ranking rather than separate quotas', async () => {
    const f = setup(), paper = document({vector: vector(1)}), study = document(); study.summary.kind = 'study';
    const source = (d: typeof paper) => ({candidates: async () => [d], current: async (ids: string[]) => ids.includes(d.summary.id) ? [d] : []});
    const combined = createDocumentSources({paper: source(paper), study: source(study)});
    f.repository.candidates = combined.candidates; f.repository.current = combined.current;
    expect((await f.search()).hits.map(h => h.document.kind)).toEqual(['study', 'paper']);
  });
  it('does not hide a configured study source outage as a complete search', async () => {
    const source = createDocumentSources({paper: {candidates: async () => [], current: async () => []},
      study: {candidates: async () => {throw new Error('index unavailable');}, current: async () => []}});
    await expect(source.candidates(null)).rejects.toThrow('index unavailable');
  });
  it('returns PCA points only from the matching projection and still ranks in 384D', async () => {
    const f = setup(), near3D = document({vector: vector(1), point: {x:0,y:0,z:0}, projectionRevision: 'pca-v1'}),
      semanticBest = document({point: {x:100,y:100,z:100}, projectionRevision: 'pca-v1'});
    f.repository.docs = [near3D, semanticBest];
    const result = await f.search();
    expect(result.hits[0]?.document.id).toBe(semanticBest.summary.id);
    expect(result.hits[0]?.point).toEqual({x:100,y:100,z:100});
    f.repository.docs[1]!.projectionRevision = 'another-pca';
    expect((await f.service.get(result.id, null)).hits[0]?.point).toBeNull();
  });
  it('refills topK when the highest candidates lose permission or change version', async () => {
    const f = setup(), docs = Array.from({length: 6}, () => document());
    f.input.topK = 2; f.repository.docs = docs;
    const ordered = [...docs].sort((a,b) => a.summary.id.localeCompare(b.summary.id));
    const revoked = new Set(ordered.slice(0,2).map(d => d.summary.id));
    f.repository.current = async ids => docs.filter(d => ids.includes(d.summary.id) && !revoked.has(d.summary.id));
    expect((await f.search()).hits.map(h => h.document.id)).toEqual(ordered.slice(2,4).map(d => d.summary.id));
  });
  it('rejects corrupt content or vectors and skips stale generations', async () => {
    const f = setup(); f.repository.docs = [document({textHash:'0'.repeat(64)}), document({vector:Array(384).fill(0)}), document({modelRevision:'old'})];
    expect((await f.search()).hits).toEqual([]);
  });
  it('adapts the actual bundled paper corpus without changing its IDs or inventing fulltext', async () => {
    const corpus = corpusSchema.parse(corpusFile), snapshot = validateSnapshot(corpus, snapshotFile);
    const source = createPaperSource(async () => ({corpus, index: new SemanticIndex(corpus, snapshot)}));
    const docs = await source.candidates(null), again = await source.current([docs[0]!.summary.id], null);
    expect(docs).toHaveLength(corpus.papers.length); expect(again[0]?.summary.id).toBe(docs[0]!.summary.id);
    expect(docs.every(d => d.summary.kind === 'paper' && d.summary.coverage === 'abstract')).toBe(true);
    expect(corpus.papers[0]!.id).toBe(corpusFile.papers[0]!.id);
  });
});
