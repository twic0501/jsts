import path from "node:path";
import fs from "node:fs/promises";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "apps", "api");
const TOP_K = 5;

process.chdir(API_DIR);

const [{ getDataset }, { embedBatch }, { runResearch }, { rerankLocal }] =
  await Promise.all([
    import("../apps/api/lib/repository.ts"),
    import("../apps/api/lib/embedding.ts"),
    import("../apps/api/lib/rag/search.ts"),
    import("../apps/api/lib/rag/rerank-runtime.mjs"),
  ]);

// Ground truth ban đầu được xây dựng từ 30 paper trong dataset.
const EVALUATION_QUERIES = [
  {
    id: "Q01",
    topic: "Zero-shot image recognition",
    query:
      "How can visual recognition systems understand images using natural language descriptions without training on every category?",
    relevantIds: ["2103.00020"],
  },
  {
    id: "Q02",
    topic: "Image classification architectures",
    query:
      "Deep neural network architectures for recognizing objects and classifying images efficiently",
    relevantIds: ["1512.03385", "1602.07360", "2010.11929"],
  },
  {
    id: "Q03",
    topic: "Transformer architectures",
    query:
      "Neural architectures that use attention mechanisms to model relationships between elements in a sequence",
    relevantIds: ["1706.03762", "1810.04805", "2005.14165"],
  },
  {
    id: "Q04",
    topic: "Language understanding",
    query:
      "Bidirectional contextual representations for understanding the meaning of words in natural language",
    relevantIds: ["1810.04805"],
  },
  {
    id: "Q05",
    topic: "Few-shot language models",
    query:
      "Large language models that learn to perform new tasks from only a few examples in their prompts",
    relevantIds: ["2005.14165"],
  },
  {
    id: "Q06",
    topic: "Efficient LLM fine-tuning",
    query:
      "Adapting pretrained language models to downstream tasks while reducing the number of trainable parameters",
    relevantIds: ["2106.09685"],
  },
  {
    id: "Q07",
    topic: "Generative models",
    query:
      "Deep generative neural networks that learn to produce realistic synthetic data and images",
    relevantIds: ["1406.2661", "2006.11239"],
  },
  {
    id: "Q08",
    topic: "Biomedical image segmentation",
    query:
      "Deep learning methods for identifying and separating anatomical structures in medical images at the pixel level",
    relevantIds: ["1505.04597"],
  },
  {
    id: "Q09",
    topic: "Medical image analysis",
    query:
      "Using artificial intelligence to analyze medical images and support automated diagnosis or clinical assessment",
    relevantIds: ["2402.04299", "2004.07064", "2610.32396", "2111.07355"],
  },
  {
    id: "Q10",
    topic: "X-ray and breast imaging",
    query:
      "Image acquisition and automated analysis techniques for detecting structures and abnormalities in radiographic images",
    relevantIds: ["1804.10812", "2011.05146", "2111.07355"],
  },
  {
    id: "Q11",
    topic: "Protein structure representation",
    query:
      "Machine learning representations that use three-dimensional protein geometry and structural information",
    relevantIds: ["2309.16519", "2007.06252", "1902.08661"],
  },
  {
    id: "Q12",
    topic: "Drug binding prediction",
    query:
      "Geometric deep learning approaches for predicting how small molecules bind to protein targets",
    relevantIds: ["2202.05146"],
  },
  {
    id: "Q13",
    topic: "Geometric equivariance",
    query:
      "Learning representations that remain consistent when three-dimensional objects are rotated or transformed",
    relevantIds: ["2512.02303", "2007.06252", "2202.05146"],
  },
  {
    id: "Q14",
    topic: "Active learning",
    query:
      "Selecting the most informative samples from a dataset to improve machine learning with limited labeling resources",
    relevantIds: ["2306.11715"],
  },
  {
    id: "Q15",
    topic: "Quantum machine learning",
    query:
      "Combining quantum computing and machine learning to build neural models and intelligent learning systems",
    relevantIds: ["2602.11092", "2110.03861", "2510.23237", "2306.09912"],
  },
  {
    id: "Q16",
    topic: "Quantum reinforcement learning",
    query:
      "Using reinforcement learning algorithms to solve optimization and decision-making problems on quantum computers",
    relevantIds: ["2501.15893", "2411.00230"],
  },
  {
    id: "Q17",
    topic: "Quantum federated learning",
    query:
      "Distributed machine learning across multiple participants using quantum computing and federated optimization",
    relevantIds: ["2306.09912"],
  },
  {
    id: "Q18",
    topic: "Dataset documentation",
    query:
      "Methods for documenting datasets to improve transparency, accountability, and responsible machine learning",
    relevantIds: ["1803.09010"],
  },
];

function getPaperId(paper) {
  const id = paper?.id ?? paper?._id;

  if (id === undefined || id === null) {
    throw new Error("Paper không có ID hợp lệ.");
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
      counters.embedCalls++;
      counters.embeddedTexts += texts.length;
      return embedBatch(texts);
    },

    provider: async () => {
      throw new Error("Semantic evaluation không được gọi external provider.");
    },

    generate: async () => "",
    audit: async () => {},
  };

  if (useReranker) {
    dependencies.rerank = async (query, texts) => {
      counters.rerankCalls++;
      return rerankLocal(ROOT, query, texts);
    };
  }

  return dependencies;
}

function calculateMetrics(results) {
  let precisionSum = 0;
  let recallSum = 0;
  let reciprocalRankSum = 0;
  let hitCount = 0;

  for (const result of results) {
    const relevantSet = new Set(result.relevantIds);
    const retrieved = result.retrievedIds.slice(0, TOP_K);

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

    precisionSum += relevantRetrieved / TOP_K;
    recallSum += relevantRetrieved / relevantSet.size;
    reciprocalRankSum += reciprocalRank;

    if (relevantRetrieved > 0) {
      hitCount++;
    }
  }

  const count = results.length || 1;

  return {
    precisionAt5: Number((precisionSum / count).toFixed(4)),
    recallAt5: Number((recallSum / count).toFixed(4)),
    mrrAt5: Number((reciprocalRankSum / count).toFixed(4)),
    hitRateAt5: Number((hitCount / count).toFixed(4)),
    successfulQueries: hitCount,
    totalQueries: results.length,
  };
}

async function evaluateConfiguration(dataset, useReranker) {
  const counters = {
    embedCalls: 0,
    embeddedTexts: 0,
    rerankCalls: 0,
  };

  const dependencies = createDependencies(dataset, useReranker, counters);

  const results = [];

  console.log(`\nEvaluating ${useReranker ? "RERANKED" : "BASELINE"}...`);

  for (let i = 0; i < EVALUATION_QUERIES.length; i++) {
    const testCase = EVALUATION_QUERIES[i];

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
        `Không xác định được paper ID tại ${testCase.id}. ` +
          `Các thuộc tính: ${Object.keys(items[0] ?? {}).join(", ")}`,
      );
    }

    const relevantSet = new Set(testCase.relevantIds);

    const relevantRetrieved = retrievedIds.filter((id) => relevantSet.has(id));

    const result = {
      id: testCase.id,
      topic: testCase.topic,
      query: testCase.query,
      relevantIds: testCase.relevantIds,
      retrievedIds,
      relevantRetrieved,
      hit: relevantRetrieved.length > 0,
    };

    results.push(result);

    console.log(
      `[${i + 1}/${EVALUATION_QUERIES.length}] ` +
        `${result.hit ? "HIT" : "MISS"} ` +
        `${testCase.id} - ${testCase.topic} ` +
        `(${relevantRetrieved.length}/${testCase.relevantIds.length} relevant)`,
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
  const availableIds = new Set(papers.map(getPaperId));

  if (papers.length === 0) {
    throw new Error("Dataset không có paper.");
  }

  // Kiểm tra tất cả ID ground truth có tồn tại trong dataset.
  for (const testCase of EVALUATION_QUERIES) {
    for (const id of testCase.relevantIds) {
      if (!availableIds.has(id)) {
        throw new Error(
          `Ground truth ID ${id} của ${testCase.id} không tồn tại.`,
        );
      }
    }
  }

  console.log(`Loaded ${papers.length} papers.`);
  console.log(`Created ${EVALUATION_QUERIES.length} semantic queries.`);

  const baseline = await evaluateConfiguration(dataset, false);
  const reranked = await evaluateConfiguration(dataset, true);

  const comparison = {
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

    hitRateAt5: Number(
      (reranked.metrics.hitRateAt5 - baseline.metrics.hitRateAt5).toFixed(4),
    ),
  };

  const output = {
    benchmark: "Paper Galaxy Semantic Retrieval Evaluation",

    dataset: {
      paperCount: papers.length,
      queryCount: EVALUATION_QUERIES.length,
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

    comparison,

    queries: EVALUATION_QUERIES.map((query, index) => ({
      id: query.id,
      topic: query.topic,
      query: query.query,
      relevantIds: query.relevantIds,

      baseline: {
        retrievedIds: baseline.details[index].retrievedIds,
        relevantRetrieved: baseline.details[index].relevantRetrieved,
      },

      reranked: {
        retrievedIds: reranked.details[index].retrievedIds,
        relevantRetrieved: reranked.details[index].relevantRetrieved,
      },
    })),

    notes: [
      "Queries use topic descriptions instead of original paper titles.",
      "Ground truth is an initial manually curated label set based on paper titles and research topics.",
      "Ground truth has not been independently validated by domain experts.",
      "A query can have multiple relevant papers.",
      "Precision@5 uses 5 as the denominator.",
      "Recall@5 measures retrieved relevant documents divided by known relevant documents.",
      "MRR@5 measures the reciprocal rank of the first relevant document.",
      "HitRate@5 measures the proportion of queries with at least one relevant result.",
      "External providers are disabled.",
      "This evaluates retrieval and reranking, not answer generation.",
    ],
  };

  const outputPath = path.join(
    ROOT,
    "data",
    "semantic-retrieval-evaluation.json",
  );

  await fs.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log("\n========== SEMANTIC EVALUATION SUMMARY ==========");

  console.log(
    JSON.stringify(
      {
        baseline: baseline.metrics,
        reranked: reranked.metrics,
        improvement: comparison,
      },
      null,
      2,
    ),
  );

  console.log(`\nFull report saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Semantic retrieval evaluation failed:");
  console.error(error);
  process.exitCode = 1;
});
