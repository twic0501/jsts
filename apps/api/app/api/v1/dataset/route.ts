import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDataset } from '../../../../lib/repository';
import { fail, success } from '../../../../lib/http';
import type { SemanticSnapshot } from '@paper-galaxy/core';

export const runtime = 'nodejs';
let cachedGraph: { snapshot: SemanticSnapshot; file: string; rows: Promise<unknown> } | undefined;

async function readNeighbors(snapshot: SemanticSnapshot, file: string) {
  const graph = JSON.parse(await readFile(file, 'utf8'));
  const bytes = Buffer.alloc(384 * 4);
  const hash = createHash('sha256');
  for (const { vector } of snapshot.papers) {
    vector.forEach((component, i) => bytes.writeFloatLE(component, i * 4));
    hash.update(bytes);
  }
  if (graph.schemaVersion !== 'arxiv-neighbors-v1' || graph.metric !== 'cosine-f32le-384d' ||
      graph.corpusVersion !== snapshot.corpusVersion || graph.source?.embeddings?.sha256 !== hash.digest('hex') ||
      !Array.isArray(graph.rows) || graph.rows.length !== snapshot.papers.length ||
      graph.rows.some((row: { paperId?: string }, i: number) => row?.paperId !== snapshot.papers[i]?.paperId)) {
    throw new Error('Neighbor graph does not match the active snapshot');
  }
  return graph.rows;
}

function matchingNeighbors(snapshot: SemanticSnapshot) {
  const file = process.env.JSTS_NEIGHBOR_GRAPH;
  if (!file) return undefined;
  if (cachedGraph?.snapshot === snapshot && cachedGraph.file === file) return cachedGraph.rows;
  const rows = readNeighbors(snapshot, file).catch(error => {
    if (cachedGraph?.rows === rows) cachedGraph = undefined;
    console.warn('Dataset neighbor graph unavailable:', error.message);
    return undefined;
  });
  cachedGraph = { snapshot, file, rows };
  return rows;
}

export async function GET() {
  try {
    const { corpus, index, storage } = await getDataset();
    const snapshot = index.snapshot;
    // A stale optional graph must not prevent the matching corpus and snapshot from loading.
    const neighbors = await matchingNeighbors(snapshot);
    return success({ dataset: { corpus, snapshot }, storage, neighbors });
  } catch {
    return fail(503, 'DATASET_UNAVAILABLE', 'Không đọc được bộ dữ liệu và snapshot.');
  }
}
