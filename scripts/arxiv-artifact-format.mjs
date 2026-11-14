import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORD_COUNT = 7500;
export const DIMENSIONS = 384;
export const ROW_BYTES = DIMENSIONS * 4;
export const BINARY_BYTES = RECORD_COUNT * ROW_BYTES;
export const AXES = ['x', 'y', 'z'];
export const SCHEMA_VERSION = 'arxiv-artifacts-v1';
export const FILES = Object.freeze({
  visualization: 'visualization-7500.json',
  embeddings: 'embeddings-7500.f32le',
  index: 'embedding-index.json',
  manifest: 'artifact-manifest.json',
});
export const DATA_FILES = [FILES.visualization, FILES.embeddings, FILES.index];
export const EXPORT_CONFIG = Object.freeze({
  rowOrder: 'semantic-snapshot-selected.json:papers',
  rowIndexBase: 0,
  primaryCategorySource: 'categories[0]',
  pointDimensions: 3,
  embeddingDimensions: DIMENSIONS,
  embeddingEncoding: 'float32-le',
  bytesPerRow: ROW_BYTES,
});

const BASELINE_DIR = fileURLToPath(new URL('../datasets/arxiv-7500/', import.meta.url));
// DATA-01 canonical LF SHA-256, independent of Git checkout line endings.
const BASELINE = {
  'papers-selected-7500-with-summary.json': 'd1b721a077b674e6da19d7e8e0e6b9b48019d105e8f1f1aeba2c9ad00abeff16',
  'semantic-snapshot-selected.json': 'c3038dd8ef0ebd02b9b475fef461794af279a1632bc0babb0f2b25117c698a8f',
};

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value) + '\n', 'utf8');
export const artifactDigest = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) });

export async function readBaselineSources() {
  const inputs = {};
  const documents = [];
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  for (const [name, expectedLfSha256] of Object.entries(BASELINE)) {
    const raw = await readFile(join(BASELINE_DIR, name));
    const text = decoder.decode(raw);
    const lf = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
    const lfSha256 = sha256(lf);
    if (lfSha256 !== expectedLfSha256) {
      throw new Error(`${name} lệch baseline DATA-01 (SHA-256 LF ${lfSha256}, kỳ vọng ${expectedLfSha256}).`);
    }
    inputs[name] = { rawBytes: raw.length, rawSha256: sha256(raw), lfBytes: lf.length, lfSha256 };
    documents.push(JSON.parse(text));
  }
  const [papers, snapshot] = documents;
  return { papers, snapshot, inputs };
}

function indexSource(rows, field, label) {
  if (!Array.isArray(rows)) throw new Error(`${label} phải là mảng bản ghi.`);
  const records = new Map();
  for (const [row, record] of rows.entries()) {
    const id = record?.[field];
    if (typeof id !== 'string' || !id.trim()) throw new Error(`${label} hàng ${row} thiếu ID hợp lệ.`);
    if (records.has(id)) throw new Error(`${label} trùng ID ${id}.`);
    records.set(id, record);
  }
  return records;
}

export function checkSources({ papers, snapshot }) {
  const metadata = indexSource(papers, 'id', 'Metadata');
  const snapshotIndex = indexSource(snapshot?.papers, 'paperId', 'Snapshot');
  const missing = [...metadata.keys()].find(id => !snapshotIndex.has(id));
  const extra = [...snapshotIndex.keys()].find(id => !metadata.has(id));
  if (missing !== undefined || extra !== undefined) {
    const differences = [];
    if (missing !== undefined) differences.push(`Snapshot thiếu ID ${missing}`);
    if (extra !== undefined) differences.push(`Snapshot thừa ID ${extra}`);
    throw new Error(differences.join('. ') + '.');
  }
  if (metadata.size !== RECORD_COUNT || snapshotIndex.size !== RECORD_COUNT) {
    throw new Error(`Cần ${RECORD_COUNT} ID duy nhất mỗi phía (metadata ${metadata.size}, snapshot ${snapshotIndex.size}).`);
  }

  const { model, version, corpusVersion } = snapshot;
  if (model?.dimensions !== DIMENSIONS ||
      ![version, corpusVersion, model.id, model.revision, model.dtype, model.pipelineVersion]
        .every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Snapshot thiếu phiên bản corpus, snapshot hoặc thông tin model 384D hợp lệ.');
  }
  for (const { paperId, point, vector } of snapshot.papers) {
    const { title, categories } = metadata.get(paperId);
    if (typeof title !== 'string' || !title.trim() || !Array.isArray(categories) ||
        typeof categories[0] !== 'string' || !categories[0].trim()) {
      throw new Error(`${paperId} thiếu title hoặc category chính hợp lệ.`);
    }
    if (!AXES.every(axis => Number.isFinite(point?.[axis]))) {
      throw new Error(`${paperId} có tọa độ 3D không hợp lệ.`);
    }
    if (!Array.isArray(vector) || vector.length !== DIMENSIONS) {
      throw new Error(`${paperId} phải có vector đúng ${DIMENSIONS} chiều.`);
    }
    for (let component = 0; component < DIMENSIONS; component++) {
      const value = vector[component];
      if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
        throw new Error(`${paperId} có phần tử vector không hợp lệ tại chiều ${component}.`);
      }
    }
  }
  return metadata;
}

export function manifestMetadata({ snapshot, inputs }) {
  const { id, revision, dtype, dimensions, pipelineVersion } = snapshot.model;
  return {
    schemaVersion: SCHEMA_VERSION,
    corpusVersion: snapshot.corpusVersion,
    snapshotVersion: snapshot.version,
    model: { id, revision, dtype, dimensions, pipelineVersion },
    export: EXPORT_CONFIG,
    recordCount: RECORD_COUNT,
    inputs,
  };
}

export function parseDirectoryArg(flag, usage) {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    console.log(usage);
    return null;
  }
  if (args.length !== 2 || args[0] !== flag || !args[1].trim() || args[1].startsWith('--')) {
    throw new Error(usage);
  }
  return args[1];
}
