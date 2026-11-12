import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { MongoClient } from "mongodb";

import {
  corpusSchema,
  validateSnapshot,
  embeddingText,
} from "@paper-galaxy/core";

const dataDirectory = path.resolve(process.cwd(), "data");

const [rawCorpus, rawSnapshot, manifest] = await Promise.all([
  fs.readFile(path.join(dataDirectory, "corpus.json"), "utf8"),
  fs.readFile(path.join(dataDirectory, "semantic-snapshot.json"), "utf8"),
  fs.readFile(path.join(dataDirectory, "model-manifest.json"), "utf8"),
]);

// 1. Kiểm tra cấu trúc corpus.
const corpus = corpusSchema.parse(JSON.parse(rawCorpus));

// 2. Kiểm tra semantic snapshot.
const snapshot = validateSnapshot(corpus, JSON.parse(rawSnapshot));

if (!corpus.papers.length) {
  throw new Error("Corpus không có bài báo.");
}

// 3. Kiểm tra model manifest.
const modelManifest = JSON.parse(manifest);

if (
  snapshot.model.revision !== modelManifest.revision ||
  snapshot.model.pipelineVersion !== modelManifest.pipelineVersion
) {
  throw new Error("Model manifest không khớp semantic snapshot.");
}

// 4. Kiểm tra số lượng và tính duy nhất của embedding.
const paperIds = new Set(corpus.papers.map((paper) => paper.id));

const embeddingMap = new Map(
  snapshot.papers.map((embedding) => [embedding.paperId, embedding]),
);

if (embeddingMap.size !== snapshot.papers.length) {
  throw new Error("Snapshot chứa paperId bị trùng.");
}

if (embeddingMap.size !== corpus.papers.length) {
  throw new Error("Số lượng paper và embedding không khớp.");
}

// 5. Kiểm tra textHash của từng bài báo.
for (const paper of corpus.papers) {
  const embedding = embeddingMap.get(paper.id);

  if (!embedding) {
    throw new Error(`Không tìm thấy embedding: ${paper.id}`);
  }

  const expectedHash = createHash("sha256")
    .update(embeddingText(paper))
    .digest("hex");

  if (embedding.textHash !== expectedHash) {
    throw new Error(`textHash không khớp: ${paper.id}`);
  }
}

// 6. Kết nối MongoDB sau khi dữ liệu đã hợp lệ.
const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/paper_galaxy",
  {
    serverSelectionTimeoutMS: 4000,
  },
);

try {
  await client.connect();

  const db = client.db();

  const paperIdsArray = [...paperIds];

  // 7. Lưu bài báo.
  await db.collection("papers").createIndex({ id: 1 }, { unique: true });

  await db.collection("papers").bulkWrite(
    corpus.papers.map((paper) => ({
      replaceOne: {
        filter: { id: paper.id },
        replacement: paper,
        upsert: true,
      },
    })),
  );

  await db.collection("papers").deleteMany({
    id: { $nin: paperIdsArray },
  });

  // 8. Lưu embedding.
  await db
    .collection("embeddings")
    .createIndex({ paperId: 1 }, { unique: true });

  await db.collection("embeddings").bulkWrite(
    snapshot.papers.map((embedding) => {
      const vectorBuffer = Buffer.alloc(384 * 4);

      embedding.vector.forEach((value, index) => {
        vectorBuffer.writeFloatLE(value, index * 4);
      });

      return {
        replaceOne: {
          filter: { paperId: embedding.paperId },
          replacement: {
            paperId: embedding.paperId,
            textHash: embedding.textHash,
            vector: vectorBuffer,
            point: embedding.point,
          },
          upsert: true,
        },
      };
    }),
  );

  await db.collection("embeddings").deleteMany({
    paperId: { $nin: paperIdsArray },
  });

  // 9. Lưu metadata dataset.
  const { papers: _, ...semanticMetadata } = snapshot;

  await db.collection("datasets").replaceOne(
    { active: true },
    {
      active: true,
      version: corpus.version,
      title: corpus.title,
      fetchedAt: corpus.fetchedAt,
      semantic: semanticMetadata,
    },
    { upsert: true },
  );

  console.log(
    `Seeded ${corpus.papers.length} papers and 384D embeddings into local MongoDB.`,
  );
} finally {
  await client.close();
}
