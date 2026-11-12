import fs from "node:fs/promises";

import { embedTexts } from "../apps/api/lib/embedding-runtime.mjs";
import { cosineSimilarity } from "../packages/core/src/vector.ts";

const snapshot = JSON.parse(
  await fs.readFile("data/semantic-snapshot.json", "utf8"),
);

if (!Array.isArray(snapshot.papers) || snapshot.papers.length === 0) {
  throw new Error("Semantic snapshot không có dữ liệu bài báo.");
}

const cases = [
  {
    query: "neural networks for segmenting biomedical images",
    expected: "1505.04597",
  },
  {
    query: "mô hình ngôn ngữ và attention",
    expected: "1706.03762",
  },
  {
    query: "dùng hai mạng đối kháng để tạo dữ liệu",
    expected: "1406.2661",
  },
  {
    query: "học cấu trúc protein bằng đồ thị ba chiều",
    expected: "2007.06252",
  },
  {
    query: "image generation through iterative denoising",
    expected: "2006.11239",
  },
  {
    query: "low rank adaptation of language models",
    expected: "2106.09685",
  },
];

const externalFetch = globalThis.fetch;

globalThis.fetch = () => {
  throw new Error("Network disabled during real-model evaluation");
};

const results = [];

try {
  for (const item of cases) {
    const start = performance.now();

    const [vector] = await embedTexts(process.cwd(), ["query: " + item.query]);

    if (!vector || vector.length !== 384) {
      throw new Error("Query embedding không hợp lệ: " + item.query);
    }

    const ranks = snapshot.papers
      .map((paper) => ({
        id: paper.paperId,
        score: cosineSimilarity(vector, paper.vector),
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    const foundIndex = ranks.findIndex((paper) => paper.id === item.expected);

    const rank = foundIndex === -1 ? null : foundIndex + 1;

    results.push({
      ...item,
      rank,
      found: rank !== null,
      reciprocalRank: rank === null ? 0 : 1 / rank,
      top3: ranks.slice(0, 3),
      ms: performance.now() - start,
    });
  }
} finally {
  globalThis.fetch = externalFetch;
}

const report = {
  model: snapshot.model,
  offline: true,
  caseCount: cases.length,
  scope:
    "6 development smoke judgments, not held-out academic relevance evaluation.",

  mrr:
    results.reduce((sum, result) => sum + result.reciprocalRank, 0) /
    results.length,

  recallAt3:
    results.filter((result) => result.rank !== null && result.rank <= 3)
      .length / results.length,

  missingExpected: results
    .filter((result) => !result.found)
    .map((result) => result.expected),

  results,
};

await fs.mkdir(".local", { recursive: true });

await fs.writeFile(
  ".local/semantic-evaluation.json",
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
