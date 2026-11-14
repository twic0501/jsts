import { Worker } from "node:worker_threads";
import path from "node:path";

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_PENDING = 12;
const MAX_CACHE_SIZE = 600;
const REQUEST_TIMEOUT = 45_000;
const VECTOR_DIMENSIONS = 384;

type WorkerResponse = {
  id: string;
  vectors?: number[][];
  error?: string;
};

type PendingRequest = {
  resolve: (vectors: number[][]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

// ============================================================
// STATE
// ============================================================

let worker: Worker | undefined;

const pending = new Map<string, PendingRequest>();

const cache = new Map<string, number[]>();

// ============================================================
// WORKER MANAGEMENT
// ============================================================

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  const workerPath = path.resolve(process.cwd(), "lib/embedding-worker.mjs");

  const rootPath = path.resolve(process.cwd(), "../..");

  const current = new Worker(workerPath, {
    workerData: {
      root: rootPath,
    },
  });

  worker = current;

  // ----------------------------------------------------------
  // RECEIVE WORKER RESPONSE
  // ----------------------------------------------------------

  current.on("message", (message: WorkerResponse) => {
    const request = pending.get(message.id);

    if (!request) {
      return;
    }

    clearTimeout(request.timer);
    pending.delete(message.id);

    if (message.error) {
      request.reject(new Error(message.error));
      return;
    }

    if (!message.vectors) {
      request.reject(new Error("Embedding worker không trả về vector."));
      return;
    }

    request.resolve(message.vectors);
  });

  // ----------------------------------------------------------
  // WORKER FAILURE HANDLING
  // ----------------------------------------------------------

  const failWorker = (error?: Error) => {
    if (worker !== current) {
      return;
    }

    const reason = error?.message ?? "Embedding worker đã dừng ngoài dự kiến.";

    console.error("[Paper Galaxy API] Embedding worker failed:", reason);

    for (const request of pending.values()) {
      clearTimeout(request.timer);

      request.reject(new Error(reason));
    }

    pending.clear();

    worker = undefined;
  };

  current.on("error", (error) => {
    failWorker(error);
  });

  current.on("exit", (code) => {
    if (code !== 0) {
      failWorker(new Error(`Embedding worker thoát với mã ${code}.`));
    } else {
      failWorker(new Error("Embedding worker đã kết thúc."));
    }
  });

  return current;
}

// ============================================================
// VECTOR VALIDATION
// ============================================================

function validateVector(vector: number[]): boolean {
  if (!Array.isArray(vector) || vector.length !== VECTOR_DIMENSIONS) {
    return false;
  }

  if (vector.some((value) => !Number.isFinite(value))) {
    return false;
  }

  const norm = Math.hypot(...vector);

  return Math.abs(norm - 1) <= 0.002;
}

// ============================================================
// EMBEDDING BATCH
// ============================================================

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // ----------------------------------------------------------
  // VALIDATE INPUT
  // ----------------------------------------------------------

  if (
    texts.length === 0 ||
    texts.length > 3 ||
    texts.some(
      (text) =>
        typeof text !== "string" || text.length === 0 || text.length > 22_000,
    )
  ) {
    throw new Error("Batch embedding không hợp lệ.");
  }

  // ----------------------------------------------------------
  // CACHE LOOKUP
  // ----------------------------------------------------------

  const cached = texts.map((text) => cache.get(text));

  if (cached.every((value): value is number[] => value !== undefined)) {
    return cached;
  }

  // ----------------------------------------------------------
  // LIMIT CONCURRENT REQUESTS
  // ----------------------------------------------------------

  if (pending.size >= MAX_PENDING) {
    throw new Error("Model đang bận.");
  }

  const current = getWorker();

  const id = crypto.randomUUID();

  // ----------------------------------------------------------
  // SEND REQUEST TO WORKER
  // ----------------------------------------------------------

  const vectors = await new Promise<number[][]>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);

      reject(new Error("Model embedding timeout sau 45 giây."));
    }, REQUEST_TIMEOUT);

    pending.set(id, {
      resolve,
      reject,
      timer,
    });

    try {
      current.postMessage({
        id,
        texts,
      });
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);

      reject(
        error instanceof Error
          ? error
          : new Error("Không gửi được yêu cầu đến embedding worker."),
      );
    }
  });

  // ----------------------------------------------------------
  // VALIDATE EMBEDDINGS
  // ----------------------------------------------------------

  if (
    vectors.length !== texts.length ||
    vectors.some((vector) => !validateVector(vector))
  ) {
    throw new Error("Vector model không hợp lệ.");
  }

  // ----------------------------------------------------------
  // UPDATE CACHE
  // ----------------------------------------------------------

  vectors.forEach((vector, index) => {
    const text = texts[index];

    if (!text) {
      return;
    }

    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;

      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(text, vector);
  });

  return vectors;
}

// ============================================================
// EMBEDDING QUERY
// ============================================================

export async function embedQuery(query: string): Promise<number[]> {
  const vectors = await embedBatch([`query: ${query}`]);

  const vector = vectors[0];

  if (!vector) {
    throw new Error("Không nhận được embedding cho truy vấn.");
  }

  return vector;
}
