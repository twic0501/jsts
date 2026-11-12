import fs from "node:fs/promises";

import { embedTexts } from "../apps/api/lib/embedding-runtime.mjs";
import { createPassageEmbeddingCache } from "../apps/api/lib/rag/embedding-cache.ts";

const root = process.cwd();

const originalFetch = globalThis.fetch;
let networkAttempts = 0;

globalThis.fetch = async () => {
  networkAttempts++;
  throw new Error("Network disabled for benchmark");
};

const cache = createPassageEmbeddingCache({
  maxEntries: 2000,
  dimensions: 384,
});

let embeddingCalls = 0;
let embeddedTexts = 0;

const passages = [
  "passage: Medical image segmentation uses deep learning to identify anatomical structures.",
  "passage: U-Net is commonly used for biomedical image segmentation.",
  "passage: Transformer models use attention mechanisms.",
  "passage: Climate change affects biodiversity and ecosystems.",
];

const embed = async (texts) => {
  embeddingCalls++;
  embeddedTexts += texts.length;

  return embedTexts(root, texts);
};

async function benchmark(name, texts) {
  const callsBefore = embeddingCalls;
  const textsBefore = embeddedTexts;
  const started = performance.now();

  const vectors = await cache(texts, embed);

  const elapsedMs = Math.round(performance.now() - started);

  if (
    vectors.length !== texts.length ||
    vectors.some((vector) => vector.length !== 384)
  ) {
    throw new Error(`${name}: Invalid embedding result.`);
  }

  return {
    name,
    elapsedMs,
    inputPassages: texts.length,
    newlyEmbeddedPassages: embeddedTexts - textsBefore,
    embeddingCalls: embeddingCalls - callsBefore,
    dimensions: vectors[0]?.length ?? 0,
  };
}

try {
  const cold = await benchmark("cold-run", passages);
  const warm = await benchmark("warm-run", passages);

  const updatedPassages = [
    passages[0],
    passages[1],
    passages[2],
    "passage: Graph neural networks model relationships between connected entities.",
  ];

  const partial = await benchmark("partial-update", updatedPassages);

  if (networkAttempts !== 0) {
    throw new Error("Unexpected network request.");
  }

  const report = {
    date: new Date().toISOString(),
    model: "Xenova/multilingual-e5-small",
    networkFetchDisabled: true,
    networkAttempts,
    results: [cold, warm, partial],
    summary: {
      coldEmbedded: cold.newlyEmbeddedPassages,
      warmEmbedded: warm.newlyEmbeddedPassages,
      partialEmbedded: partial.newlyEmbeddedPassages,
      savedEmbeddings: cold.newlyEmbeddedPassages - warm.newlyEmbeddedPassages,
    },
    scope: "Local embedding runtime and in-memory passage cache only.",
  };

  await fs.mkdir(".local", { recursive: true });

  await fs.writeFile(
    ".local/passage-cache-benchmark.json",
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
