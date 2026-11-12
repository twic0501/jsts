import { parentPort, workerData } from "node:worker_threads";
import { embedTexts } from "./embedding-runtime.mjs";

const MAX_QUEUE = 12;
const MAX_BATCH_SIZE = 3;
const MAX_TEXT_LENGTH = 22000;

let queue = Promise.resolve();
let queued = 0;

if (!parentPort) {
  throw new Error("Embedding worker phải được chạy trong Worker Thread.");
}

function sendResponse(message) {
  try {
    parentPort.postMessage(message);
  } catch {
    // Main thread có thể đã đóng Worker.
  }
}

function validateMessage(message) {
  return (
    Array.isArray(message.texts) &&
    message.texts.length >= 1 &&
    message.texts.length <= MAX_BATCH_SIZE &&
    message.texts.every(
      (text) =>
        typeof text === "string" &&
        text.trim().length > 0 &&
        text.length <= MAX_TEXT_LENGTH,
    )
  );
}

async function processMessage(message) {
  try {
    const vectors = await embedTexts(workerData.root, message.texts);

    sendResponse({
      id: message.id,
      vectors,
    });
  } catch (error) {
    sendResponse({
      id: message.id,
      error: error instanceof Error ? error.message : "Inference failed",
    });
  }
}

parentPort.on("message", (message) => {
  if (!message || typeof message.id !== "string") {
    return;
  }

  if (!validateMessage(message)) {
    sendResponse({
      id: message.id,
      error: "Batch embedding không hợp lệ.",
    });

    return;
  }

  if (queued >= MAX_QUEUE) {
    sendResponse({
      id: message.id,
      error: "Model worker đang quá tải.",
    });

    return;
  }

  queued++;

  queue = queue
    .then(() => processMessage(message))
    .catch(() => {
      // Giữ queue hoạt động nếu có lỗi ngoài dự kiến.
    })
    .finally(() => {
      queued--;
    });
});
