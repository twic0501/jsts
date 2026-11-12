import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { env, pipeline } from "@huggingface/transformers";

export const MODEL_ID = "Xenova/multilingual-e5-small";

const VECTOR_DIMENSIONS = 384;

let extractorPromise;

async function calculateFileHash(filePath) {
  const hash = createHash("sha256");

  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

function isInsideDirectory(directory, target) {
  const relativePath = path.relative(directory, target);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function validateManifest(manifest) {
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    manifest.modelId !== MODEL_ID ||
    typeof manifest.revision !== "string" ||
    !manifest.revision.trim() ||
    typeof manifest.pipelineVersion !== "string" ||
    !manifest.pipelineVersion.trim() ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0
  ) {
    throw new Error("Model manifest không hợp lệ.");
  }

  const files = new Set();

  for (const file of manifest.files) {
    if (
      typeof file !== "object" ||
      file === null ||
      typeof file.file !== "string" ||
      !file.file.trim() ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(file.sha256)
    ) {
      throw new Error("Thông tin file trong manifest không hợp lệ.");
    }

    const normalizedPath = path.normalize(file.file);

    if (
      path.isAbsolute(file.file) ||
      normalizedPath === "." ||
      normalizedPath.startsWith("..") ||
      files.has(normalizedPath)
    ) {
      throw new Error("Đường dẫn file trong manifest không hợp lệ.");
    }

    files.add(normalizedPath);
  }
}

async function verifyModelFiles(modelDirectory, files) {
  const realModelDirectory = await fs.realpath(modelDirectory);

  for (const file of files) {
    const filePath = path.resolve(modelDirectory, file.file);
    const realFilePath = await fs.realpath(filePath);

    if (!isInsideDirectory(realModelDirectory, realFilePath)) {
      throw new Error("Đường dẫn model không hợp lệ.");
    }

    const fileInfo = await fs.stat(realFilePath);

    if (!fileInfo.isFile()) {
      throw new Error("Model chứa file không hợp lệ.");
    }

    const hash = await calculateFileHash(realFilePath);

    if (hash !== file.sha256.toLowerCase()) {
      throw new Error(`Model file integrity mismatch: ${file.file}`);
    }
  }
}

export function getExtractor(root) {
  if (!extractorPromise) {
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = path.join(root, ".local/models/");
    env.useFSCache = false;

    extractorPromise = (async () => {
      const manifestPath = path.join(root, "data/model-manifest.json");

      const manifestContent = await fs.readFile(manifestPath, "utf8");

      const manifest = JSON.parse(manifestContent);

      validateManifest(manifest);

      const modelDirectory = path.resolve(root, ".local/models", MODEL_ID);

      await verifyModelFiles(modelDirectory, manifest.files);

      return pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
        device: "cpu",
        local_files_only: true,
        session_options: {
          intraOpNumThreads: 2,
          interOpNumThreads: 1,
        },
      });
    })().catch((error) => {
      extractorPromise = undefined;
      throw error;
    });
  }

  return extractorPromise;
}

export async function embedTexts(root, texts) {
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > 3 ||
    texts.some(
      (text) => typeof text !== "string" || !text.trim() || text.length > 22000,
    )
  ) {
    throw new Error("Dữ liệu embedding không hợp lệ.");
  }

  const extractor = await getExtractor(root);

  const output = await extractor(texts, {
    pooling: "mean",
    normalize: true,
  });

  const vectors = output.tolist();

  if (
    !Array.isArray(vectors) ||
    vectors.length !== texts.length ||
    vectors.some(
      (vector) =>
        !Array.isArray(vector) ||
        vector.length !== VECTOR_DIMENSIONS ||
        vector.some((value) => !Number.isFinite(value)) ||
        Math.abs(Math.hypot(...vector) - 1) > 0.002,
    )
  ) {
    throw new Error("Kết quả embedding không hợp lệ.");
  }

  return vectors;
}
