import path from "node:path";
import { performance } from "node:perf_hooks";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "apps", "api");

// embedding.ts tìm worker tương đối từ apps/api.
process.chdir(API_DIR);

const [{ getDataset }, { embedBatch }, { runResearch }, { rerankLocal }] =
  await Promise.all([
    import("../apps/api/lib/repository.ts"),
    import("../apps/api/lib/embedding.ts"),
    import("../apps/api/lib/rag/search.ts"),
    import("../apps/api/lib/rag/rerank-runtime.mjs"),
  ]);

const input = {
  query: "medical image segmentation",
  scope: "library",
  topK: 5,
};

function createCounters() {
  return {
    embedBatchCalls: 0,
    passageTexts: 0,
    queryTexts: 0,
    otherTexts: 0,
    rerankCalls: 0,
    rerankMs: 0,
  };
}

function createDependencies(dataset, counters) {
  return {
    dataset: async () => dataset,

    embed: async (texts) => {
      counters.embedBatchCalls += 1;

      for (const text of texts) {
        if (text.startsWith("passage:")) {
          counters.passageTexts += 1;
        } else if (text.startsWith("query:")) {
          counters.queryTexts += 1;
        } else {
          counters.otherTexts += 1;
        }
      }

      return embedBatch(texts);
    },

    // Scope library không được gọi provider bên ngoài.
    provider: async () => {
      throw new Error("Benchmark library không được gọi external provider.");
    },

    // Query benchmark có 3 từ để tránh bước lập kế hoạch query.
    // Nếu pipeline cần generate, trả chuỗi rỗng để pipeline xử lý fallback.
    generate: async () => "",

    audit: async () => {},

    rerank: async (query, texts) => {
      counters.rerankCalls += 1;

      const started = performance.now();

      try {
        return await rerankLocal(ROOT, query, texts);
      } finally {
        counters.rerankMs += performance.now() - started;
      }
    },
  };
}

async function runBenchmark(name, dataset) {
  const counters = createCounters();
  const started = performance.now();

  const response = await runResearch(
    input,
    createDependencies(dataset, counters),
  );

  const elapsedMs = performance.now() - started;

  return {
    name,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    inputPapers: dataset.corpus.papers.length,
    passageTextsSentToEmbedBatch: counters.passageTexts,
    queryTextsSentToEmbedBatch: counters.queryTexts,
    otherTextsSentToEmbedBatch: counters.otherTexts,
    embedBatchCalls: counters.embedBatchCalls,
    rerankCalls: counters.rerankCalls,
    rerankMs: Number(counters.rerankMs.toFixed(2)),
    resultCount: response.result?.total ?? null,
    returnedItems: response.result?.items?.length ?? null,
  };
}

async function main() {
  console.log("Loading local dataset...");

  const loaded = await getDataset();

  const base = {
    corpus: loaded.corpus,
    snapshot: loaded.index.snapshot,
  };

  if (!base.corpus.papers.length) {
    throw new Error("Dataset không có paper để benchmark.");
  }

  console.log(`Loaded ${base.corpus.papers.length} papers.`);

  // 1. Cold run: passage cache chưa có dữ liệu trong process này.
  const cold = await runBenchmark("cold-run", base);

  // 2. Warm run: giữ nguyên dataset để tái sử dụng passage cache.
  const warm = await runBenchmark("warm-run", base);

  // 3. Partial update: chỉ thay đổi abstract của một paper.
  const firstPaper = base.corpus.papers[0];

  const updatedPaper = {
    ...firstPaper,
    abstract:
      `${firstPaper.abstract ?? ""}\n` +
      "Benchmark update: additional information about medical image segmentation.",
  };

  const updatedCorpus = {
    ...base.corpus,
    papers: base.corpus.papers.map((paper, index) =>
      index === 0 ? updatedPaper : paper,
    ),
  };

  const updatedDataset = {
    ...base,
    corpus: updatedCorpus,
  };

  const partial = await runBenchmark("partial-update", updatedDataset);

  const output = {
    benchmark: "Paper Galaxy full RAG retrieval",
    query: input.query,
    scope: input.scope,
    networkProviderCalls: 0,
    results: [cold, warm, partial],
    summary: {
      coldPassages: cold.passageTextsSentToEmbedBatch,
      warmPassages: warm.passageTextsSentToEmbedBatch,
      partialUpdatePassages: partial.passageTextsSentToEmbedBatch,
      warmPassagesAvoided:
        cold.passageTextsSentToEmbedBatch - warm.passageTextsSentToEmbedBatch,
    },
    notes: [
      "Passage counts are texts sent to embedBatch by the passage cache.",
      "embedBatch has its own in-memory vector cache.",
      "Query embeddings are counted separately from passage embeddings.",
      "The benchmark runs in one Node process to preserve the passage cache.",
      "External providers are disabled by using library scope.",
      "This benchmark measures retrieval, embedding and reranking; it does not measure the complete HTTP API flow.",
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("RAG benchmark failed:");
  console.error(error);
  process.exitCode = 1;
});
