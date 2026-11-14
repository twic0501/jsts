import { randomUUID } from 'node:crypto';
import {documentSearchSchema, type DocumentSearch} from '@paper-galaxy/core';
import { canRead, matches, SearchError, type Principal } from '../domain/search.policy';
import type { SearchCommand, SearchDependencies, StoredRun } from '../ports/search.repository';
import { fingerprint } from '../../../shared/search-fingerprint';
import { rankDocuments, sameIndexedVersion, validateIndexedDocuments } from './ranking.service';

export function createSearchService(deps: SearchDependencies) {
  const now = deps.now ?? (() => new Date());
  async function readable(run: StoredRun, principal: Principal): Promise<DocumentSearch> {
    if (Date.parse(run.response.expiresAt) <= now().getTime())
      throw new SearchError(410, 'SEARCH_EXPIRED', 'Lượt tìm đã hết hạn. Hãy tìm lại.');
    const docs = validateIndexedDocuments(await deps.repository.current(run.response.hits.map(h => h.document.id), principal));
    const byId = new Map(docs.map(d => [d.summary.id, d]));
    return { ...run.response, hits: run.response.hits.filter(hit => {
      const current = byId.get(hit.document.id);
      return current && canRead(current, principal) && matches(current, run.response.filters) &&
        current.summary.revision === hit.document.revision && current.summary.activeVersionId === hit.document.activeVersionId &&
        current.chunkId === hit.evidence[0]?.chunkId && current.text === hit.evidence[0]?.quote &&
        current.modelRevision === run.response.modelRevision && current.pipelineRevision === run.response.pipelineRevision;
    }).map(hit => {
      const current = byId.get(hit.document.id)!;
      return {...hit, point: current.projectionRevision === run.response.projectionRevision ? current.point ?? null : null};
    }) };
  }
  return {
    async search({ input, key, principal }: SearchCommand): Promise<DocumentSearch> {
      const ownerId = principal?.id ?? null, hash = fingerprint(input);
      const existing = await deps.repository.findRun(ownerId, input.queryId);
      if (existing) {
        if (existing.fingerprint !== hash || existing.key !== key)
          throw new SearchError(409, 'QUERY_CONFLICT', 'queryId đã được dùng cho lượt tìm khác.');
        return readable(existing, principal);
      }
      const started = performance.now(), revisions = await deps.revisions();
      const vector = await deps.embed(input.query);
      if (vector.length !== 384 || vector.some(v => !Number.isFinite(v)) || Math.abs(Math.hypot(...vector) - 1) >= .002)
        throw new SearchError(503, 'EMBEDDING_UNAVAILABLE', 'Vector câu hỏi không hợp lệ.');
      const ranked = rankDocuments(await deps.repository.candidates(principal), vector, principal, input.filters, revisions);
      const hits: DocumentSearch['hits'] = [];
      // Read content/permissions in bounded batches. Refill if a candidate was revoked or changed.
      for (let offset = 0; offset < ranked.length && hits.length < input.topK; offset += input.topK) {
        const batch = ranked.slice(offset, offset + input.topK);
        const current = validateIndexedDocuments(await deps.repository.current(batch.map(r => r.document.summary.id), principal));
        const byId = new Map(current.map(d => [d.summary.id, d]));
        for (const candidate of batch) {
          const d = byId.get(candidate.document.summary.id);
          if (!d || !sameIndexedVersion(candidate.document, d) || !canRead(d, principal) || !matches(d, input.filters)) continue;
          const cosine = candidate.cosine;
          hits.push({document: d.summary, cosine, rankScore: cosine,
            point: d.projectionRevision === revisions.projection ? d.point ?? null : null,
            evidence: [{id: `E${hits.length + 1}`, documentId: d.summary.id, versionId: d.summary.activeVersionId,
              chunkId: d.chunkId, quote: d.text, page: d.page, section: d.section, start: 0, end: d.text.length, cosine}]});
          if (hits.length === input.topK) break;
        }
      }
      const response = documentSearchSchema.parse({id: randomUUID(), queryId: input.queryId, query: input.query,
        filters: input.filters, origin: 'server', coverage: 'server', hits, rankingProfile: 'dense',
        modelRevision: revisions.model, pipelineRevision: revisions.pipeline, projectionRevision: revisions.projection,
        durationMs: performance.now() - started, expiresAt: new Date(now().getTime() + 15 * 60_000).toISOString(), warnings: [],
        ...(deps.projectQuery ? {queryPoint: await deps.projectQuery(vector)} : {})});
      const stored = await deps.repository.saveRun({ownerId, key, fingerprint: hash, response});
      if (stored.fingerprint !== hash || stored.key !== key) throw new SearchError(409, 'QUERY_CONFLICT', 'queryId đã được dùng.');
      return readable(stored, principal);
    },
    async get(id: string, principal: Principal) {
      const run = await deps.repository.getRun(id, principal?.id ?? null);
      if (!run) throw new SearchError(404, 'SEARCH_NOT_FOUND', 'Không tìm thấy lượt tìm.');
      return readable(run, principal);
    },
  };
}
