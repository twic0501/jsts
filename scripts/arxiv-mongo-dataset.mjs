import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Binary } from 'mongodb';
import { corpusSchema } from '../packages/core/src/contracts.ts';
import { projectPca } from '../packages/core/src/vector.ts';
import { FILES, jsonBytes, ROW_BYTES, sha256 } from './arxiv-artifact-format.mjs';
import { loadValidatedArtifacts } from './arxiv-artifact-input.mjs';

const STORAGE_SCHEMA = 'versioned-v1';
const ACTIVE_ID = 'jsts-active';
const MANAGED = new Set(['datasets', 'papers', 'embeddings']);
const REVIEW_NAME = /^jsts_data02_review_[a-z0-9_]{1,36}$/;
const TRANSACTION = { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } };
const text = { bsonType: 'string', minLength: 1 };
const row = { bsonType: 'int', minimum: 0 };
const schema = properties => ({ $jsonSchema: { bsonType: 'object', required: Object.keys(properties), properties } });
const validators = {
  datasets: schema({
    active: { enum: [true] }, storageSchema: { enum: [STORAGE_SCHEMA] }, version: text, title: text,
    fetchedAt: text, count: { bsonType: 'int', minimum: 1 }, fingerprint: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
    semantic: { bsonType: 'object' },
  }),
  papers: schema({
    datasetVersion: text, row, id: text, title: text, abstract: text, summary: text,
    categories: { bsonType: 'array' }, group: { enum: ['ai', 'biology', 'medicine', 'physics'] }, year: { bsonType: 'int' },
  }),
  embeddings: { $and: [
    schema({
      datasetVersion: text, row, paperId: text, textHash: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
      point: { bsonType: 'object', required: ['x', 'y', 'z'], additionalProperties: false,
        properties: Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, {
          bsonType: ['double', 'int'], minimum: -100, maximum: 100,
        }])) },
      vector: { bsonType: 'binData' },
    }),
    { $expr: { $cond: [
      { $eq: [{ $type: '$vector' }, 'binData'] }, { $eq: [{ $binarySize: '$vector' }, ROW_BYTES] }, false,
    ] } },
  ] },
};

export function checkLocalTarget(uri) {
  const url = new URL(uri);
  if (url.protocol !== 'mongodb:' || url.hostname !== '127.0.0.1' || !url.port ||
      url.username || url.password || url.search || url.hash || !REVIEW_NAME.test(url.pathname.slice(1))) {
    throw new Error('Expected mongodb://127.0.0.1:<port>/jsts_data02_review_<name>');
  }
  return url.pathname.slice(1);
}

function reviewDatabase(client) {
  const { hosts, dbName, directConnection, srvHost } = client.options;
  if (srvHost || !directConnection || hosts.length !== 1 || hosts[0].host !== '127.0.0.1' || !REVIEW_NAME.test(dbName)) {
    throw new Error('Review requires a direct loopback connection and a dedicated review database');
  }
  return client.db();
}

export async function prepareDataset(directory) {
  const { sources, files } = await loadValidatedArtifacts(directory);
  const { papers: entries, ...semantic } = sources.snapshot;
  const corpus = corpusSchema.parse({
    version: semantic.corpusVersion, title: 'JSTS arXiv-7500', fetchedAt: semantic.createdAt, papers: sources.papers,
  });
  const manifest = JSON.parse(await readFile(new URL('../data/model-manifest.json', import.meta.url)));
  if (semantic.model.id !== manifest.modelId || semantic.model.revision !== manifest.revision ||
      semantic.model.dimensions !== manifest.dimensions || semantic.model.pipelineVersion !== manifest.pipelineVersion ||
      semantic.model.dtype !== manifest.dtype) throw new Error('Snapshot model differs from the API model manifest');

  const hashes = new Map(corpus.papers.map(paper => [paper.id, sha256('passage: ' + paper.title + '\n' + paper.abstract)]));
  for (const entry of entries) {
    if (entry.textHash !== hashes.get(entry.paperId)) throw new Error('Incorrect textHash for ' + entry.paperId);
    const point = projectPca(entry.vector, semantic.projection);
    if (Math.hypot(point.x - entry.point.x, point.y - entry.point.y, point.z - entry.point.z) > 1e-5 ||
        Math.abs(Math.hypot(...entry.vector) - 1) > 0.001) throw new Error('Incorrect projection or norm for ' + entry.paperId);
  }

  const { papers: _, ...header } = corpus;
  const fingerprint = sha256(jsonBytes({
    storageSchema: STORAGE_SCHEMA, corpus: header, semantic: semantic.version,
    sources: Object.fromEntries(Object.entries(sources.inputs).map(([name, input]) => [name, input.lfSha256])),
    embeddings: sha256(files[FILES.embeddings]),
  }));
  const paperRows = corpus.papers.map((paper, row) => ({ ...paper, datasetVersion: corpus.version, row }));
  const embeddingRows = entries.map(({ paperId, textHash, point }, row) => ({
    datasetVersion: corpus.version, paperId, row, textHash, point,
    vector: new Binary(files[FILES.embeddings].subarray(row * ROW_BYTES, (row + 1) * ROW_BYTES)),
  }));
  const metadata = {
    _id: ACTIVE_ID, active: true, storageSchema: STORAGE_SCHEMA, ...header,
    count: paperRows.length, fingerprint, semantic,
  };
  return { corpus, snapshot: sources.snapshot, metadata, paperRows, embeddingRows };
}

async function checkTarget(db, dataset) {
  const collections = await db.listCollections().toArray();
  if (collections.some(collection => !MANAGED.has(collection.name))) throw new Error('Target has unrelated collections');
  for (const collection of collections) {
    if (!isDeepStrictEqual(collection.options.validator, validators[collection.name])) {
      throw new Error('Target collection has incompatible validation: ' + collection.name);
    }
  }
  const version = dataset.metadata.version;
  const [pointer, otherPaper, otherEmbedding] = await Promise.all([
    db.collection('datasets').find({}).limit(2).toArray(),
    db.collection('papers').findOne({ datasetVersion: { $ne: version } }, { projection: { _id: 1 } }),
    db.collection('embeddings').findOne({ datasetVersion: { $ne: version } }, { projection: { _id: 1 } }),
  ]);
  if (pointer.length > 1 || otherPaper || otherEmbedding) throw new Error('Target contains a different or legacy dataset');
  if (pointer[0] && !isDeepStrictEqual(pointer[0], dataset.metadata)) throw new Error('Target active dataset or fingerprint differs');
  if (!pointer.length) {
    const counts = await Promise.all(['papers', 'embeddings'].map(name => db.collection(name).countDocuments()));
    if (counts.some(Boolean)) throw new Error('Target contains rows without an active dataset. Inspect before retrying.');
  }
  return Boolean(pointer.length);
}

async function verifyRows(db, dataset, options = {}) {
  const scope = { datasetVersion: dataset.metadata.version };
  const counts = {};
  for (const [name, expected] of [['papers', dataset.paperRows], ['embeddings', dataset.embeddingRows]]) {
    const stored = await db.collection(name).find(scope, { ...options, projection: { _id: 0 } }).sort({ row: 1 }).toArray();
    if (stored.length !== expected.length) throw new Error(name + ': incorrect row count ' + stored.length);
    for (let i = 0; i < expected.length; i++) {
      const actual = stored[i];
      const reference = expected[i];
      if (name === 'embeddings') {
        const { vector, ...fields } = actual;
        const { vector: expectedVector, ...expectedFields } = reference;
        if (vector instanceof Binary && vector.sub_type === Binary.SUBTYPE_DEFAULT &&
            Buffer.from(vector.value()).equals(Buffer.from(expectedVector.value())) &&
            isDeepStrictEqual(fields, expectedFields)) continue;
      } else if (isDeepStrictEqual(actual, reference)) continue;
      throw new Error(name + ': unexpected content at row ' + i);
    }
    counts[name] = stored.length;
  }
  return counts;
}

async function indexes(db) {
  await db.collection('datasets').createIndex({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });
  await db.collection('papers').createIndexes([
    { key: { datasetVersion: 1, id: 1 }, unique: true },
    { key: { datasetVersion: 1, row: 1 }, unique: true },
    { key: { datasetVersion: 1, group: 1, year: -1 } },
  ]);
  await db.collection('embeddings').createIndexes([
    { key: { datasetVersion: 1, paperId: 1 }, unique: true },
    { key: { datasetVersion: 1, row: 1 }, unique: true },
  ]);
}

async function setupCollections(db) {
  for (const [name, validator] of Object.entries(validators)) {
    await db.createCollection(name, { validator }).catch(error => {
      if (error.code !== 48) throw error; // NamespaceExists, which checkTarget verifies.
    });
  }
}

export async function importDataset(client, dataset, { dryRun = false, afterPapers } = {}) {
  const db = reviewDatabase(client);
  const targetExists = await checkTarget(db, dataset);
  const expected = { papers: dataset.paperRows.length, embeddings: dataset.embeddingRows.length };
  if (targetExists) return { action: 'unchanged', dryRun, ...(await verifyRows(db, dataset)) };
  if (dryRun) return { action: 'would-import', dryRun, ...expected };
  const hello = await db.command({ hello: 1 });
  if (!hello.setName) throw new Error('Import requires a local replica set for atomic activation and rollback');
  await setupCollections(db);
  if (await checkTarget(db, dataset)) return { action: 'unchanged', dryRun, ...(await verifyRows(db, dataset)) };
  await indexes(db);
  return client.withSession(session => session.withTransaction(async () => {
    if (await db.collection('datasets').findOne({}, { session })) {
      throw new Error('Dataset was activated concurrently. Retry and verify the existing data.');
    }
    // MongoDB transactions require sequential operations on the same session.
    for (const [name, rows] of [['papers', dataset.paperRows], ['embeddings', dataset.embeddingRows]]) {
      for (let start = 0; start < rows.length; start += 500) {
        await db.collection(name).insertMany(rows.slice(start, start + 500), { session, forceServerObjectId: true });
      }
      if (name === 'papers') await afterPapers?.();
    }
    const counts = await verifyRows(db, dataset, { session });
    await db.collection('datasets').insertOne(dataset.metadata, { session });
    return { action: 'imported', dryRun, ...counts };
  }, TRANSACTION));
}

export async function rollbackDataset(client, dataset) {
  const db = reviewDatabase(client);
  if (!(await checkTarget(db, dataset))) return { action: 'already-empty' };
  const scope = { datasetVersion: dataset.metadata.version };
  return client.withSession(session => session.withTransaction(async () => {
    await verifyRows(db, dataset, { session });
    const metadata = await db.collection('datasets').deleteOne({ _id: ACTIVE_ID, fingerprint: dataset.metadata.fingerprint }, { session });
    if (metadata.deletedCount !== 1) throw new Error('Active dataset changed; rollback cancelled');
    const papers = await db.collection('papers').deleteMany(scope, { session });
    const embeddings = await db.collection('embeddings').deleteMany(scope, { session });
    if (papers.deletedCount !== dataset.paperRows.length || embeddings.deletedCount !== dataset.embeddingRows.length) {
      throw new Error('Counts changed; rollback cancelled');
    }
    return { action: 'rolled-back', papers: papers.deletedCount, embeddings: embeddings.deletedCount };
  }, TRANSACTION));
}

export async function writeFallback(directory, dataset) {
  await mkdir(directory);
  for (const [name, value] of [['corpus.json', dataset.corpus], ['semantic-snapshot.json', dataset.snapshot]]) {
    await writeFile(join(directory, name), jsonBytes(value), { flag: 'wx' });
  }
}
