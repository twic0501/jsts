import { z } from "zod";
import {
  searchSchema,
  type Corpus,
  type Paper,
  type SearchInput,
  type SearchResult,
} from "./contracts";
import { cosineSimilarity, projectPca, type Vec3 } from "./vector";

const finite = z.number().finite();

export const pointSchema = z
  .object({
    x: finite,
    y: finite,
    z: finite,
  })
  .strict();

const vectorSchema = z
  .array(finite)
  .length(384)
  .refine(
    (v) => Math.abs(Math.hypot(...v) - 1) < 0.002,
    "Vector chưa L2 normalize.",
  );

export const semanticSnapshotSchema = z
  .object({
    version: z.string(),
    corpusVersion: z.string(),
    createdAt: z.string(),
    corpusHash: z.string(),
    model: z
      .object({
        id: z.literal("Xenova/multilingual-e5-small"),
        revision: z.string(),
        dtype: z.literal("q8"),
        dimensions: z.literal(384),
        pipelineVersion: z.string(),
      })
      .strict(),
    projection: z
      .object({
        mean: z.array(finite).length(384),
        components: z.array(z.array(finite).length(384)).length(3),
        explainedVariance: z.array(finite).length(3),
        center: pointSchema,
        scale: finite.positive(),
        seed: z.number().int(),
      })
      .strict(),
    papers: z
      .array(
        z
          .object({
            paperId: z.string(),
            textHash: z.string(),
            vector: vectorSchema,
            point: pointSchema,
          })
          .strict(),
      )
      .min(2),
  })
  .strict();

export type SemanticSnapshot = z.infer<typeof semanticSnapshotSchema>;

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

  const ids = new Set(snapshot.papers.map((paper) => paper.paperId));

  if (
    ids.size !== snapshot.papers.length ||
    corpus.papers.some((paper) => !ids.has(paper.id))
  ) {
    throw new Error("ID vector không khớp corpus.");
  }

  for (const paper of snapshot.papers) {
    const expected = projectPca(paper.vector, snapshot.projection);

    const distance = Math.hypot(
      expected.x - paper.point.x,
      expected.y - paper.point.y,
      expected.z - paper.point.z,
    );

    if (distance > 1e-5) {
      throw new Error("Tọa độ không khớp phép chiếu PCA.");
    }
  }

  return snapshot;
}

/**
 * Chuẩn hóa văn bản để tìm kiếm từ khóa.
 * Hỗ trợ Unicode và không phân biệt chữ hoa/chữ thường.
 */
function normalizeText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Kiểm tra từ khóa độc lập, tránh các trường hợp:
 * "ai" khớp nhầm với "training".
 *
 * Unicode property escapes hỗ trợ từ có dấu.
 */
function containsTerm(text: string, term: string): boolean {
  if (!term) return false;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  );

  return pattern.test(text);
}

/**
 * Tính mức liên quan bằng từ khóa.
 * Đây là phương án dự phòng khi không có embedding.
 */
function keywordScore(paper: Paper, query: string): number {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return 0;

  const terms = [...new Set(normalizedQuery.split(/\s+/).filter(Boolean))];

  if (terms.length === 0) return 0;

  const fields = [
    {
      value: normalizeText(paper.title),
      weight: 5,
    },
    {
      value: normalizeText(paper.summary ?? ""),
      weight: 3,
    },
    {
      value: normalizeText(paper.abstract),
      weight: 2,
    },
    {
      value: normalizeText(paper.tags.join(" ")),
      weight: 4,
    },
    {
      value: normalizeText(paper.categories.join(" ")),
      weight: 2,
    },
    {
      value: normalizeText(paper.authors.join(" ")),
      weight: 1,
    },
  ];

  let matchedTerms = 0;
  let weightedScore = 0;

  for (const term of terms) {
    let bestWeight = 0;

    for (const field of fields) {
      if (containsTerm(field.value, term) && field.weight > bestWeight) {
        bestWeight = field.weight;
      }
    }

    if (bestWeight > 0) {
      matchedTerms++;
      weightedScore += bestWeight;
    }
  }

  if (matchedTerms === 0) return 0;

  const coverage = matchedTerms / terms.length;

  const relevance = weightedScore / (terms.length * 5);

  const title = normalizeText(paper.title);

  const phraseBonus = title.includes(normalizedQuery) ? 0.15 : 0;

  return Math.min(1, 0.55 * coverage + 0.3 * relevance + phraseBonus);
}

export class SemanticIndex {
  private readonly byId: Map<string, SemanticSnapshot["papers"][number]>;

  constructor(
    public readonly corpus: Corpus,
    public readonly snapshot: SemanticSnapshot,
  ) {
    validateSnapshot(corpus, snapshot);

    this.byId = new Map(snapshot.papers.map((paper) => [paper.paperId, paper]));
  }

  search(raw: SearchInput, queryVector?: readonly number[]): SearchResult {
    const input = searchSchema.parse(raw);
    const started = performance.now();

    const query = input.query.trim();

    const useSemantic = Boolean(query && queryVector);

    const useKeyword = Boolean(query && !queryVector);

    const hits = this.corpus.papers
      .flatMap((paper) => {
        if (
          (input.group && paper.group !== input.group) ||
          (input.yearFrom !== undefined && paper.year < input.yearFrom) ||
          (input.yearTo !== undefined && paper.year > input.yearTo)
        ) {
          return [];
        }

        const embedding = this.byId.get(paper.id);

        if (!embedding) {
          throw new Error(`Thiếu vector cho bài báo ${paper.id}.`);
        }

        let score = 0;

        if (useSemantic && queryVector) {
          score = cosineSimilarity(queryVector, embedding.vector);
        } else if (useKeyword) {
          score = keywordScore(paper, query);

          if (score <= 0) {
            return [];
          }
        }

        return [{ paper, score }];
      })
      .sort((a, b) => {
        if (!query) {
          return (
            b.paper.year - a.paper.year || a.paper.id.localeCompare(b.paper.id)
          );
        }

        return b.score - a.score || a.paper.id.localeCompare(b.paper.id);
      });

    return {
      items: hits.slice(0, input.topK),
      total: hits.length,
      durationMs: performance.now() - started,
      // Giữ giá trị tương thích với SearchResult hiện tại.
      // Khi fallback, score được tính bằng từ khóa.
      method: "semantic",
      datasetVersion: this.corpus.version,
    };
  }

  neighbors(paper: Paper, limit = 4) {
    const own = this.byId.get(paper.id);

    if (!own) return [];

    return this.search(
      {
        query: "neighbors",
        topK: 50,
      },
      own.vector,
    )
      .items.filter((hit) => hit.paper.id !== paper.id)
      .slice(0, limit);
  }

  projectQuery(vector: readonly number[]): Vec3 {
    return projectPca(vector, this.snapshot.projection);
  }

  bridgeEvidence(paper: Paper) {
    const neighbors = this.neighbors(paper, 10);

    const counts: Record<string, number> = {};

    for (const neighbor of neighbors) {
      counts[neighbor.paper.group] = (counts[neighbor.paper.group] ?? 0) + 1;
    }

    const entropy = neighbors.length
      ? -Object.values(counts).reduce(
          (sum, count) =>
            sum +
            (count / neighbors.length) * Math.log(count / neighbors.length),
          0,
        ) / Math.log(4)
      : 0;

    return {
      counts,
      entropy,
      neighborCount: neighbors.length,
    };
  }
}
