import type { DatasetManifest } from "./manifest";

export const mockDatasets: DatasetManifest[] = [
  {
    id: "ai-research",
    name: "AI Research Dataset",
    description:
      "Bộ dữ liệu nghiên cứu trí tuệ nhân tạo phục vụ tìm kiếm ngữ nghĩa và phân tích tài liệu.",
    category: "Artificial Intelligence",
    version: "1.0.0",
    status: "PUBLISHED",

    documentCount: 100,
    totalSizeBytes: 5 * 1024 * 1024,

    assets: [
      {
        type: "PAPERS",
        fileName: "papers.json",
        url: "https://example.com/mock/ai/papers.json",
        fileSizeBytes: 2 * 1024 * 1024,
        checksum: "mock-papers-checksum",
        format: "json",
      },
      {
        type: "METADATA",
        fileName: "metadata.json",
        url: "https://example.com/mock/ai/metadata.json",
        fileSizeBytes: 512 * 1024,
        checksum: "mock-metadata-checksum",
        format: "json",
      },
      {
        type: "EMBEDDINGS",
        fileName: "embeddings.bin",
        url: "https://example.com/mock/ai/embeddings.bin",
        fileSizeBytes: 2 * 1024 * 1024,
        checksum: "mock-embeddings-checksum",
        format: "binary",
      },
      {
        type: "PCA",
        fileName: "pca.bin",
        url: "https://example.com/mock/ai/pca.bin",
        fileSizeBytes: 512 * 1024,
        checksum: "mock-pca-checksum",
        format: "binary",
      },
    ],

    embedding: {
      model: "intfloat/multilingual-e5-small",
      revision: "mock-revision-1",
      dimensions: 384,
    },

    pca: {
      dimensions: 3,
      explainedVariance: 0.85,
    },

    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
  },

  {
    id: "healthcare-research",
    name: "Healthcare Research Dataset",
    description:
      "Bộ dữ liệu nghiên cứu y tế dùng để thử nghiệm quản lý và truy xuất tài liệu.",
    category: "Healthcare",
    version: "1.0.0",
    status: "PUBLISHED",

    documentCount: 200,
    totalSizeBytes: 10 * 1024 * 1024,

    assets: [
      {
        type: "PAPERS",
        fileName: "papers.json",
        url: "https://example.com/mock/healthcare/papers.json",
        fileSizeBytes: 4 * 1024 * 1024,
        checksum: "mock-health-papers-checksum",
        format: "json",
      },
      {
        type: "METADATA",
        fileName: "metadata.json",
        url: "https://example.com/mock/healthcare/metadata.json",
        fileSizeBytes: 1024 * 1024,
        checksum: "mock-health-metadata-checksum",
        format: "json",
      },
      {
        type: "EMBEDDINGS",
        fileName: "embeddings.bin",
        url: "https://example.com/mock/healthcare/embeddings.bin",
        fileSizeBytes: 4 * 1024 * 1024,
        checksum: "mock-health-embeddings-checksum",
        format: "binary",
      },
      {
        type: "PCA",
        fileName: "pca.bin",
        url: "https://example.com/mock/healthcare/pca.bin",
        fileSizeBytes: 1024 * 1024,
        checksum: "mock-health-pca-checksum",
        format: "binary",
      },
    ],

    embedding: {
      model: "intfloat/multilingual-e5-small",
      revision: "mock-revision-1",
      dimensions: 384,
    },

    pca: {
      dimensions: 3,
      explainedVariance: 0.9,
    },

    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
  },

  {
    id: "biology-research",
    name: "Biology Research Dataset",
    description:
      "Bộ dữ liệu sinh học phục vụ thử nghiệm quy trình quản lý Dataset.",
    category: "Biology",
    version: "1.0.0",
    status: "DRAFT",

    documentCount: 150,
    totalSizeBytes: 8 * 1024 * 1024,

    assets: [
      {
        type: "PAPERS",
        fileName: "papers.json",
        url: "https://example.com/mock/biology/papers.json",
        fileSizeBytes: 3 * 1024 * 1024,
        checksum: "mock-bio-papers-checksum",
        format: "json",
      },
      {
        type: "METADATA",
        fileName: "metadata.json",
        url: "https://example.com/mock/biology/metadata.json",
        fileSizeBytes: 1024 * 1024,
        checksum: "mock-bio-metadata-checksum",
        format: "json",
      },
      {
        type: "EMBEDDINGS",
        fileName: "embeddings.bin",
        url: "https://example.com/mock/biology/embeddings.bin",
        fileSizeBytes: 3 * 1024 * 1024,
        checksum: "mock-bio-embeddings-checksum",
        format: "binary",
      },
      {
        type: "PCA",
        fileName: "pca.bin",
        url: "https://example.com/mock/biology/pca.bin",
        fileSizeBytes: 1024 * 1024,
        checksum: "mock-bio-pca-checksum",
        format: "binary",
      },
    ],

    embedding: {
      model: "intfloat/multilingual-e5-small",
      revision: "mock-revision-1",
      dimensions: 384,
    },

    pca: {
      dimensions: 3,
      explainedVariance: 0.82,
    },

    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
  },
];
