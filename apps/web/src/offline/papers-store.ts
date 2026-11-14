import type { Paper } from "@paper-galaxy/core";
import { loadOfflineDataset } from "./store";

const DATABASE_NAME = "paper-galaxy-saved-papers";
const STORE_NAME = "papers";
const DATABASE_VERSION = 1;

export const OFFLINE_PAPERS_CHANGED =
  "paper-galaxy-saved-papers-changed";

export type SavedOfflinePaper = {
  id: string;
  paper: Paper;
  vector?: number[];
  savedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Trình duyệt không hỗ trợ IndexedDB."));
      return;
    }

    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error("Không mở được kho bài báo offline."),
      );
    };

    request.onblocked = () => {
      reject(
        new Error("Kho dữ liệu đang bị khóa bởi tab khác."),
      );
    };
  });
}

function notifyChange(): void {
  window.dispatchEvent(new Event(OFFLINE_PAPERS_CHANGED));
}

export async function getSavedOfflinePapers():
  Promise<SavedOfflinePaper[]> {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly",
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .getAll();

      let records: SavedOfflinePaper[] = [];

      request.onsuccess = () => {
        records = request.result as SavedOfflinePaper[];
      };

      transaction.oncomplete = () => {
        resolve(
          records.sort((a, b) =>
            b.savedAt.localeCompare(a.savedAt),
          ),
        );
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error("Không đọc được bài báo đã lưu."),
        );
      };

      transaction.onabort = () => {
        reject(new Error("Giao dịch đọc bị hủy."));
      };
    });
  } finally {
    db.close();
  }
}

export async function saveOfflinePapers(
  papers: Paper[],
): Promise<number> {
  const unique = new Map<string, Paper>();

  for (const paper of papers) {
    if (
      !paper ||
      typeof paper.id !== "string" ||
      !paper.id.trim() ||
      !paper.title?.trim()
    ) {
      throw new Error("Bài báo không hợp lệ.");
    }

    unique.set(paper.id, paper);
  }

  if (unique.size === 0) return 0;

  const dataset = await loadOfflineDataset().catch(() => null);

  const vectors = new Map(
    dataset?.snapshot.papers.map((item) => [
      item.paperId,
      item.vector,
    ]) ?? [],
  );

  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite",
      );

      const store = transaction.objectStore(STORE_NAME);
      const savedAt = new Date().toISOString();

      for (const paper of unique.values()) {
        const vector = vectors.get(paper.id);

        const validVector =
          vector &&
          vector.length === 384 &&
          vector.every(Number.isFinite) &&
          Math.abs(Math.hypot(...vector) - 1) <= 0.002;

        const record: SavedOfflinePaper = {
          id: paper.id,
          paper,
          ...(validVector ? { vector: [...vector] } : {}),
          savedAt,
        };

        store.put(record);
      }

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Không lưu được các bài báo."),
        );

      transaction.onabort = () =>
        reject(new Error("Giao dịch lưu bị hủy."));
    });
  } finally {
    db.close();
  }

  notifyChange();
  return unique.size;
}

export async function deleteOfflinePapers(
  ids: string[],
): Promise<void> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);

  if (uniqueIds.length === 0) return;

  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite",
      );

      const store = transaction.objectStore(STORE_NAME);

      for (const id of uniqueIds) {
        store.delete(id);
      }

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Không xóa được bài báo."),
        );

      transaction.onabort = () =>
        reject(new Error("Giao dịch xóa bị hủy."));
    });
  } finally {
    db.close();
  }

  notifyChange();
}

export async function countSavedOfflinePapers():
  Promise<number> {
  const db = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly",
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .count();

      let count = 0;

      request.onsuccess = () => {
        count = request.result;
      };

      transaction.oncomplete = () => resolve(count);

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Không đếm được bài báo."),
        );

      transaction.onabort = () =>
        reject(new Error("Giao dịch đọc bị hủy."));
    });
  } finally {
    db.close();
  }
}

