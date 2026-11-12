import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { MongoClient, Binary } from "mongodb";

import {
  corpusSchema,
  embeddingText,
  type Corpus,
  SemanticIndex,
  validateSnapshot,
} from "@paper-galaxy/core";

export type StorageMode = "json" | "mongodb";

type Dataset = {
  corpus: Corpus;
  index: SemanticIndex;
  storage: StorageMode;
};

type ModelManifest = {
  revision: string;
  pipelineVersion: string;
};

let client: MongoClient | undefined;
let cached: Dataset | undefined;
let pending: Promise<Dataset> | undefined;

function createPaperTextHash(paper: Corpus["papers"][number]): string {
  return createHash("sha256").update(embeddingText(paper)).digest("hex");
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function loadRawDataset(): Promise<{
  raw: unknown;
  semanticRaw: unknown;
  storage: StorageMode;
}> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const dataDirectory = path.resolve(process.cwd(), "../../data");

    const [raw, semanticRaw] = await Promise.all([
      readJsonFile(path.join(dataDirectory, "corpus.json")),
      readJsonFile(path.join(dataDirectory, "semantic-snapshot.json")),
    ]);

    return {
      raw,
      semanticRaw,
      storage: "json",
    };
  }

  client ??= new MongoClient(uri, {
    serverSelectionTimeoutMS: 2500,
    connectTimeoutMS: 2500,
    maxPoolSize: 5,
  });

  await client.connect();

  const db = client.db();
  const queryOptions = {
    maxTimeMS: 5000,
    projection: { _id: 0 },
  };

  const metadata = await db
    .collection("datasets")
    .findOne({ active: true }, queryOptions);

  if (!metadata) {
    throw new Error("MongoDB chưa có corpus. Chạy pnpm db:seed.");
  }

  const [papers, embeddings] = await Promise.all([
    db.collection("papers").find({}, queryOptions).toArray(),
    db.collection("embeddings").find({}, queryOptions).toArray(),
  ]);

  const embeddingRecords = embeddings.map((embedding) => {
    const bytes =
      embedding.vector instanceof Binary
        ? Buffer.from(embedding.vector.buffer)
        : undefined;

    if (!bytes || bytes.length !== 384 * 4) {
      throw new Error(`MongoDB vector sai định dạng: ${embedding.paperId}`);
    }

    return {
      paperId: embedding.paperId,
      textHash: embedding.textHash,
      point: embedding.point,
      vector: Array.from({ length: 384 }, (_, index) =>
        bytes.readFloatLE(index * 4),
      ),
    };
  });

  return {
    raw: {
      version: metadata.version,
      title: metadata.title,
      fetchedAt: metadata.fetchedAt,
      papers,
    },
    semanticRaw: {
      ...metadata.semantic,
      papers: embeddingRecords,
    },
    storage: "mongodb",
  };
}

function validatePaperEmbeddings(
  corpus: Corpus,
  snapshot: ReturnType<typeof validateSnapshot>,
): void {
  const embeddingMap = new Map(
    snapshot.papers.map((embedding) => [embedding.paperId, embedding]),
  );

  if (embeddingMap.size !== snapshot.papers.length) {
    throw new Error("Semantic snapshot chứa paperId bị trùng.");
  }

  if (embeddingMap.size !== corpus.papers.length) {
    throw new Error("Số lượng paper và embedding không khớp.");
  }

  for (const paper of corpus.papers) {
    const embedding = embeddingMap.get(paper.id);

    if (!embedding) {
      throw new Error(`Không tìm thấy embedding cho paper: ${paper.id}`);
    }

    const expectedHash = createPaperTextHash(paper);

    if (embedding.textHash !== expectedHash) {
      throw new Error(`Nội dung paper không khớp embedding: ${paper.id}`);
    }
  }
}

async function validateModelManifest(
  snapshot: ReturnType<typeof validateSnapshot>,
): Promise<void> {
  const manifestPath = path.resolve(
    process.cwd(),
    "../../data/model-manifest.json",
  );

  const raw = await readJsonFile(manifestPath);

  if (
    typeof raw !== "object" ||
    raw === null ||
    !("revision" in raw) ||
    !("pipelineVersion" in raw) ||
    typeof raw.revision !== "string" ||
    typeof raw.pipelineVersion !== "string"
  ) {
    throw new Error("Model manifest không hợp lệ.");
  }

  const manifest = raw as ModelManifest;

  if (
    snapshot.model.revision !== manifest.revision ||
    snapshot.model.pipelineVersion !== manifest.pipelineVersion
  ) {
    throw new Error("Model revision không khớp vector.");
  }
}

export async function getDataset(): Promise<Dataset> {
  if (cached) {
    return cached;
  }

  if (pending) {
    return pending;
  }

  pending = (async () => {
    const { raw, semanticRaw, storage } = await loadRawDataset();

    const corpus = corpusSchema.parse(raw);
    const snapshot = validateSnapshot(corpus, semanticRaw);

    validatePaperEmbeddings(corpus, snapshot);

    await validateModelManifest(snapshot);

    const result: Dataset = {
      corpus,
      index: new SemanticIndex(corpus, snapshot),
      storage,
    };

    cached = result;

    return result;
  })();

  try {
    return await pending;
  } catch (error) {
    // Cho phép lần gọi tiếp theo tạo kết nối mới nếu MongoDB gặp lỗi.
    if (client) {
      const failedClient = client;
      client = undefined;

      await failedClient.close().catch(() => {});
    }

    throw error;
  } finally {
    pending = undefined;
  }
}
