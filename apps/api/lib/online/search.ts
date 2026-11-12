import { createHash } from "node:crypto";
import { MongoClient } from "mongodb";

import {
  SemanticIndex,
  cosineSimilarity,
  embeddingText,
  projectPca,
  onlineSearchSchema,
  type DatasetBundle,
  type OnlineResponse,
  type Paper,
  type SearchResult,
} from "@paper-galaxy/core";

import { getDataset } from "../repository";
import { embedBatch, embedQuery } from "../embedding";
import { searchProvider, deduplicatePapers } from "./providers";

type Input = ReturnType<typeof onlineSearchSchema.parse>;

type Dependencies = {
  dataset: () => Promise<DatasetBundle>;
  query: (query: string) => Promise<number[]>;
  passages: (texts: string[]) => Promise<number[][]>;
  provider: typeof searchProvider;
};

const hash = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const VECTOR_DIMENSION = 384;
const EMBEDDING_CACHE_LIMIT = 1000;

type CachedEmbedding = {
  vector: number[];
  textHash: string;
  modelRevision: string;
};

// Cache embedding trong bộ nhớ để tránh tạo lại vector
// cho cùng một nội dung và cùng một phiên bản model.
const embeddingCache = new Map<string, CachedEmbedding>();

function getCacheKey(textHash: string, modelRevision: string): string {
  return `${modelRevision}:${textHash}`;
}

function getCachedEmbedding(
  textHash: string,
  modelRevision: string,
): number[] | undefined {
  const key = getCacheKey(textHash, modelRevision);
  const cached = embeddingCache.get(key);

  if (!cached) {
    return undefined;
  }

  // Đưa phần tử vừa sử dụng lên cuối Map.
  embeddingCache.delete(key);
  embeddingCache.set(key, cached);

  return cached.vector;
}

function saveCachedEmbedding(
  textHash: string,
  modelRevision: string,
  vector: number[],
): void {
  const key = getCacheKey(textHash, modelRevision);

  embeddingCache.delete(key);

  embeddingCache.set(key, {
    vector,
    textHash,
    modelRevision,
  });

  // Giới hạn kích thước cache.
  if (embeddingCache.size > EMBEDDING_CACHE_LIMIT) {
    const oldestKey = embeddingCache.keys().next().value;

    if (oldestKey !== undefined) {
      embeddingCache.delete(oldestKey);
    }
  }
}

function validateVector(vector: number[]): void {
  if (vector.length !== VECTOR_DIMENSION || !vector.every(Number.isFinite)) {
    throw new Error(
      "Embedding không hợp lệ: vector phải có 384 phần tử hữu hạn.",
    );
  }

  const norm = Math.hypot(...vector);

  if (Math.abs(norm - 1) >= 0.002) {
    throw new Error("Embedding không hợp lệ: vector phải được L2-normalize.");
  }
}

/**
 * Tạo embedding cho các bài báo mới.
 *
 * Ưu tiên sử dụng cache.
 * Chỉ gọi model đối với những nội dung chưa có vector.
 */
async function createEmbeddings(
  papers: Paper[],
  passages: (texts: string[]) => Promise<number[][]>,
  modelRevision: string,
  projection: DatasetBundle["snapshot"]["projection"],
) {
  const embeddings = new Array<DatasetBundle["snapshot"]["papers"][number]>(
    papers.length,
  );

  const missing: {
    index: number;
    paper: Paper;
    text: string;
    textHash: string;
  }[] = [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i]!;
    const text = embeddingText(paper);
    const textHash = hash(text);

    const cached = getCachedEmbedding(textHash, modelRevision);

    if (cached) {
      validateVector(cached);

      embeddings[i] = {
        paperId: paper.id,
        textHash,
        vector: cached,
        point: projectPca(cached, projection),
      };
    } else {
      missing.push({
        index: i,
        paper,
        text,
        textHash,
      });
    }
  }

  // Chỉ tạo embedding cho những bài báo chưa có cache.
  for (let i = 0; i < missing.length; i += 2) {
    const batch = missing.slice(i, i + 2);

    const vectors = await passages(batch.map((item) => item.text));

    if (vectors.length !== batch.length) {
      throw new Error("Số lượng vector không khớp số lượng bài báo.");
    }

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j]!;
      const vector = vectors[j]!;

      validateVector(vector);

      saveCachedEmbedding(item.textHash, modelRevision, vector);

      embeddings[item.index] = {
        paperId: item.paper.id,
        textHash: item.textHash,
        vector,
        point: projectPca(vector, projection),
      };
    }
  }

  return embeddings;
}

/**
 * Kiểm tra bài báo có thỏa mãn bộ lọc hay không.
 */
function matchesFilters(paper: Paper, input: Input): boolean {
  if (input.group && paper.group !== input.group) {
    return false;
  }

  if (input.yearFrom !== undefined && paper.year < input.yearFrom) {
    return false;
  }

  if (input.yearTo !== undefined && paper.year > input.yearTo) {
    return false;
  }

  return true;
}

/**
 * Thực hiện tìm kiếm trực tuyến.
 *
 * Quy trình:
 * 1. Lấy dataset hiện tại.
 * 2. Tạo vector truy vấn.
 * 3. Tìm kiếm trên arXiv và OpenAlex.
 * 4. Loại bỏ bài báo trùng lặp.
 * 5. Tạo embedding cho bài báo mới.
 * 6. Lọc dữ liệu trước khi xếp hạng.
 * 7. Tìm kiếm bằng cosine similarity.
 * 8. Trả kết quả.
 */
export async function runOnlineSearch(
  input: Input,
  deps: Dependencies,
): Promise<OnlineResponse> {
  const started = performance.now();

  const base = await deps.dataset();

  const [queryVector, sources] = await Promise.all([
    deps.query(input.query),

    Promise.all([
      deps.provider("arxiv", input.query),
      deps.provider("openalex", input.query),
    ]),
  ]);

  validateVector(queryVector);

  // Giới hạn số bài lấy từ mỗi nguồn.
  const candidates = Array.from({ length: 8 }, (_, index) =>
    sources.flatMap((source) =>
      source.papers[index] ? [source.papers[index]!] : [],
    ),
  ).flat();

  // Loại bỏ bài báo đã tồn tại trong dataset.
  const fresh = deduplicatePapers(candidates, base.corpus.papers);

  // Tạo embedding cho bài báo mới.
  const embeddings = await createEmbeddings(
    fresh,
    deps.passages,
    base.snapshot.model.revision,
    base.snapshot.projection,
  );

  // Kết hợp dataset gốc và dữ liệu trực tuyến.
  const papers = [...base.corpus.papers, ...fresh];

  const version =
    "online-" + hash(papers.map((paper) => paper.id).join("|")).slice(0, 16);

  const corpus = {
    ...base.corpus,
    version,
    title: "Thư viện và kết quả trực tuyến",
    fetchedAt: new Date().toISOString(),
    papers,
  };

  const snapshot = {
    ...base.snapshot,
    corpusVersion: version,
    createdAt: new Date().toISOString(),
    corpusHash: hash(papers.map(embeddingText).join("\n")),
    papers: [...base.snapshot.papers, ...embeddings],
  };

  // Xác định phạm vi tìm kiếm.
  const externalIds = new Set(
    sources.flatMap((source) => source.papers.map((paper) => paper.id)),
  );

  // Lọc scope, group và year TRƯỚC khi xếp hạng.
  const eligiblePapers = papers.filter((paper) => {
    const inScope = input.scope === "combined" || externalIds.has(paper.id);

    return inScope && matchesFilters(paper, input);
  });

  const eligibleIds = new Set(eligiblePapers.map((paper) => paper.id));

  const eligibleEmbeddings = snapshot.papers.filter((embedding) =>
    eligibleIds.has(embedding.paperId),
  );

  // Tạo corpus và snapshot tương ứng với phạm vi tìm kiếm.
  const searchCorpus = {
    ...corpus,
    papers: eligiblePapers,
  };

  const searchSnapshot = {
    ...snapshot,
    papers: eligibleEmbeddings,
  };

  // Chỉ xếp hạng trên những bài báo hợp lệ.
  let result: SearchResult;

  if (eligiblePapers.length >= 2) {
    const index = new SemanticIndex(searchCorpus, searchSnapshot);

    result = index.search(
      {
        query: input.query,
        topK: 50,
        ...(input.group ? { group: input.group } : {}),
        ...(input.yearFrom !== undefined ? { yearFrom: input.yearFrom } : {}),
        ...(input.yearTo !== undefined ? { yearTo: input.yearTo } : {}),
      },
      queryVector,
    );

    result.queryPoint = index.projectQuery(queryVector);
  } else {
    // SemanticSnapshot yêu cầu tối thiểu 2 bài báo.
    // Với 0 hoặc 1 bài, tính cosine trực tiếp để tránh lỗi validation.
    const embeddingById = new Map(
      eligibleEmbeddings.map((embedding) => [embedding.paperId, embedding]),
    );

    const items = eligiblePapers
      .map((paper) => {
        const embedding = embeddingById.get(paper.id);

        if (!embedding) {
          throw new Error("Thiếu embedding cho bài báo.");
        }

        return {
          paper,
          score: cosineSimilarity(queryVector, embedding.vector),
        };
      })
      .sort(
        (a, b) => b.score - a.score || a.paper.id.localeCompare(b.paper.id),
      );

    result = {
      items: items.slice(0, input.topK),
      total: items.length,
      durationMs: 0,
      method: "semantic",
      datasetVersion: corpus.version,
    };
  }

  result.total = eligiblePapers.length;
  result.items = result.items.slice(0, input.topK);

  result.queryPoint = projectPca(queryVector, base.snapshot.projection);

  result.durationMs = performance.now() - started;

  // Thu thập cảnh báo từ các nguồn dữ liệu.
  const warnings = sources
    .filter(
      (source) =>
        source.status.status === "error" ||
        source.status.status === "rate-limited",
    )
    .map((source) => source.status.provider + ": " + source.status.message);

  if (fresh.some((paper) => paper.provenance?.abstractAvailable === false)) {
    warnings.push("Một số bài thiếu abstract: chỉ tính vector từ tiêu đề.");
  }

  return {
    dataset: {
      corpus,
      snapshot,
    },
    result,
    providers: sources.map((source) => source.status),
    scope: input.scope,
    ranking: "e5-cosine-384d",
    storage: "memory",
    warnings,
  };
}

let mongo: MongoClient | undefined;

/**
 * Tìm kiếm trực tuyến và lưu dữ liệu vào MongoDB.
 */
export async function onlineSearch(input: Input): Promise<OnlineResponse> {
  const result = await runOnlineSearch(input, {
    dataset: async () => {
      const data = await getDataset();

      return {
        corpus: data.corpus,
        snapshot: data.index.snapshot,
      };
    },

    query: embedQuery,
    passages: embedBatch,
    provider: searchProvider,
  });

  if (!process.env.MONGODB_URI) {
    return result;
  }

  try {
    mongo ??= new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
      maxPoolSize: 3,
    });

    await mongo.connect();

    const db = mongo.db();

    const papers = result.dataset.corpus.papers.filter(
      (paper) => paper.provenance,
    );

    if (papers.length > 0) {
      const paperIds = new Set(papers.map((paper) => paper.id));

      const embeddings = result.dataset.snapshot.papers.filter((embedding) =>
        paperIds.has(embedding.paperId),
      );

      const embeddingIds = new Set(
        embeddings.map((embedding) => embedding.paperId),
      );

      // Không lưu một paper nếu chưa có embedding tương ứng.
      const validPapers = papers.filter((paper) => embeddingIds.has(paper.id));

      if (validPapers.length !== papers.length) {
        result.warnings.push("Một số paper thiếu embedding và không được lưu.");
      }

      // Ghi Paper trước.
      if (validPapers.length > 0) {
        await db.collection<Paper & { _id: string }>("onlinePapers").bulkWrite(
          validPapers.map((paper) => ({
            replaceOne: {
              filter: { _id: paper.id },
              replacement: {
                _id: paper.id,
                ...paper,
              },
              upsert: true,
            },
          })),
        );
      }

      // Sau đó ghi các embedding tương ứng.
      const validIds = new Set(validPapers.map((paper) => paper.id));

      const validEmbeddings = embeddings.filter((embedding) =>
        validIds.has(embedding.paperId),
      );

      if (validEmbeddings.length > 0) {
        await db
          .collection<{
            _id: string;
            paperId: string;
            textHash: string;
            vector: number[];
            point: {
              x: number;
              y: number;
              z: number;
            };
            modelRevision: string;
          }>("onlineEmbeddings")
          .bulkWrite(
            validEmbeddings.map((embedding) => ({
              replaceOne: {
                filter: {
                  _id: embedding.paperId,
                },
                replacement: {
                  _id: embedding.paperId,
                  ...embedding,
                  modelRevision: result.dataset.snapshot.model.revision,
                },
                upsert: true,
              },
            })),
          );
      }
    }

    result.storage = "mongodb";
  } catch {
    result.warnings.push(
      "Kết quả vẫn có trong phiên hiện tại; quá trình lưu MongoDB chưa hoàn tất. Có thể thử lưu lại ở lần tiếp theo.",
    );
  }

  return result;
}
