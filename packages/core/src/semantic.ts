import { z } from "zod";

import {
  searchSchema,
  type Corpus,
  type Paper,
  type SearchInput,
  type SearchResult,
} from "./contracts.ts";

import { cosineSimilarity, projectPca, type Vec3 } from "./vector.ts";

const VECTOR_DIMENSIONS = 384;
const VECTOR_TOLERANCE = 0.002;
const PCA_TOLERANCE = 1e-5;
const MAX_NEIGHBORS = 100;

const finite = z.number().finite();

/**
 * Kiểm tra tọa độ trong không gian 3D.
 */
export const pointSchema = z
  .object({
    x: finite,
    y: finite,
    z: finite,
  })
  .strict();

/**
 * Kiểm tra vector embedding.
 *
 * Vector phải:
 * - Có đúng 384 chiều.
 * - Chỉ chứa số hữu hạn.
 * - Được L2 normalize.
 */
const vectorSchema = z
  .array(finite)
  .length(VECTOR_DIMENSIONS)
  .refine(
    (vector) => Math.abs(Math.hypot(...vector) - 1) < VECTOR_TOLERANCE,
    "Vector chưa L2 normalize.",
  );

/**
 * Cấu trúc của semantic snapshot.
 */
export const semanticSnapshotSchema = z
  .object({
    version: z.string().min(1),

    corpusVersion: z.string().min(1),

    createdAt: z.string().min(1),

    corpusHash: z.string().min(1),

    model: z
      .object({
        id: z.literal("Xenova/multilingual-e5-small"),

        revision: z.string().min(1),

        dtype: z.literal("q8"),

        dimensions: z.literal(VECTOR_DIMENSIONS),

        pipelineVersion: z.string().min(1),
      })
      .strict(),

    projection: z
      .object({
        mean: z.array(finite).length(VECTOR_DIMENSIONS),

        components: z
          .array(z.array(finite).length(VECTOR_DIMENSIONS))
          .length(3),

        explainedVariance: z.array(finite.nonnegative()).length(3),

        center: pointSchema,

        scale: finite.positive(),

        seed: z.number().int(),
      })
      .strict(),

    papers: z
      .array(
        z
          .object({
            paperId: z.string().min(1),

            textHash: z.string().min(1),

            vector: vectorSchema,

            point: pointSchema,
          })
          .strict(),
      )
      .min(2),
  })
  .strict();

export type SemanticSnapshot = z.infer<typeof semanticSnapshotSchema>;

/**
 * Kiểm tra vector đầu vào.
 */
function validateVector(vector: readonly number[]): void {
  if (vector.length !== VECTOR_DIMENSIONS) {
    throw new Error(`Vector phải có đúng ${VECTOR_DIMENSIONS} chiều.`);
  }

  if (!vector.every(Number.isFinite)) {
    throw new Error("Vector chứa giá trị không hợp lệ.");
  }

  const norm = Math.hypot(...vector);

  if (!Number.isFinite(norm) || Math.abs(norm - 1) >= VECTOR_TOLERANCE) {
    throw new Error("Vector truy vấn chưa được L2 normalize.");
  }
}

/**
 * Kiểm tra semantic snapshot có khớp corpus không.
 *
 * Các điều kiện:
 * 1. Corpus version phải khớp.
 * 2. Số lượng vector phải bằng số lượng paper.
 * 3. ID vector không được trùng.
 * 4. Mỗi paper phải có đúng một vector.
 * 5. Tọa độ PCA phải khớp phép chiếu từ vector gốc.
 */
export function validateSnapshot(
  corpus: Corpus,
  raw: unknown,
): SemanticSnapshot {
  const snapshot = semanticSnapshotSchema.parse(raw);

  if (
    snapshot.corpusVersion !== corpus.version ||
    snapshot.papers.length !== corpus.papers.length
  ) {
    throw new Error("Phiên bản corpus và vector không khớp.");
  }

  const paperIds = new Set(corpus.papers.map((paper) => paper.id));

  if (paperIds.size !== corpus.papers.length) {
    throw new Error("Corpus chứa ID bài báo trùng lặp.");
  }

  const vectorIds = new Set(snapshot.papers.map((paper) => paper.paperId));

  if (vectorIds.size !== snapshot.papers.length) {
    throw new Error("Semantic snapshot chứa ID vector trùng lặp.");
  }

  if (snapshot.papers.some((paper) => !paperIds.has(paper.paperId))) {
    throw new Error("ID vector không khớp corpus.");
  }

  const embeddingById = new Map(
    snapshot.papers.map((paper) => [paper.paperId, paper]),
  );

  for (const paper of corpus.papers) {
    const embedding = embeddingById.get(paper.id);

    if (!embedding) {
      throw new Error(`Thiếu vector của bài báo ${paper.id}.`);
    }

    const expected = projectPca(embedding.vector, snapshot.projection);

    const distance = Math.hypot(
      expected.x - embedding.point.x,
      expected.y - embedding.point.y,
      expected.z - embedding.point.z,
    );

    if (!Number.isFinite(distance) || distance > PCA_TOLERANCE) {
      throw new Error(`Tọa độ PCA không khớp bài báo ${paper.id}.`);
    }
  }

  return snapshot;
}

/**
 * Chỉ mục tìm kiếm ngữ nghĩa.
 *
 * Similarity được tính trong không gian embedding 384D.
 * PCA 3D chỉ phục vụ trực quan hóa.
 */
export class SemanticIndex {
  private readonly byId: Map<string, SemanticSnapshot["papers"][number]>;

  constructor(
    public readonly corpus: Corpus,
    public readonly snapshot: SemanticSnapshot,
  ) {
    validateSnapshot(corpus, snapshot);

    this.byId = new Map(snapshot.papers.map((paper) => [paper.paperId, paper]));
  }

  /**
   * Tìm kiếm tài liệu theo vector ngữ nghĩa.
   *
   * Nếu có queryVector:
   * - Tính cosine similarity.
   * - Sắp xếp theo điểm tương đồng giảm dần.
   *
   * Nếu không có queryVector:
   * - Sắp xếp theo năm xuất bản mới nhất.
   */
  search(raw: SearchInput, queryVector?: readonly number[]): SearchResult {
    const input = searchSchema.parse(raw);

    const started = performance.now();

    if (input.query && !queryVector) {
      throw new Error("Cần vector truy vấn cho tìm kiếm ngữ nghĩa.");
    }

    if (queryVector) {
      validateVector(queryVector);
    }

    const hits = this.corpus.papers
      .flatMap((paper) => {
        // Lọc theo lĩnh vực.
        if (input.group && paper.group !== input.group) {
          return [];
        }

        // Lọc theo năm bắt đầu.
        if (input.yearFrom !== undefined && paper.year < input.yearFrom) {
          return [];
        }

        // Lọc theo năm kết thúc.
        if (input.yearTo !== undefined && paper.year > input.yearTo) {
          return [];
        }

        const embedding = this.byId.get(paper.id);

        if (!embedding) {
          throw new Error(`Thiếu vector của bài báo ${paper.id}.`);
        }

        const score = queryVector
          ? cosineSimilarity(queryVector, embedding.vector)
          : 0;

        return [
          {
            paper,
            score,
          },
        ];
      })
      .sort((a, b) => {
        if (queryVector) {
          return b.score - a.score || a.paper.id.localeCompare(b.paper.id);
        }

        return (
          b.paper.year - a.paper.year || a.paper.id.localeCompare(b.paper.id)
        );
      });

    return {
      items: hits.slice(0, input.topK),

      total: hits.length,

      durationMs: performance.now() - started,

      method: "semantic",

      datasetVersion: this.corpus.version,
    };
  }

  /**
   * Tìm các bài báo gần nhất với một bài báo cho trước.
   */
  neighbors(paper: Paper, limit = 4) {
    if (!Number.isInteger(limit) || limit < 0 || limit > MAX_NEIGHBORS) {
      throw new Error(
        `Số lượng neighbors phải nằm trong khoảng 0-${MAX_NEIGHBORS}.`,
      );
    }

    const own = this.byId.get(paper.id);

    if (!own || limit === 0) {
      return [];
    }

    const result = this.search(
      {
        query: "neighbors",
        topK: this.corpus.papers.length,
      },
      own.vector,
    );

    return result.items
      .filter((hit) => hit.paper.id !== paper.id)
      .slice(0, limit);
  }

  /**
   * Chiếu vector 384D xuống không gian PCA 3D.
   *
   * Chỉ sử dụng cho trực quan hóa.
   */
  projectQuery(vector: readonly number[]): Vec3 {
    validateVector(vector);

    return projectPca(vector, this.snapshot.projection);
  }

  /**
   * Phân tích mức độ kết nối giữa các lĩnh vực.
   *
   * Dựa trên phân bố nhóm nghiên cứu của các neighbors.
   */
  bridgeEvidence(paper: Paper) {
    const neighbors = this.neighbors(paper, 10);

    const counts: Record<string, number> = {};

    for (const neighbor of neighbors) {
      const group = neighbor.paper.group;

      counts[group] = (counts[group] ?? 0) + 1;
    }

    const total = neighbors.length;

    // Entropy chuẩn hóa:
    // 0: tất cả neighbors thuộc cùng một nhóm.
    // 1: phân bố đều trên cả bốn nhóm.
    const entropy =
      total > 0
        ? -Object.values(counts).reduce((sum, count) => {
            const probability = count / total;

            return sum + probability * Math.log(probability);
          }, 0) / Math.log(4)
        : 0;

    return {
      counts,

      entropy,

      neighborCount: total,
    };
  }
}
