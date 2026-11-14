import { openDB } from "idb";

import {
  corpusSchema,
  validateBundle,
  type Corpus,
  type DatasetBundle,
} from "@paper-galaxy/core";

// ==========================================
// 1. DATABASE TYPES
// ==========================================

export type DownloadJobStatus =
  | "QUEUED"
  | "DOWNLOADING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface DownloadJobRecord {
  id: string;
  datasetId: string;
  assetType: "PAPERS" | "METADATA" | "EMBEDDINGS" | "PCA";

  status: DownloadJobStatus;

  progress: number;
  downloadedBytes: number;
  totalBytes: number;

  error?: string;

  createdAt: string;
  updatedAt: string;
}

export interface OfflineDatasetRecord {
  id: string;
  name: string;
  version: string;

  documentCount: number;
  totalSizeBytes: number;

  downloadedAt: string;

  assetTypes: string[];
}

// ==========================================
// 2. DATABASE CONNECTION
// ==========================================

const DB_NAME = "paper-magic-v1";
const DB_VERSION = 3;

const db = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("library")) {
        database.createObjectStore("library");
      }

      if (!database.objectStoreNames.contains("bookmarks")) {
        database.createObjectStore("bookmarks");
      }

      if (!database.objectStoreNames.contains("online")) {
        database.createObjectStore("online");
      }

      if (!database.objectStoreNames.contains("offlineDatasets")) {
        database.createObjectStore("offlineDatasets", {
          keyPath: "id",
        });
      }

      if (!database.objectStoreNames.contains("downloadJobs")) {
        database.createObjectStore("downloadJobs", {
          keyPath: "id",
        });
      }
    },
  });

// ==========================================
// 3. EXISTING CORPUS STORAGE
// ==========================================

export async function saveCorpus(corpus: Corpus) {
  const database = await db();

  try {
    await database.put("library", corpus, "active");
  } finally {
    database.close();
  }
}

export async function loadCorpus(): Promise<Corpus | undefined> {
  const database = await db();

  try {
    const raw: unknown = await database.get("library", "active");
    const parsed = corpusSchema.safeParse(raw);

    return parsed.success ? parsed.data : undefined;
  } finally {
    database.close();
  }
}

// ==========================================
// 4. EXISTING BOOKMARK STORAGE
// ==========================================

export async function loadBookmarks(): Promise<string[]> {
  const database = await db();

  try {
    const keys = await database.getAllKeys("bookmarks");

    return keys.filter((key): key is string => typeof key === "string");
  } finally {
    database.close();
  }
}

export async function setBookmark(id: string, saved: boolean) {
  const database = await db();

  try {
    if (saved) {
      await database.put(
        "bookmarks",
        { savedAt: new Date().toISOString() },
        id,
      );
    } else {
      await database.delete("bookmarks", id);
    }
  } finally {
    database.close();
  }
}

// ==========================================
// 5. EXISTING ONLINE DATASET STORAGE
// ==========================================

export async function saveOnlineDataset(bundle: DatasetBundle) {
  const database = await db();

  try {
    await database.put("online", bundle, "active");
  } finally {
    database.close();
  }
}

export async function loadOnlineDataset(): Promise<DatasetBundle | undefined> {
  const database = await db();

  try {
    const raw: unknown = await database.get("online", "active");

    return raw ? validateBundle(raw) : undefined;
  } finally {
    database.close();
  }
}

// ==========================================
// 6. OFFLINE DATASET STORAGE
// ==========================================

export async function saveOfflineDataset(dataset: OfflineDatasetRecord) {
  const database = await db();

  try {
    await database.put("offlineDatasets", dataset);
  } finally {
    database.close();
  }
}

export async function getOfflineDataset(
  id: string,
): Promise<OfflineDatasetRecord | undefined> {
  const database = await db();

  try {
    return await database.get("offlineDatasets", id);
  } finally {
    database.close();
  }
}

export async function getAllOfflineDatasets(): Promise<OfflineDatasetRecord[]> {
  const database = await db();

  try {
    return await database.getAll("offlineDatasets");
  } finally {
    database.close();
  }
}

export async function deleteOfflineDataset(id: string) {
  const database = await db();

  try {
    await database.delete("offlineDatasets", id);
  } finally {
    database.close();
  }
}

// ==========================================
// 7. DOWNLOAD JOB STORAGE
// ==========================================

export async function saveDownloadJob(job: DownloadJobRecord) {
  const database = await db();

  try {
    await database.put("downloadJobs", job);
  } finally {
    database.close();
  }
}

export async function getDownloadJob(
  id: string,
): Promise<DownloadJobRecord | undefined> {
  const database = await db();

  try {
    return await database.get("downloadJobs", id);
  } finally {
    database.close();
  }
}

export async function getAllDownloadJobs(): Promise<DownloadJobRecord[]> {
  const database = await db();

  try {
    return await database.getAll("downloadJobs");
  } finally {
    database.close();
  }
}

export async function updateDownloadJob(
  id: string,
  updates: Partial<DownloadJobRecord>,
) {
  const database = await db();

  try {
    const current = await database.get("downloadJobs", id);

    if (!current) {
      throw new Error(`Download job not found: ${id}`);
    }

    await database.put("downloadJobs", {
      ...current,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    });
  } finally {
    database.close();
  }
}

export async function deleteDownloadJob(id: string) {
  const database = await db();

  try {
    await database.delete("downloadJobs", id);
  } finally {
    database.close();
  }
}
