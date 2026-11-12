import { createHash } from "node:crypto";

export type EmbeddingFunction = (texts: string[]) => Promise<number[][]>;

type CacheOptions = {
  maxEntries?: number;
  dimensions?: number;
  maxConcurrentBatches?: number;
};

export function createPassageEmbeddingCache(options: CacheOptions = {}) {
  const maxEntries = options.maxEntries ?? 2000;
  const dimensions = options.dimensions ?? 384;
  const maxConcurrentBatches = options.maxConcurrentBatches ?? 2;

  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new RangeError("maxEntries không hợp lệ.");
  }

  if (!Number.isInteger(dimensions) || dimensions < 1) {
    throw new RangeError("dimensions không hợp lệ.");
  }

  if (!Number.isInteger(maxConcurrentBatches) || maxConcurrentBatches < 1) {
    throw new RangeError("maxConcurrentBatches không hợp lệ.");
  }

  const cache = new Map<string, number[]>();
  const inflight = new Map<string, Promise<number[]>>();

  // Hàng đợi các batch embedding đang chờ.
  const queue: Array<() => void> = [];

  let activeBatches = 0;

  const makeKey = (text: string) =>
    createHash("sha256")
      .update("multilingual-e5-small-384-v1\0" + text)
      .digest("hex");

  function get(key: string): number[] | undefined {
    const vector = cache.get(key);

    if (!vector) {
      return undefined;
    }

    cache.delete(key);
    cache.set(key, vector);

    return [...vector];
  }

  function set(key: string, vector: number[]): void {
    cache.delete(key);
    cache.set(key, [...vector]);

    while (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      cache.delete(oldestKey);
    }
  }

  function validate(vector: number[]): void {
    if (
      !Array.isArray(vector) ||
      vector.length !== dimensions ||
      vector.some((value) => !Number.isFinite(value))
    ) {
      throw new Error("Invalid passage embedding vector.");
    }
  }

  // Chỉ cho phép một số lượng batch nhất định chạy đồng thời.
  function runLimited<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        activeBatches++;

        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            activeBatches--;
            pumpQueue();
          });
      };

      queue.push(start);
      pumpQueue();
    });
  }

  function pumpQueue(): void {
    while (activeBatches < maxConcurrentBatches && queue.length > 0) {
      const next = queue.shift();

      if (next) {
        next();
      }
    }
  }

  return async function embedCached(
    texts: string[],
    embed: EmbeddingFunction,
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const keys = texts.map(makeKey);
    const promises = new Map<string, Promise<number[]>>();
    const scheduled = new Set<string>();

    const missing: {
      key: string;
      text: string;
    }[] = [];

    // Tìm cache, request đang chạy và loại passage trùng.
    for (let i = 0; i < texts.length; i++) {
      const key = keys[i]!;

      if (promises.has(key) || scheduled.has(key)) {
        continue;
      }

      const cached = get(key);

      if (cached) {
        promises.set(key, Promise.resolve(cached));
        continue;
      }

      const pending = inflight.get(key);

      if (pending) {
        promises.set(key, pending);
        continue;
      }

      scheduled.add(key);

      missing.push({
        key,
        text: texts[i]!,
      });
    }

    // Chia passage thành các batch, mỗi batch tối đa 2 phần tử.
    for (let i = 0; i < missing.length; i += 2) {
      const batch = missing.slice(i, i + 2);

      const batchPromise = runLimited(async () => {
        const vectors = await embed(batch.map((item) => item.text));

        if (vectors.length !== batch.length) {
          throw new Error("Missing passage embedding.");
        }

        vectors.forEach(validate);

        return vectors;
      });

      batch.forEach((item, index) => {
        let promise: Promise<number[]>;

        promise = batchPromise
          .then((vectors) => {
            const vector = vectors[index]!;

            set(item.key, vector);

            return [...vector];
          })
          .finally(() => {
            if (inflight.get(item.key) === promise) {
              inflight.delete(item.key);
            }
          });

        inflight.set(item.key, promise);
        promises.set(item.key, promise);
      });
    }

    // Trả vector đúng thứ tự ban đầu.
    return Promise.all(
      keys.map((key) => {
        const promise = promises.get(key);

        if (!promise) {
          throw new Error("Missing passage embedding promise.");
        }

        return promise;
      }),
    );
  };
}
