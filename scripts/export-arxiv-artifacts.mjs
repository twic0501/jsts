import { mkdir, open, rmdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  artifactDigest, BINARY_BYTES, checkSources, DIMENSIONS, FILES, jsonBytes,
  manifestMetadata, parseDirectoryArg, readBaselineSources, ROW_BYTES,
} from './arxiv-artifact-format.mjs';

export function encodeArtifacts(sources) {
  const metadata = checkSources(sources);
  const points = [];
  const index = Object.create(null);
  const embeddings = Buffer.alloc(BINARY_BYTES);

  for (const [row, { paperId, vector, point }] of sources.snapshot.papers.entries()) {
    const { title, categories } = metadata.get(paperId);
    const { x, y, z } = point;
    const byteOffset = row * ROW_BYTES;
    points.push({ paperId, title, primaryCategory: categories[0], point: { x, y, z } });
    index[paperId] = { row, byteOffset };
    for (let component = 0; component < DIMENSIONS; component++) {
      embeddings.writeFloatLE(vector[component], byteOffset + component * 4);
    }
  }

  const data = {
    [FILES.visualization]: jsonBytes(points),
    [FILES.embeddings]: embeddings,
    [FILES.index]: jsonBytes(index),
  };
  const artifacts = Object.fromEntries(Object.entries(data).map(([name, bytes]) => [name, artifactDigest(bytes)]));
  return { ...data, [FILES.manifest]: jsonBytes({ ...manifestMetadata(sources), artifacts }) };
}

async function writeArtifacts(outputDir, artifacts) {
  const dir = resolve(outputDir);
  await mkdir(dirname(dir), { recursive: true });
  await mkdir(dir);
  const created = [];
  try {
    // The manifest is written last so a partial export cannot pass validation.
    for (const [name, bytes] of Object.entries(artifacts)) {
      const path = join(dir, name);
      const file = await open(path, 'wx');
      created.push(path);
      try {
        await file.writeFile(bytes);
      } finally {
        await file.close();
      }
    }
  } catch (error) {
    const outcomes = await Promise.allSettled(created.map(path => unlink(path)));
    const cleanupErrors = outcomes.filter(outcome => outcome.status === 'rejected').map(outcome => outcome.reason);
    await rmdir(dir).catch(reason => cleanupErrors.push(reason));
    if (cleanupErrors.length) {
      throw new Error(`${error.message} Dọn thư mục đầu ra thất bại: ${cleanupErrors.map(reason => reason.message).join(' | ')}`);
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const outputDir = parseDirectoryArg('--out-dir', 'Dùng: node scripts/export-arxiv-artifacts.mjs --out-dir <thư mục mới>');
    if (outputDir !== null) {
      const artifacts = encodeArtifacts(await readBaselineSources());
      await writeArtifacts(outputDir, artifacts);
      const digests = Object.fromEntries(Object.entries(artifacts).map(([name, bytes]) => [name, artifactDigest(bytes)]));
      console.log(JSON.stringify({ passed: true, artifacts: digests }, null, 2));
    }
  } catch (error) {
    console.error(`DATA-02A export: ${error.message}`);
    process.exitCode = 1;
  }
}
