export type DatasetStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type DatasetAssetType = "PAPERS" | "METADATA" | "EMBEDDINGS" | "PCA";

export interface DatasetAsset {
  type: DatasetAssetType;
  fileName: string;
  url: string;
  fileSizeBytes: number;
  checksum: string;
  format: string;
}

export interface EmbeddingConfig {
  model: string;
  revision: string;
  dimensions: number;
}

export interface PCAConfig {
  dimensions: number;
  explainedVariance: number;
}

export interface DatasetManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: DatasetStatus;

  documentCount: number;
  totalSizeBytes: number;

  assets: DatasetAsset[];

  embedding: EmbeddingConfig;
  pca: PCAConfig;

  createdAt: string;
  updatedAt: string;
}

export interface DatasetListResponse {
  success: boolean;
  data: DatasetManifest[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
