import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { artifactDigest, DIMENSIONS, FILES, jsonBytes } from './arxiv-artifact-format.mjs';
import { decodeVectors, loadValidatedArtifacts, vectorNorms } from './arxiv-artifact-input.mjs';

export const NEIGHBOR_K = 20;
export const compareIds = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Score each unordered pair once. Each endpoint keeps its own directed top K. */
export function topNeighbors(ids, vectors, dimensions = DIMENSIONS, k = NEIGHBOR_K) {
  if (!Number.isInteger(dimensions) || dimensions <= 0 || vectors.length !== ids.length * dimensions ||
      !Number.isInteger(k) || k < 1 || k >= ids.length || new Set(ids).size !== ids.length) {
    throw new Error('Invalid dimensions, K or IDs');
  }
  const norms = vectorNorms(vectors, dimensions);
  const neighbors = ids.map(() => []);
  function offer(from, to, cosine) {
    const list = neighbors[from];
    const tail = list.at(-1);
    if (list.length === k && (cosine < tail.cosine || (cosine === tail.cosine && ids[to] >= tail.paperId))) return;
    let slot = list.length;
    while (slot > 0 && (list[slot - 1].cosine < cosine ||
      (list[slot - 1].cosine === cosine && list[slot - 1].paperId > ids[to]))) slot--;
    list.splice(slot, 0, { paperId: ids[to], cosine });
    if (list.length > k) list.pop();
  }

  for (let i = 0; i < ids.length - 1; i++) {
    const left = i * dimensions;
    for (let j = i + 1; j < ids.length; j++) {
      const right = j * dimensions;
      let dot = 0;
      for (let d = 0; d < dimensions; d++) dot += vectors[left + d] * vectors[right + d];
      const cosine = Math.max(-1, Math.min(1, dot / (norms[i] * norms[j])));
      offer(i, j, cosine);
      offer(j, i, cosine);
    }
  }

  return ids.map((paperId, row) => ({ paperId, neighbors: neighbors[row] }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { 'artifact-dir': { type: 'string' }, 'out-dir': { type: 'string' } } });
    if (!values['artifact-dir'] || !values['out-dir']) throw new Error('Use --artifact-dir and --out-dir <new directory>');
    const start = performance.now();
    const { sources, files } = await loadValidatedArtifacts(values['artifact-dir']);
    const validationMs = performance.now() - start;
    const ids = sources.snapshot.papers.map(paper => paper.paperId);
    const vectors = decodeVectors(files[FILES.embeddings]);
    const graphStart = performance.now();
    const rows = topNeighbors(ids, vectors);
    const computeMs = performance.now() - graphStart;
    const bytes = jsonBytes({
      schemaVersion: 'arxiv-neighbors-v1', corpusVersion: sources.snapshot.corpusVersion,
      source: { inputs: sources.inputs, embeddings: artifactDigest(files[FILES.embeddings]), manifest: artifactDigest(files[FILES.manifest]) },
      metric: 'cosine-f32le-384d', k: NEIGHBOR_K, directed: true, selfEdges: false,
      order: ['cosine-desc', 'paperId-ordinal-asc'], rows,
    });
    const name = 'neighbors-7500.json';
    await mkdir(values['out-dir']);
    await writeFile(join(values['out-dir'], name), bytes, { flag: 'wx' });
    console.log(JSON.stringify({ name, ...artifactDigest(bytes), records: rows.length, edges: rows.length * NEIGHBOR_K, validationMs, computeMs }, null, 2));
  } catch (error) {
    console.error(`DATA-02B: ${error.message}`);
    process.exitCode = 1;
  }
}
