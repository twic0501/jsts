import { describe, expect, it, vi } from "vitest";

import { createPassageEmbeddingCache } from "../apps/api/lib/rag/embedding-cache";

describe("Passage embedding cache", () => {
  it("tính embedding khi passage chưa có trong cache", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    const embed = vi.fn(async (texts: string[]) =>
      texts.map((text) => [text.length, 1]),
    );

    const result = await cache(["passage: machine learning"], embed);

    expect(embed).toHaveBeenCalledTimes(1);

    expect(result).toEqual([["passage: machine learning".length, 1]]);
  });

  it("tái sử dụng embedding khi passage không thay đổi", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    const embed = vi.fn(async (texts: string[]) =>
      texts.map((text) => [text.length, 1]),
    );

    const passage = "passage: machine learning";

    const first = await cache([passage], embed);
    const second = await cache([passage], embed);

    expect(embed).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("tính embedding mới khi nội dung passage thay đổi", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    const embed = vi.fn(async (texts: string[]) =>
      texts.map((text) => [text.length, 1]),
    );

    await cache(["passage: machine learning"], embed);

    await cache(["passage: deep learning"], embed);

    expect(embed).toHaveBeenCalledTimes(2);
  });

  it("không embedding trùng khi hai request chạy đồng thời", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    let resolveEmbedding!: (vectors: number[][]) => void;

    const embed = vi.fn(
      (_texts: string[]) =>
        new Promise<number[][]>((resolve) => {
          resolveEmbedding = resolve;
        }),
    );

    const passage = "passage: concurrent request";

    const firstRequest = cache([passage], embed);

    const secondRequest = cache([passage], embed);

    // Cả hai request chỉ được tạo một embedding.
    expect(embed).toHaveBeenCalledTimes(1);

    resolveEmbedding([[10, 20]]);

    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first).toEqual([[10, 20]]);
    expect(second).toEqual([[10, 20]]);
    expect(embed).toHaveBeenCalledTimes(1);
  });

  it("giữ đúng thứ tự vector khi đầu vào có passage trùng nhau", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    const embed = vi.fn(async (texts: string[]) =>
      texts.map((text) => [text.length, 1]),
    );

    const result = await cache(["passage A", "passage B", "passage A"], embed);

    expect(embed).toHaveBeenCalledTimes(1);

    expect(result).toEqual([
      ["passage A".length, 1],
      ["passage B".length, 1],
      ["passage A".length, 1],
    ]);
  });

  it("loại bỏ vector cũ nhất khi cache vượt giới hạn", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 2,
      dimensions: 2,
    });

    const embed = vi.fn(async (texts: string[]) =>
      texts.map((text) => [text.length, 1]),
    );

    await cache(["A"], embed);
    await cache(["B"], embed);
    await cache(["C"], embed);

    // A đã bị loại khỏi cache nên cần embedding lại.
    await cache(["A"], embed);

    expect(embed).toHaveBeenCalledTimes(4);
  });

  it("từ chối vector sai số chiều", async () => {
    const cache = createPassageEmbeddingCache({
      maxEntries: 10,
      dimensions: 2,
    });

    const embed = vi.fn(async () => [[1, 2, 3]]);

    await expect(cache(["passage: invalid vector"], embed)).rejects.toThrow(
      "Invalid passage embedding vector.",
    );
  });
});
