import { getOfflineStatus } from "./store";
import { embedQueryLocal } from "../semantic/client";

const CACHE_PREFIX = "paper-galaxy-app-";
const MANIFEST_URL = "/offline-precache.json";

export type AppCacheStatus = {
  ready: boolean;
  version: string | null;
  total: number;
  missing: string[];
  message: string;
};

export type OfflineAudit = {
  datasetReady: boolean;
  paperCount: number;
  datasetError: string | null;
  app: AppCacheStatus;
};

type PrecacheManifest = {
  version: string;
  assets: string[];
};

function validManifest(value: unknown): value is PrecacheManifest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.version === "string" &&
    candidate.version.length > 0 &&
    Array.isArray(candidate.assets) &&
    candidate.assets.length > 0 &&
    candidate.assets.every(
      (asset) =>
        typeof asset === "string" &&
        asset.startsWith("/") &&
        !asset.startsWith("//"),
    ) &&
    candidate.assets.includes("/index.html")
  );
}

export async function inspectAppCache(): Promise<AppCacheStatus> {
  if (!("caches" in window)) {
    return {
      ready: false,
      version: null,
      total: 0,
      missing: [],
      message: "Trình duyệt không hỗ trợ Cache Storage.",
    };
  }

  const names = (await caches.keys())
    .filter((name) => name.startsWith(CACHE_PREFIX))
    .reverse();

  if (names.length === 0) {
    return {
      ready: false,
      version: null,
      total: 0,
      missing: [],
      message: "Ứng dụng chưa có cache offline.",
    };
  }

  for (const name of names) {
    const cache = await caches.open(name);
    const response = await cache.match(MANIFEST_URL);

    if (!response) continue;

    let raw: unknown;

    try {
      raw = await response.json();
    } catch {
      continue;
    }

    if (!validManifest(raw)) continue;
    if (name !== CACHE_PREFIX + raw.version) continue;

    const missing: string[] = [];

    for (const asset of raw.assets) {
      if (!(await cache.match(asset))) {
        missing.push(asset);
      }
    }

    return {
      ready: missing.length === 0,
      version: raw.version,
      total: raw.assets.length,
      missing,
      message:
        missing.length === 0
          ? `Đủ ${raw.assets.length} tài nguyên PWA.`
          : `Thiếu ${missing.length}/${raw.assets.length} tài nguyên.`,
    };
  }

  return {
    ready: false,
    version: null,
    total: 0,
    missing: [],
    message:
      "Cache đã tồn tại nhưng chưa có manifest để xác minh. " +
      "Cần cập nhật Service Worker.",
  };
}

export async function auditOfflineResources(): Promise<OfflineAudit> {
  const [dataset, app] = await Promise.all([
    getOfflineStatus(),
    inspectAppCache(),
  ]);

  return {
    datasetReady: dataset.installed && dataset.valid,
    paperCount: dataset.paperCount,
    datasetError: dataset.error,
    app,
  };
}

export type ModelProbe = {
  success: boolean;
  dimensions: number;
  norm: number | null;
  durationMs: number;
  message: string;
};

/**
 * Chạy inference thực sự.
 * Khi online, bộ tải model có thể tải tài nguyên còn thiếu.
 * Muốn xác nhận chạy offline, hãy bật Network -> Offline trước.
 */
export async function probeOfflineEmbedding(): Promise<ModelProbe> {
  const started = performance.now();

  try {
    const vector = await embedQueryLocal(
      "medical image segmentation",
    );

    const norm = Math.hypot(...vector);

    const valid =
      vector.length === 384 &&
      vector.every(Number.isFinite) &&
      Math.abs(norm - 1) <= 0.002;

    return {
      success: valid,
      dimensions: vector.length,
      norm,
      durationMs: performance.now() - started,
      message: valid
        ? "Model tạo được vector 384 chiều, chuẩn hóa L2 hợp lệ."
        : "Model trả về vector không đạt yêu cầu.",
    };
  } catch (error) {
    return {
      success: false,
      dimensions: 0,
      norm: null,
      durationMs: performance.now() - started,
      message:
        error instanceof Error
          ? error.message
          : "Không tạo được embedding.",
    };
  }
}
