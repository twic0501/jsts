import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DIMENSIONS, FILES, readBaselineSources } from './arxiv-artifact-format.mjs';
import { validateArtifacts } from './validate-arxiv-artifacts.mjs';

export async function loadValidatedArtifacts(directory) {
  const sources = await readBaselineSources();
  const entries = await Promise.all(Object.values(FILES).map(async name => [name, await readFile(join(directory, name))]));
  const files = Object.fromEntries(entries);
  validateArtifacts(sources, files);
  return { sources, files };
}

export function decodeVectors(bytes) {
  const vectors = new Float32Array(bytes.length / 4);
  for (let i = 0; i < vectors.length; i++) vectors[i] = bytes.readFloatLE(i * 4);
  return vectors;
}

export function vectorNorms(vectors, dimensions = DIMENSIONS) {
  const norms = new Float64Array(vectors.length / dimensions);
  for (let row = 0; row < norms.length; row++) {
    let squares = 0;
    for (let j = row * dimensions; j < (row + 1) * dimensions; j++) squares += vectors[j] * vectors[j];
    norms[row] = Math.sqrt(squares);
    if (!(norms[row] > 0) || !Number.isFinite(norms[row])) throw new Error(`Invalid vector norm at row ${row}`);
  }
  return norms;
}
