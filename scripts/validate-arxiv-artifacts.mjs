import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import {
  artifactDigest, AXES, BINARY_BYTES, checkSources, DATA_FILES, DIMENSIONS, FILES,
  jsonBytes, manifestMetadata, parseDirectoryArg, readBaselineSources, RECORD_COUNT, ROW_BYTES,
} from './arxiv-artifact-format.mjs';

function readJson(bytes, name) {
  const doc = JSON.parse(bytes.toString('utf8'));
  // Round-trip also detects repeated keys that JSON.parse would otherwise discard.
  if (!bytes.equals(jsonBytes(doc))) throw new Error(`${name} sai mã hóa JSON chuẩn của schema.`);
  return doc;
}

export function validateArtifacts(sources, files) {
  const metadata = checkSources(sources);
  const embeddings = files[FILES.embeddings];
  if (embeddings.length !== BINARY_BYTES) {
    throw new Error(`${FILES.embeddings} dài ${embeddings.length} byte, cần ${BINARY_BYTES} byte.`);
  }

  const manifest = readJson(files[FILES.manifest], FILES.manifest);
  const { artifacts, ...header } = manifest;
  if (!isDeepStrictEqual(header, manifestMetadata(sources))) {
    throw new Error('Manifest sai phiên bản, cấu hình, số bản ghi hoặc checksum input (raw/LF).');
  }
  if (!artifacts || Object.keys(artifacts).length !== DATA_FILES.length) {
    throw new Error('Manifest phải liệt kê đúng ba artifact dữ liệu.');
  }
  for (const name of DATA_FILES) {
    if (!isDeepStrictEqual(artifacts[name], artifactDigest(files[name]))) {
      throw new Error(`${name} sai kích thước hoặc SHA-256 trong manifest.`);
    }
  }

  const points = readJson(files[FILES.visualization], FILES.visualization);
  if (!Array.isArray(points) || points.length !== RECORD_COUNT) {
    throw new Error(`${FILES.visualization} phải có ${RECORD_COUNT} hàng.`);
  }
  const index = readJson(files[FILES.index], FILES.index);
  if (!index || typeof index !== 'object' || Array.isArray(index) || Object.keys(index).length !== RECORD_COUNT) {
    throw new Error(`${FILES.index} phải có ${RECORD_COUNT} ID duy nhất.`);
  }

  let maxAbsFloat32RoundingError = 0;
  for (const [row, { paperId, point, vector }] of sources.snapshot.papers.entries()) {
    const actual = points[row];
    if (actual?.paperId !== paperId) {
      throw new Error(`${FILES.visualization} hàng ${row} cần ID ${paperId}, nhận ${actual?.paperId}.`);
    }
    const { title, categories } = metadata.get(paperId);
    if (actual.title !== title || actual.primaryCategory !== categories[0] || Object.keys(actual).length !== 4) {
      throw new Error(`${paperId} sai title, category chính hoặc cấu trúc visualization.`);
    }
    if (!actual.point || Object.keys(actual.point).length !== AXES.length ||
        !AXES.every(axis => actual.point[axis] === point[axis])) {
      throw new Error(`${paperId} sai tọa độ 3D.`);
    }

    if (!Object.hasOwn(index, paperId)) throw new Error(`${FILES.index} thiếu ID ${paperId}.`);
    const entry = index[paperId];
    if (entry?.row !== row || entry.byteOffset !== row * ROW_BYTES || Object.keys(entry).length !== 2) {
      throw new Error(`${paperId} sai row hoặc byteOffset (cần ${row} và ${row * ROW_BYTES}).`);
    }
    for (let component = 0; component < DIMENSIONS; component++) {
      const decoded = embeddings.readFloatLE(entry.byteOffset + component * 4);
      const expected = Math.fround(vector[component]);
      if (!Object.is(decoded, expected)) {
        throw new Error(`${paperId} sai giá trị Float32 tại chiều ${component}: cần ${expected}, nhận ${decoded}.`);
      }
      maxAbsFloat32RoundingError = Math.max(maxAbsFloat32RoundingError, Math.abs(decoded - vector[component]));
    }
  }

  return {
    passed: true,
    recordCount: RECORD_COUNT,
    componentsCompared: RECORD_COUNT * DIMENSIONS,
    embeddingBytes: embeddings.length,
    maxAbsErrorVsMathFround: 0,
    maxAbsFloat32RoundingError,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const dir = parseDirectoryArg('--artifact-dir', 'Dùng: node scripts/validate-arxiv-artifacts.mjs --artifact-dir <thư mục artifact>');
    if (dir !== null) {
      const sources = await readBaselineSources();
      const entries = await Promise.all(Object.values(FILES).map(async name => [name, await readFile(join(dir, name))]));
      console.log(JSON.stringify(validateArtifacts(sources, Object.fromEntries(entries)), null, 2));
    }
  } catch (error) {
    console.error(`DATA-02A validate: ${error.message}`);
    process.exitCode = 1;
  }
}
