import fs from "node:fs/promises";
import { createHash } from "node:crypto";

import {
  embeddingText,
  fitPca3,
  projectPca,
  corpusSchema,
} from "@paper-galaxy/core";

import { embedTexts } from "../apps/api/lib/embedding-runtime.mjs";

const corpusRaw = await fs.readFile("data/corpus.json", "utf8");

const manifestRaw = await fs.readFile("data/model-manifest.json", "utf8");

// 1. Kiểm tra dữ liệu đầu vào.
const corpus = corpusSchema.parse(JSON.parse(corpusRaw));

const manifest = JSON.parse(manifestRaw);

if (
  manifest.modelId !== "Xenova/multilingual-e5-small" ||
  typeof manifest.revision !== "string" ||
  !manifest.revision ||
  typeof manifest.pipelineVersion !== "string" ||
  !manifest.pipelineVersion
) {
  throw new Error("Model manifest không hợp lệ.");
}

if (corpus.papers.length < 3) {
  throw new Error("Corpus cần ít nhất 3 bài báo để tạo PCA 3D.");
}

// 2. Tạo nội dung embedding thống nhất với Core.
const hash = (text) => createHash("sha256").update(text).digest("hex");

const passages = corpus.papers.map((paper) => embeddingText(paper));

// 3. Tạo embedding theo batch 3.
const vectors = [];

const start = performance.now();

for (let i = 0; i < passages.length; i += 3) {
  const batch = passages.slice(i, i + 3);

  const batchVectors = await embedTexts(process.cwd(), batch);

  vectors.push(...batchVectors);

  console.log(
    `Embedded ${Math.min(i + 3, passages.length)}/${passages.length}`,
  );
}

// 4. Kiểm tra số lượng vector.
if (
  vectors.length !== corpus.papers.length ||
  vectors.some((vector) => vector.length !== 384)
) {
  throw new Error("Số lượng hoặc kích thước embedding không hợp lệ.");
}

// 5. Tính PCA 3D.
const projection = fitPca3(vectors, 42);

// 6. Tạo semantic snapshot.
const snapshot = {
  version: "semantic-e5-q8-v1",

  corpusVersion: corpus.version,

  createdAt: new Date().toISOString(),

  corpusHash: hash(JSON.stringify(passages)),

  model: {
    id: manifest.modelId,
    revision: manifest.revision,
    dtype: manifest.dtype,
    dimensions: 384,
    pipelineVersion: manifest.pipelineVersion,
  },

  projection,

  papers: corpus.papers.map((paper, index) => ({
    paperId: paper.id,
    textHash: hash(passages[index]),
    vector: vectors[index],
    point: projectPca(vectors[index], projection),
  })),
};

// 7. Lưu snapshot.
await fs.writeFile(
  "data/semantic-snapshot.json",
  JSON.stringify(snapshot) + "\n",
);

// 8. Thống kê kết quả.
console.log(
  JSON.stringify({
    ms: performance.now() - start,
    papers: vectors.length,
    dimensions: vectors[0].length,
    explainedVariance: projection.explainedVariance,
  }),
);
