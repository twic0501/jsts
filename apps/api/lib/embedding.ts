import { randomUUID } from "node:crypto";
import { Worker } from "node:worker_threads";
import path from "node:path";

let worker: Worker | undefined;
let stoppingWorker = false;

type PendingRequest = {
  resolve: (vectors: number[][]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PendingRequest>();
const cache = new Map<string, number[]>();

const MAX_PENDING = 12;
const MAX_CACHE_SIZE = 600;
const REQUEST_TIMEOUT = 45000;
const VECTOR_DIMENSIONS = 384;

function rejectPendingRequests(error: Error): void {
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(error);
  }

  pending.clear();
}

function stopWorker(current: Worker, reason: Error): void {
  if (worker !== current || stoppingWorker) {
    return;
  }

  stoppingWorker = true;
  worker = undefined;

  rejectPendingRequests(reason);

  void current.terminate().finally(() => {
    stoppingWorker = false;
  });
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  const current = new Worker(
    path.resolve(process.cwd(), "lib/embedding-worker.mjs"),
    {
      workerData: {
        root: path.resolve(process.cwd(), "../.."),
      },
    },
  );

  worker = current;

  current.on(
    "message",
    (message: { id: string; vectors?: number[][]; error?: string }) => {
      if (!message || typeof message.id !== "string") {
        return;
      }

      const request = pending.get(message.id);

      if (!request) {
        return;
      }

      clearTimeout(request.timer);
      pending.delete(message.id);

      if (message.error || !Array.isArray(message.vectors)) {
        request.reject(new Error("Không chạy được model cục bộ."));
        return;
      }

      request.resolve(message.vectors);
    },
  );

  current.on("error", () => {
    stopWorker(current, new Error("Model worker gặp lỗi."));
  });

  current.on("exit", (code) => {
    if (worker !== current) {
      return;
    }

    worker = undefined;

    rejectPendingRequests(new Error(`Model worker đã dừng với mã ${code}.`));
  });

  return current;
}

function getCachedVector(text: string): number[] | undefined {
  const vector = cache.get(text);

  if (!vector) {
    return undefined;
  }

  // Đưa phần tử vừa sử dụng lên cuối Map để duy trì LRU.
  cache.delete(text);
  cache.set(text, vector);

  return [...vector];
}

function saveCachedVector(text: string, vector: number[]): void {
  if (cache.has(text)) {
    cache.delete(text);
  }

  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;

    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(text, [...vector]);
}

function validateVectors(
  vectors: unknown,
  expectedLength: number,
): vectors is number[][] {
  if (!Array.isArray(vectors) || vectors.length !== expectedLength) {
    return false;
  }

  return vectors.every(
    (vector) =>
      Array.isArray(vector) &&
      vector.length === VECTOR_DIMENSIONS &&
      vector.every(
        (value) => typeof value === "number" && Number.isFinite(value),
      ) &&
      Math.abs(Math.hypot(...vector) - 1) <= 0.002,
  );
}

async function runWorker(texts: string[]): Promise<number[][]> {
  if (pending.size >= MAX_PENDING) {
    throw new Error("Model đang bận.");
  }

  const current = getWorker();
  const id = randomUUID();

  return new Promise<number[][]>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(id)) {
        return;
      }

      stopWorker(
        current,
        new Error("Model timeout. Worker đã được khởi động lại."),
      );
    }, REQUEST_TIMEOUT);

    pending.set(id, {
      resolve,
      reject,
      timer,
    });

    try {
      current.postMessage({ id, texts });
    } catch {
      clearTimeout(timer);
      pending.delete(id);

      reject(new Error("Không thể gửi dữ liệu đến model worker."));
    }
  });
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > 3 ||
    texts.some(
      (text) => typeof text !== "string" || !text.trim() || text.length > 22000,
    )
  ) {
    throw new Error("Batch embedding không hợp lệ.");
  }

  const result = texts.map((text) => getCachedVector(text));

  const missingTexts = Array.from(
    new Set(texts.filter((text, index) => result[index] === undefined)),
  );

  if (missingTexts.length > 0) {
    const vectors = await runWorker(missingTexts);

    if (!validateVectors(vectors, missingTexts.length)) {
      throw new Error("Vector model không hợp lệ.");
    }

    const vectorMap = new Map<string, number[]>();

    missingTexts.forEach((text, index) => {
      const vector = vectors[index]!;

      saveCachedVector(text, vector);
      vectorMap.set(text, [...vector]);
    });

    texts.forEach((text, index) => {
      if (result[index] === undefined) {
        const vector = vectorMap.get(text);

        if (!vector) {
          throw new Error("Không tìm thấy vector tương ứng.");
        }

        result[index] = [...vector];
      }
    });
  }

  return result.map((vector) => {
    if (!vector) {
      throw new Error("Thiếu kết quả embedding.");
    }

    return [...vector];
  });
}

export async function embedQuery(query: string): Promise<number[]> {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("Query embedding không hợp lệ.");
  }

  return (await embedBatch(["query: " + query]))[0]!;
}
