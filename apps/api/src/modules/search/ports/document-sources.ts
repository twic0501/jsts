import type { SearchDocuments } from './search.repository';

// Each configured source must scope its candidates before retrieval and re-read
// authoritative content in current(). Missing study is supported; source errors
// propagate so a partial/failed retrieval is never presented as complete.
export function createDocumentSources(sources: {paper: SearchDocuments; study?: SearchDocuments}): SearchDocuments {
  const configured = [sources.paper, ...(sources.study ? [sources.study] : [])];
  return {
    async candidates(principal) { return (await Promise.all(configured.map(s => s.candidates(principal)))).flat(); },
    async current(ids, principal) {
      if (!ids.length) return [];
      return (await Promise.all(configured.map(s => s.current(ids, principal)))).flat().filter(d => ids.includes(d.summary.id));
    },
  };
}
