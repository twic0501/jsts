import path from "node:path";
import fs from "node:fs/promises";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "apps", "api");
const TOP_K = 5;
const MAX_QUERIES = 15;

process.chdir(API_DIR);

const [{ getDataset }, { embedBatch }, { runResearch }, { rerankLocal }] =
  await Promise.all([
    import("../apps/api/lib/repository.ts"),
    import("../apps/api/lib/embedding.ts"),
    import("../apps/api/lib/rag/search.ts"),
    import("../apps/api/lib/rag/rerank-runtime.mjs"),
  ]);

function getPaperId(paper) {
  const id = paper?.id ?? paper?._id;

  if (id === undefined || id === null) {
    throw new Error("Paper không có id hợp lệ.");
  }

  return String(id);
}

function getResultPaperId(item) {
  const candidates = [
    item?.paperId,
    item?.paper_id,
    item?.documentId,
    item?.document_id,
    item?.paper?.id,
    item?.paper?._id,
    item?.document?.id,
    item?.document?._id,
    item?.source?.id,
    item?.metadata?.paperId,
    item?.metadata?.paper_id,
    item?.id,
  ];

  for (const value of candidates) {
    if (
      (typeof value === "string" || typeof value === "number") &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return null;
}

function createDependencies(dataset, useReranker, counters) {
  const dependencies = {
    dataset: async () => dataset,

    embed: async (texts) => {
      counters.embedCalls += 1;
      counters.embeddedTexts += texts.length;

      return embedBatch(texts);
    },

    provider: async () => {
      throw new Error("Library evaluation không được gọi provider.");
    },

    generate: async () => "",

    audit: async () => {},
  };

  if (useReranker) {
    dependencies.rerank = async (query, texts) => {
      counters.rerankCalls += 1;

      return rerankLocal(ROOT, query, texts);
    };
  }

  return dependencies;
}

function createEvaluationQueries(papers) {
  const count = Math.min(MAX_QUERIES, papers.length);
  const queries = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor((i * papers.length) / count);
    const paper = papers[index];

    if (!paper?.title) {
      continue;
    }

    queries.push({
      query: paper.title,
      relevantIds: [getPaperId(paper)],
    });
  }

  return queries;
}

function calculateMetrics(results, k = TOP_K) {
  let precisionSum = 0;
  let recallSum = 0;
  let reciprocalRankSum = 0;

  for (const result of results) {
    const relevantSet = new Set(result.relevantIds);
    const retrieved = result.retrievedIds.slice(0, k);

    let relevantRetrieved = 0;
    let reciprocalRank = 0;

    for (let i = 0; i < retrieved.length; i++) {
      if (relevantSet.has(retrieved[i])) {
        relevantRetrieved++;

        if (reciprocalRank === 0) {
          reciprocalRank = 1 / (i + 1);
        }
      }
    }

    precisionSum += relevantRetrieved / k;
    recallSum += relevantRetrieved / relevantSet.size;
    reciprocalRankSum += reciprocalRank;
  }

  const count = results.length || 1;

  return {
    precisionAt5: Number((precisionSum / count).toFixed(4)),
    recallAt5: Number((recallSum / count).toFixed(4)),
    mrrAt5: Number((reciprocalRankSum / count).toFixed(4)),
  };
}

async function evaluateConfiguration(dataset, queries, useReranker) {
  const counters = {
    embedCalls: 0,
    embeddedTexts: 0,
    rerankCalls: 0,
  };

  const dependencies = createDependencies(dataset, useReranker, counters);

  const results = [];

  console.log(`\nEvaluating ${useReranker ? "RERANKED" : "BASELINE"}...`);

  for (let i = 0; i < queries.length; i++) {
    const testCase = queries[i];

    const response = await runResearch(
      {
        query: testCase.query,
        scope: "library",
        topK: TOP_K,
      },
      dependencies,
    );

    const items = response.result?.items ?? [];

    const retrievedIds = items
      .map(getResultPaperId)
      .filter((id) => id !== null);

    if (retrievedIds.length !== items.length) {
      throw new Error(
        `Không xác định được paper ID ở query ${i + 1}. ` +
          `Các thuộc tính kết quả: ${Object.keys(items[0] ?? {}).join(", ")}`,
      );
    }

    results.push({
      query: testCase.query,
      relevantIds: testCase.relevantIds,
      retrievedIds,
      hit: retrievedIds.some((id) => testCase.relevantIds.includes(id)),
    });

    console.log(
      `[${i + 1}/${queries.length}] ` +
        `${results[results.length - 1].hit ? "HIT" : "MISS"} ` +
        `${testCase.query}`,
    );
  }

  return {
    configuration: useReranker ? "reranked" : "baseline",
    metrics: calculateMetrics(results),
    counters,
    details: results,
  };
}

async function main() {
  console.log("Loading local dataset...");

  const loaded = await getDataset();

  const dataset = {
    corpus: loaded.corpus,
    snapshot: loaded.index.snapshot,
  };

  const papers = dataset.corpus.papers;

  if (papers.length === 0) {
    throw new Error("Dataset không có paper.");
  }

  const queries = createEvaluationQueries(papers);

  if (queries.length === 0) {
    throw new Error("Không tạo được evaluation queries.");
  }

  console.log(`Loaded ${papers.length} papers.`);
  console.log(`Created ${queries.length} evaluation queries.`);

  // Chạy baseline trước.
  const baseline = await evaluateConfiguration(dataset, queries, false);

  // Sau đó chạy retrieval có reranker.
  const reranked = await evaluateConfiguration(dataset, queries, true);

  const output = {
    benchmark: "Paper Galaxy Retrieval Evaluation",
    dataset: {
      paperCount: papers.length,
      queryCount: queries.length,
    },
    topK: TOP_K,
    baseline: {
      metrics: baseline.metrics,
      counters: baseline.counters,
    },
    reranked: {
      metrics: reranked.metrics,
      counters: reranked.counters,
    },
    comparison: {
      precisionAt5: Number(
        (reranked.metrics.precisionAt5 - baseline.metrics.precisionAt5).toFixed(
          4,
        ),
      ),
      recallAt5: Number(
        (reranked.metrics.recallAt5 - baseline.metrics.recallAt5).toFixed(4),
      ),
      mrrAt5: Number(
        (reranked.metrics.mrrAt5 - baseline.metrics.mrrAt5).toFixed(4),
      ),
    },
    queries: queries.map((item, index) => ({
      query: item.query,
      relevantIds: item.relevantIds,
      baseline: {
        retrievedIds: baseline.details[index].retrievedIds,
        hit: baseline.details[index].hit,
      },
      reranked: {
        retrievedIds: reranked.details[index].retrievedIds,
        hit: reranked.details[index].hit,
      },
    })),
    notes: [
      "Queries are generated from paper titles.",
      "Each source paper ID is treated as the relevant document.",
      "This is an initial automatic evaluation, not human-verified ground truth.",
      "Precision@5 uses 5 as the denominator.",
      "Recall@5 measures retrieved relevant documents divided by known relevant documents.",
      "MRR@5 measures the reciprocal rank of the first relevant document.",
      "External providers are disabled.",
      "This evaluates retrieval and reranking, not answer generation.",
    ],
  };

  const outputPath = path.join(ROOT, "data", "retrieval-evaluation.json");

  await fs.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log("\n========== EVALUATION SUMMARY ==========");
  console.log(
    JSON.stringify(
      {
        baseline: baseline.metrics,
        reranked: reranked.metrics,
        improvement: output.comparison,
      },
      null,
      2,
    ),
  );

  console.log(`\nFull report saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Retrieval evaluation failed:");
  console.error(error);
  process.exitCode = 1;
});
