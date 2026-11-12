import fs from "node:fs/promises";

import { embedTexts } from "../apps/api/lib/embedding-runtime.mjs";
import { createPassageEmbeddingCache } from "../apps/api/lib/rag/embedding-cache.ts";

const root = process.cwd();

const originalFetch = globalThis.fetch;
let networkAttempts = 0;

globalThis.fetch = async () => {
  networkAttempts++;

  throw new Error("Network disabled for passage cache benchmark");
};

const cache = createPassageEmbeddingCache({
  maxEntries: 2000,
  dimensions: 384,
});

let embeddingCalls = 0;
let embeddedTexts = 0;

const embed = async (texts) => {
  embeddingCalls++;
  embeddedTexts += texts.length;

  return embedTexts(root, texts);
};

const passages = [
  "passage: Medical image segmentation uses deep learning to identify anatomical structures in medical images.",
  "passage: U-Net is a convolutional neural network architecture commonly used for biomedical image segmentation.",
  "passage: Transformer models use attention mechanisms to capture relationships between tokens in a sequence.",
  "passage: Climate change affects biodiversity, ecosystems, and the distribution of species.",
];

function snapshot() {
  return {
    embeddingCalls,
    embeddedTexts,
  };
}

async function benchmark(name, texts) {
  const before = snapshot();
  const started = performance.now();

  const vectors = await cache(texts, embed);

  const elapsedMs = Math.round(performance.now() - started);

  if (
    vectors.length !== texts.length ||
    vectors.some((vector) => vector.length !== 384)
  ) {
    throw new Error(`${name}: Invalid embedding result.`);
  }

  const after = snapshot();

  return {
    name,
    elapsedMs,
    inputPassages: texts.length,
    newlyEmbeddedPassages: after.embeddedTexts - before.embeddedTexts,
    embeddingCalls: after.embeddingCalls - before.embeddingCalls,
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
    throw new Error("Unexpected network request detected.");
  }

  const report = {
    date: new Date().toISOString(),
    model: "Xenova/multilingual-e5-small",
    cache: {
      maxEntries: 2000,
      dimensions: 384,
    },
    networkFetchDisabled: true,
    networkAttempts,
    results: [cold, warm, partial],
    summary: {
      totalInputPassages: passages.length,
      coldEmbedded: cold.newlyEmbeddedPassages,
      warmEmbedded: warm.newlyEmbeddedPassages,
      partialEmbedded: partial.newlyEmbeddedPassages,
      savedEmbeddings: cold.newlyEmbeddedPassages - warm.newlyEmbeddedPassages,
    },
    scope:
      "Actual local embedding runtime and in-memory passage cache. Not a full API E2E benchmark.",
  };

  await fs.mkdir(".local", {
    recursive: true,
  });

  await fs.writeFile(
    ".local/passage-cache-benchmark.json",
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
