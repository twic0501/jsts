import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient, Binary } from 'mongodb';
import { corpusSchema, type Corpus, SemanticIndex, semanticSnapshotSchema } from '@paper-galaxy/core';

export type StorageMode = 'json' | 'mongodb';
let client: MongoClient | undefined;
let cached: { corpus: Corpus; index: SemanticIndex; storage: StorageMode } | undefined;
let pending: Promise<NonNullable<typeof cached>> | undefined;

export async function getDataset() {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const uri = process.env.MONGODB_URI;
    const storage: StorageMode = uri ? 'mongodb' : 'json';
    const root = path.resolve(process.cwd(), '../..');
    let raw: unknown;
    let semanticRaw: unknown;
    if (uri) {
      client ??= new MongoClient(uri, { serverSelectionTimeoutMS: 2500, maxPoolSize: 5 });
      const db = client.db();
      const metadata = await db.collection('datasets').findOne({ active: true });
      if (!metadata) throw new Error('MongoDB chưa có corpus. Chạy pnpm db:seed.');
      const versioned = metadata.storageSchema === 'versioned-v1';
      const scope = versioned ? { datasetVersion: metadata.version } : {};
      const order = versioned ? { row: 1 } as const : { $natural: 1 } as const;
      const [papers, embeddings] = await Promise.all([
        db.collection('papers').find(scope, { projection: { _id: 0, datasetVersion: 0, row: 0 } }).sort(order).toArray(),
        db.collection('embeddings').find(scope, { projection: { _id: 0 } }).sort(order).toArray(),
      ]);
      raw = { version: metadata.version, title: metadata.title, fetchedAt: metadata.fetchedAt, papers };
      semanticRaw = {
        ...metadata.semantic,
        papers: embeddings.map(embedding => {
          const bytes = embedding.vector instanceof Binary ? Buffer.from(embedding.vector.value()) : undefined;
          if (!bytes || bytes.length !== 384 * 4) throw new Error('Mongo vector sai định dạng.');
          return {
            paperId: embedding.paperId, textHash: embedding.textHash, point: embedding.point,
            vector: Array.from({ length: 384 }, (_, i) => bytes.readFloatLE(i * 4)),
          };
        }),
      };
    } else {
      const dir = process.env.JSTS_DATASET_DIR || path.join(root, 'data');
      const [corpusJson, snapshotJson] = await Promise.all([
        readFile(path.join(dir, 'corpus.json'), 'utf8'),
        readFile(path.join(dir, 'semantic-snapshot.json'), 'utf8'),
      ]);
      raw = JSON.parse(corpusJson);
      semanticRaw = JSON.parse(snapshotJson);
    }
    const corpus = corpusSchema.parse(raw);
    const snapshot = semanticSnapshotSchema.parse(semanticRaw);
    const hashes = new Map(snapshot.papers.map(paper => [paper.paperId, paper.textHash]));
    for (const paper of corpus.papers) {
      const hash = createHash('sha256').update('passage: ' + paper.title + '\n' + paper.abstract).digest('hex');
      if (hashes.get(paper.id) !== hash) throw new Error('Nội dung paper không khớp embedding.');
    }
    const manifest = JSON.parse(await readFile(path.join(root, 'data/model-manifest.json'), 'utf8'));
    if (snapshot.model.id !== manifest.modelId || snapshot.model.revision !== manifest.revision ||
        snapshot.model.pipelineVersion !== manifest.pipelineVersion) {
      throw new Error('Model revision không khớp vector.');
    }
    const result = { corpus, index: new SemanticIndex(corpus, snapshot), storage };
    cached = result;
    return result;
  })();
  try {
    return await pending;
  } finally {
    pending = undefined;
  }
}
