import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artifactDigest, BINARY_BYTES, DIMENSIONS, FILES, jsonBytes, RECORD_COUNT, ROW_BYTES }
  from '../scripts/arxiv-artifact-format.mjs';
import { encodeArtifacts } from '../scripts/export-arxiv-artifacts.mjs';
import { validateArtifacts } from '../scripts/validate-arxiv-artifacts.mjs';

const papers = Array.from({ length: RECORD_COUNT }, (_, i) => ({
  id: `fixture-${i}`, title: `Paper ${i}`, categories: ['cs.LG', 'cs.AI'],
}));
const snapshot = {
  version: 'fixture-snapshot',
  corpusVersion: 'fixture-corpus',
  model: { id: 'fixture-model', revision: 'rev1', dtype: 'q8', dimensions: DIMENSIONS, pipelineVersion: 'v1' },
  papers: papers.toReversed().map(({ id }, row) => ({
    paperId: id,
    // 0.1 needs Float32 rounding, while 1.5 has a recognizable byte pattern.
    vector: Array.from({ length: DIMENSIONS }, (_, component) => [row / 10, 1.5, -0][component] ?? 0),
    point: { x: row / 10, y: -2, z: 3 },
  })),
};
const sources = { papers, snapshot, inputs: {} };
const artifacts = encodeArtifacts(sources);

function withSnapshotRows(rows) {
  return { ...sources, snapshot: { ...snapshot, papers: rows } };
}

function withUpdatedArtifact(name, bytes) {
  // Rehash to exercise payload validation independently of the checksum check.
  const manifest = JSON.parse(artifacts[FILES.manifest]);
  manifest.artifacts[name] = artifactDigest(bytes);
  return { ...artifacts, [name]: bytes, [FILES.manifest]: jsonBytes(manifest) };
}

test('exports in snapshot order, writes exact Float32 LE bytes and validates every component', () => {
  const points = JSON.parse(artifacts[FILES.visualization]);
  const embeddings = artifacts[FILES.embeddings];
  const index = JSON.parse(artifacts[FILES.index]);
  assert.equal(embeddings.length, 11_520_000);
  assert.deepEqual(points[0], {
    paperId: papers.at(-1).id, title: papers.at(-1).title, primaryCategory: 'cs.LG', point: snapshot.papers[0].point,
  });
  assert.deepEqual(index[papers[0].id], { row: RECORD_COUNT - 1, byteOffset: BINARY_BYTES - ROW_BYTES });
  assert.deepEqual([...embeddings.subarray(4, 8)], [0, 0, 192, 63]);
  assert.equal(embeddings.readFloatLE(ROW_BYTES), Math.fround(0.1));
  assert(Object.is(embeddings.readFloatLE(8), -0));
  const result = validateArtifacts(sources, artifacts);
  assert.equal(result.componentsCompared, 2_880_000);
  assert.equal(result.maxAbsErrorVsMathFround, 0);
  assert(result.maxAbsFloat32RoundingError > 0);
});

test('rejects missing snapshot ID', () => {
  assert.throws(() => encodeArtifacts(withSnapshotRows(snapshot.papers.slice(1))), /Snapshot thiếu ID/);
});

test('rejects extra snapshot ID', () => {
  const rows = [...snapshot.papers, { ...snapshot.papers[0], paperId: 'extra-id' }];
  assert.throws(() => encodeArtifacts(withSnapshotRows(rows)), /Snapshot thừa ID extra-id/);
});

test('rejects a duplicate snapshot ID while preserving the set of IDs', () => {
  assert.throws(() => encodeArtifacts(withSnapshotRows([...snapshot.papers, snapshot.papers[0]])), /Snapshot trùng ID/);
});

test('rejects a duplicate metadata ID', () => {
  assert.throws(() => encodeArtifacts({ ...sources, papers: [...papers, papers[0]] }), /Metadata trùng ID/);
});

test('rejects a missing ID field and fewer rows on both sides', () => {
  const rows = snapshot.papers.with(0, { ...snapshot.papers[0], paperId: undefined });
  assert.throws(() => encodeArtifacts(withSnapshotRows(rows)), /thiếu ID hợp lệ/);
  const short = { ...withSnapshotRows(snapshot.papers.slice(1)), papers: papers.slice(0, -1) };
  assert.throws(() => encodeArtifacts(short), /Cần 7500 ID duy nhất/);
});

test('exporter and validator reject a source vector with the wrong dimension', () => {
  const rows = snapshot.papers.with(0, { ...snapshot.papers[0], vector: Array(DIMENSIONS - 1).fill(0) });
  const modified = withSnapshotRows(rows);
  assert.throws(() => encodeArtifacts(modified), /vector đúng 384 chiều/);
  assert.throws(() => validateArtifacts(modified, artifacts), /vector đúng 384 chiều/);
});

test('validator rejects a wrong byte offset even if the checksum matches', () => {
  const index = JSON.parse(artifacts[FILES.index]);
  index[snapshot.papers[1].paperId].byteOffset += 4;
  const modified = withUpdatedArtifact(FILES.index, jsonBytes(index));
  assert.throws(() => validateArtifacts(sources, modified), /sai row hoặc byteOffset/);
});

test('validator rejects a truncated binary even if the checksum matches', () => {
  const modified = withUpdatedArtifact(FILES.embeddings, artifacts[FILES.embeddings].subarray(0, -1));
  assert.throws(() => validateArtifacts(sources, modified), /11519999 byte, cần 11520000 byte/);
});

test('validator rejects a binary change both with a stale and with a refreshed checksum', () => {
  const bytes = Buffer.from(artifacts[FILES.embeddings]);
  bytes.writeFloatLE(2, 4);
  assert.throws(() => validateArtifacts(sources, { ...artifacts, [FILES.embeddings]: bytes }), /sai kích thước hoặc SHA-256/);
  assert.throws(() => validateArtifacts(sources, withUpdatedArtifact(FILES.embeddings, bytes)), /sai giá trị Float32 tại chiều 1/);
});

test('validator rejects a missing index ID and a duplicate JSON key', () => {
  const index = JSON.parse(artifacts[FILES.index]);
  const { paperId } = snapshot.papers[0];
  index.extra = index[paperId];
  delete index[paperId];
  assert.throws(() => validateArtifacts(sources, withUpdatedArtifact(FILES.index, jsonBytes(index))), /thiếu ID/);
  const original = artifacts[FILES.index].toString('utf8');
  const duplicate = Buffer.from(`{"${paperId}":{"row":0,"byteOffset":0},${original.slice(1)}`);
  assert.throws(() => validateArtifacts(sources, withUpdatedArtifact(FILES.index, duplicate)), /sai mã hóa JSON chuẩn/);
});

test('validator checks visualization ID, title, primary category, and all coordinates', () => {
  const points = JSON.parse(artifacts[FILES.visualization]);
  const first = points[0];
  for (const [changes, message] of [
    [{ paperId: points[1].paperId }, /hàng 0 cần ID/],
    [{ title: 'changed' }, /sai title/],
    [{ primaryCategory: 'cs.AI' }, /sai title/],
    [{ point: { ...first.point, z: 4 } }, /sai tọa độ 3D/],
  ]) {
    const changed = points.with(0, { ...first, ...changes });
    assert.throws(() => validateArtifacts(sources, withUpdatedArtifact(FILES.visualization, jsonBytes(changed))), message);
  }
});
