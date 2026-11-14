import {
  corpusSchema,
  validateSnapshot,
  type Corpus,
} from "@paper-galaxy/core";

import corpusFile from "../../../../data/corpus.json";
import snapshotFile from "../../../../data/semantic-snapshot.json";

const DATABASE_NAME = "paper-galaxy-offline";
const DATABASE_VERSION = 1;
const STORE_NAME = "datasets";
const STARTER_ID = "starter-library";

export const OFFLINE_DATASET_CHANGED =
  "paper-galaxy-offline-dataset-changed";

function notifyDatasetChanged(): void {
  window.dispatchEvent(new Event(OFFLINE_DATASET_CHANGED));
}

type Snapshot = ReturnType<typeof validateSnapshot>;

export type OfflineDataset = {
  id: string;
  name: string;
  corpus: Corpus;
  snapshot: Snapshot;
  installedAt: string;
  sizeBytes: number;
};

export type OfflineStatus = {
  id: string;
  name: string;
  installed: boolean;
  valid: boolean;
  paperCount: number;
  sizeBytes: number;
  installedAt: string | null;
  error: string | null;
};

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("Trình duyệt không hỗ trợ IndexedDB."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
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
          new Error("Không thể mở IndexedDB."),
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "Cơ sở dữ liệu đang được sử dụng ở tab khác.",
        ),
      );
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (error: Error) => void,
  ) => void,
): Promise<T> {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(value);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(error);
    };

    let transaction: IDBTransaction;

    try {
      transaction = database.transaction(
        STORE_NAME,
        mode,
      );
    } catch (error) {
      fail(
        error instanceof Error
          ? error
          : new Error("Không tạo được giao dịch."),
      );
      return;
    }

    transaction.onerror = () => {
      fail(
        transaction.error ??
          new Error("Giao dịch IndexedDB thất bại."),
      );
    };

    transaction.onabort = () => {
      fail(
        transaction.error ??
          new Error("Giao dịch IndexedDB bị hủy."),
      );
    };

    try {
      operation(
        transaction.objectStore(STORE_NAME),
        finish,
        fail,
      );
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Giao dịch có thể đã kết thúc.
      }

      fail(
        error instanceof Error
          ? error
          : new Error("Thao tác IndexedDB thất bại."),
      );
    }
  });
}

export async function loadOfflineDataset(
  id = STARTER_ID,
): Promise<OfflineDataset | null> {
  return withStore<OfflineDataset | null>(
    "readonly",
    (store, resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(
          (request.result as OfflineDataset | undefined) ??
            null,
        );
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error("Không đọc được dữ liệu offline."),
        );
      };
    },
  );
}

export async function installStarterDataset(): Promise<OfflineStatus> {
  // Xác thực dữ liệu trước khi lưu.
  const corpus = corpusSchema.parse(corpusFile);

  const snapshot = validateSnapshot(
    corpus,
    snapshotFile,
  );

  const sizeBytes = new Blob([
    JSON.stringify(corpus),
    JSON.stringify(snapshot),
  ]).size;

  const dataset: OfflineDataset = {
    id: STARTER_ID,
    name: "Paper Galaxy Starter Library",
    corpus,
    snapshot,
    installedAt: new Date().toISOString(),
    sizeBytes,
  };

  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      );

      transaction.objectStore(STORE_NAME).put(dataset);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Không lưu được dữ liệu offline."),
        );

      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Giao dịch lưu offline bị hủy."),
        );
    });
  } finally {
    database.close();
  }

  const status = await getOfflineStatus();
  notifyDatasetChanged();
  return status;
}

export async function getOfflineStatus(): Promise<OfflineStatus> {
  const dataset = await loadOfflineDataset();

  if (!dataset) {
    return {
      id: STARTER_ID,
      name: "Paper Galaxy Starter Library",
      installed: false,
      valid: false,
      paperCount: 0,
      sizeBytes: 0,
      installedAt: null,
      error: null,
    };
  }

  try {
    const corpus = corpusSchema.parse(dataset.corpus);

    validateSnapshot(
      corpus,
      dataset.snapshot,
    );

    return {
      id: dataset.id,
      name: dataset.name,
      installed: true,
      valid: true,
      paperCount: corpus.papers.length,
      sizeBytes: dataset.sizeBytes,
      installedAt: dataset.installedAt,
      error: null,
    };
  } catch (error) {
    return {
      id: dataset.id,
      name: dataset.name,
      installed: true,
      valid: false,
      paperCount: 0,
      sizeBytes: dataset.sizeBytes,
      installedAt: dataset.installedAt,
      error:
        error instanceof Error
          ? error.message
          : "Dữ liệu offline không hợp lệ.",
    };
  }
}

export async function removeOfflineDataset(
  id = STARTER_ID,
): Promise<void> {
  // Chỉ thao tác trên object store do Paper Galaxy quản lý.
  // Không xóa toàn bộ IndexedDB hay cache của ứng dụng khác.
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      );

      transaction.objectStore(STORE_NAME).delete(id);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Không thể xóa dữ liệu offline."),
        );

      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Giao dịch xóa offline bị hủy."),
        );
    });
  } finally {
    database.close();
  }

  notifyDatasetChanged();
}

export async function estimateStorage() {
  if (!navigator.storage?.estimate) {
    return {
      usage: 0,
      quota: 0,
    };
  }

  const result = await navigator.storage.estimate();

  return {
    usage: result.usage ?? 0,
    quota: result.quota ?? 0,
  };
}

