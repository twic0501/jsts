import { describe, it, expect } from "vitest";

import {
  fitPca3,
  projectPca,
  cosineSimilarity,
  normalizeVector,
  SemanticIndex,
  corpusSchema,
  validateSnapshot,
} from "../packages/core/src";

import corpusFile from "../data/corpus.json";
import snapshotFile from "../data/semantic-snapshot.json";

// ============================================================
// 1. KHỞI TẠO DỮ LIỆU KIỂM THỬ
// ============================================================

const corpus = corpusSchema.parse(corpusFile);

const snapshot = validateSnapshot(corpus, snapshotFile);

const index = new SemanticIndex(corpus, snapshot);

// ============================================================
// 2. KIỂM THỬ VECTOR NGỮ NGHĨA
// ============================================================

describe("Vector ngữ nghĩa", () => {
  // ----------------------------------------------------------
  // COSINE SIMILARITY
  // ----------------------------------------------------------

  it("cosine identical / opposite / orthogonal", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);

    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);

    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  // ----------------------------------------------------------
  // VECTOR VALIDATION
  // Sử dụng object cases để tránh lỗi TS2345 của Vitest.
  // ----------------------------------------------------------

  const invalidVectors: Array<{
    name: string;
    vector: number[];
  }> = [
    {
      name: "vector rỗng",
      vector: [],
    },
    {
      name: "vector toàn số 0",
      vector: [0, 0],
    },
    {
      name: "vector chứa NaN",
      vector: [NaN, 1],
    },
    {
      name: "vector chứa Infinity",
      vector: [Infinity, 0],
    },
  ];

  it.each(invalidVectors)(
    "từ chối vector không hợp lệ: $name",
    ({ vector }) => {
      expect(() => normalizeVector(vector)).toThrow();
    },
  );

  it("từ chối sai dimension", () => {
    expect(() => cosineSimilarity([1, 0], [1])).toThrow();
  });

  // ----------------------------------------------------------
  // SNAPSHOT VECTORS
  // ----------------------------------------------------------

  it("30 vector thật, 384 chiều và L2 norm gần 1", () => {
    expect(snapshot.papers).toHaveLength(30);

    for (const paper of snapshot.papers) {
      expect(paper.vector).toHaveLength(384);

      expect(Math.hypot(...paper.vector)).toBeCloseTo(1, 5);
    }
  });

  // ----------------------------------------------------------
  // SEMANTIC SEARCH
  // ----------------------------------------------------------

  it("self-search đứng đầu, neighbors loại self", () => {
    const item = snapshot.papers[0];

    if (!item) {
      throw new Error("Fixture không hợp lệ.");
    }

    const result = index.search(
      {
        query: "self",
        topK: 10,
      },
      item.vector,
    );

    expect(result.items[0]?.paper.id).toBe(item.paperId);

    const paper = corpus.papers.find(
      (candidate) => candidate.id === item.paperId,
    );

    if (!paper) {
      throw new Error("Không tìm thấy bài báo kiểm thử.");
    }

    const neighbors = index.neighbors(paper);

    expect(neighbors.some((hit) => hit.paper.id === paper.id)).toBe(false);
  });

  // ==========================================================
  // 3. TÌM KIẾM TỪ KHÓA DỰ PHÒNG
  // ==========================================================

  it("tìm kiếm từ khóa khi thiếu embedding", () => {
    const result = index.search({
      query: "U-Net",
      topK: 10,
    });

    expect(result.items.length).toBeGreaterThan(0);

    expect(
      result.items.some((hit) =>
        hit.paper.title.toLowerCase().includes("u-net"),
      ),
    ).toBe(true);

    expect(result.items.every((hit) => hit.score > 0)).toBe(true);
  });

  it("không trả bài báo khi từ khóa không tồn tại", () => {
    const result = index.search({
      query: "xyznonexistentkeyword123",
      topK: 10,
    });

    expect(result.items).toHaveLength(0);

    expect(result.total).toBe(0);
  });

  it("truy vấn rỗng trả lại toàn bộ thư viện", () => {
    const result = index.search({
      query: "",
      topK: 50,
    });

    expect(result.total).toBe(corpus.papers.length);

    expect(result.items).toHaveLength(corpus.papers.length);
  });

  // ==========================================================
  // 4. BỘ LỌC VÀ XẾP HẠNG
  // ==========================================================

  it("filter trước topK", () => {
    const vector = snapshot.papers[0]?.vector;

    const result = index.search(
      {
        query: "q",
        group: "physics",
        yearFrom: 2024,
        topK: 2,
      },
      vector,
    );

    expect(result.items).toHaveLength(2);

    expect(
      result.items.every(
        (hit) => hit.paper.group === "physics" && hit.paper.year >= 2024,
      ),
    ).toBe(true);
  });

  it("rank được tính từ vector gốc, không từ tọa độ PCA", () => {
    const first = snapshot.papers[0];

    if (!first) {
      throw new Error("Fixture không hợp lệ.");
    }

    const expected = [...snapshot.papers].sort(
      (a, b) =>
        cosineSimilarity(first.vector, b.vector) -
          cosineSimilarity(first.vector, a.vector) ||
        a.paperId.localeCompare(b.paperId),
    );

    const result = index.search(
      {
        query: "q",
        topK: 5,
      },
      first.vector,
    );

    expect(result.items.map((hit) => hit.paper.id)).toEqual(
      expected.slice(0, 5).map((paper) => paper.paperId),
    );
  });

  // ==========================================================
  // 5. TÍNH TOÀN VẸN CỦA SNAPSHOT
  // ==========================================================

  it("version mismatch / duplicate ID / tọa độ giả đều bị từ chối", () => {
    // Kiểm tra corpus version không khớp.
    expect(() =>
      validateSnapshot(
        {
          ...corpus,
          version: "different",
        },
        snapshot,
      ),
    ).toThrow();

    // Kiểm tra tọa độ PCA bị thay đổi.
    const modifiedPoint = structuredClone(snapshot);

    if (modifiedPoint.papers[0]) {
      modifiedPoint.papers[0].point.x += 1;
    }

    expect(() => validateSnapshot(corpus, modifiedPoint)).toThrow();

    // Kiểm tra paper ID bị trùng.
    const duplicate = structuredClone(snapshot);

    if (duplicate.papers[0] && duplicate.papers[1]) {
      duplicate.papers[1].paperId = duplicate.papers[0].paperId;
    }

    expect(() => validateSnapshot(corpus, duplicate)).toThrow();
  });
});

// ============================================================
// 6. KIỂM THỬ PCA 3D
// ============================================================

describe("PCA 3D", () => {
  it("deterministic và đúng tọa độ training/query", () => {
    const vectors = [
      [3, 1, 0],
      [2, -1, 1],
      [-3, 1, -1],
      [-2, -1, 0],
    ];

    expect(fitPca3(vectors, 42)).toEqual(fitPca3(vectors, 42));

    const model = fitPca3(vectors, 42);

    for (const vector of vectors) {
      const point = projectPca(vector, model);

      expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
    }
  });

  it("rank deficient không tạo noise hoặc NaN", () => {
    const model = fitPca3([
      [1, 1],
      [1, 1],
      [1, 1],
    ]);

    expect(projectPca([1, 1], model)).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });

    expect(model.explainedVariance).toEqual([0, 0, 0]);
  });

  it("basis thật trực chuẩn và explained variance không vượt 1", () => {
    const components = snapshot.projection.components;

    for (let i = 0; i < 3; i++) {
      expect(Math.hypot(...(components[i] ?? []))).toBeCloseTo(1, 6);

      for (let j = i + 1; j < 3; j++) {
        expect(
          (components[i] ?? []).reduce(
            (sum, value, k) => sum + value * (components[j]?.[k] ?? 0),
            0,
          ),
        ).toBeCloseTo(0, 6);
      }
    }

    expect(
      snapshot.projection.explainedVariance.reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBeLessThanOrEqual(1);
  });

  it("projection từ snapshot khớp điểm đã lưu", () => {
    for (const paper of snapshot.papers) {
      expect(projectPca(paper.vector, snapshot.projection)).toEqual(
        paper.point,
      );
    }
  });
});
