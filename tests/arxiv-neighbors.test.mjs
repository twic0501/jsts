import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { FILES, readBaselineSources, sha256 } from '../scripts/arxiv-artifact-format.mjs';
import { topNeighbors } from '../scripts/export-arxiv-neighbors.mjs';

function reference(ids, vectors, row, k) {
  const own = vectors[row];
  return ids.flatMap((paperId, other) => {
    if (row === other) return [];
    const candidate = vectors[other];
    const dot = own.reduce((sum, value, d) => sum + value * candidate[d], 0);
    return [{ paperId, cosine: Math.max(-1, Math.min(1, dot / (Math.hypot(...own) * Math.hypot(...candidate)))) }];
  }).sort((a, b) => b.cosine - a.cosine || (a.paperId < b.paperId ? -1 : 1)).slice(0, k);
}

function compare(actual, expected) {
  assert.deepEqual(actual.map(edge => edge.paperId), expected.map(edge => edge.paperId));
  for (let i = 0; i < expected.length; i++) assert(Math.abs(actual[i].cosine - expected[i].cosine) < 1e-12);
}

test('directed top-K matches independent cosine, excludes self, and ties use ID', () => {
  const ids = ['z', 'own', 'a', 'negative', 'orthogonal'];
  const vectors = [[2, 0], [1, 0], [3, 0], [-1, 0], [0, 5]];
  const graph = topNeighbors(ids, Float32Array.from(vectors.flat()), 2, 2);
  assert.deepEqual(graph[1].neighbors.map(x => x.paperId), ['a', 'z']);
  for (let row = 0; row < ids.length; row++) compare(graph[row].neighbors, reference(ids, vectors, row, 2));
  assert.throws(() => topNeighbors(['a', 'b'], Float32Array.from([0, 1]), 1, 1), /norm/);
});

test('sample 12 full-corpus rows against independent exhaustive cosine', { skip: !process.env.JSTS_NEIGHBOR_GRAPH }, async () => {
  const graph = JSON.parse(await readFile(process.env.JSTS_NEIGHBOR_GRAPH));
  const { snapshot, inputs } = await readBaselineSources();
  const binary = await readFile(process.env.JSTS_NEIGHBOR_EMBEDDINGS);
  assert.equal(graph.source.embeddings.sha256, sha256(binary));
  assert.equal(binary.length, 11520000);
  assert.deepEqual(graph.source.inputs, inputs);
  const ids = snapshot.papers.map(p => p.paperId);
  const vectors = snapshot.papers.map(p => p.vector.map(Math.fround));
  assert.deepEqual(graph.rows.map(p => p.paperId), ids);
  assert.equal(graph.k, 20);
  const validIds = new Set(ids);
  for (const row of graph.rows) {
    assert.equal(row.neighbors.length, 20);
    assert.equal(new Set(row.neighbors.map(x => x.paperId)).size, 20);
    assert(row.neighbors.every(x => x.paperId !== row.paperId && validIds.has(x.paperId) && Math.abs(x.cosine) <= 1));
    assert(row.neighbors.every((edge, i, values) => i === 0 || values[i - 1].cosine > edge.cosine ||
      (values[i - 1].cosine === edge.cosine && values[i - 1].paperId < edge.paperId)));
  }
  for (const i of [0, 1, 31, 500, 1234, 2048, 3000, 4096, 5555, 6000, 7000, 7499]) {
    compare(graph.rows[i].neighbors, reference(ids, vectors, i, 20));
  }
});
