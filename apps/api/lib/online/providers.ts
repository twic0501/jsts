import {
  paperSchema,
  type Paper,
  type Group,
  type ProviderStatus,
} from "@paper-galaxy/core";

type Json = Record<string, unknown>;

const MAX_RESULTS = 8;
const MAX_RESPONSE_BYTES = 2_000_000;
const CACHE_TTL = 15 * 60_000;
const CACHE_LIMIT = 80;
const REQUEST_TIMEOUT = 10_000;

const record = (value: unknown): Json =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * Giải mã HTML/XML entities.
 */
function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (match, entity: string) => {
      const code = entity.toLowerCase();

      if (code === "amp") return "&";
      if (code === "lt") return "<";
      if (code === "gt") return ">";
      if (code === "quot") return '"';
      if (code === "apos") return "'";
      if (code === "nbsp") return " ";

      const number = code.startsWith("#x")
        ? Number.parseInt(code.slice(2), 16)
        : Number(code.slice(1));

      if (
        !Number.isInteger(number) ||
        number <= 0 ||
        number > 0x10ffff ||
        (number >= 0xd800 && number <= 0xdfff)
      ) {
        return match;
      }

      return String.fromCodePoint(number);
    },
  );
}

/**
 * Làm sạch nội dung HTML/XML.
 */
export function cleanText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match) =>
      decodeEntities(match),
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích xuất nội dung một XML tag.
 */
function extractXmlTag(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const expression = new RegExp(
    `<${escapedName}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapedName}\\s*>`,
    "i",
  );

  return source.match(expression)?.[1] ?? "";
}

/**
 * Khôi phục abstract từ OpenAlex inverted index.
 */
export function reconstructAbstract(value: unknown): string {
  const source = record(value);
  const words = new Map<number, string>();

  let count = 0;

  for (const [word, positions] of Object.entries(source)) {
    if (!Array.isArray(positions)) {
      continue;
    }

    for (const position of positions) {
      if (
        typeof position === "number" &&
        Number.isInteger(position) &&
        position >= 0 &&
        position < 5000
      ) {
        words.set(position, word);
        count++;

        if (count >= 5000) {
          break;
        }
      }
    }

    if (count >= 5000) {
      break;
    }
  }

  return cleanText(
    [...words.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, word]) => word)
      .join(" "),
  ).slice(0, 20000);
}

/**
 * Phân loại lĩnh vực nghiên cứu.
 *
 * Schema hiện tại chỉ hỗ trợ:
 * ai, biology, medicine, physics.
 */
export function guessGroup(value: string): Group {
  const source = value.toLowerCase();

  if (
    /medicine|medical|cancer|clinical|radiology|med-ph|pharmacolog|healthcare|epidemiolog|diagnos|surgery|cardiolog|neurolog|oncolog|therapeutic/.test(
      source,
    )
  ) {
    return "medicine";
  }

  if (
    /biolog|protein|genom|q-bio|biochem|molecular|cellular|organism|microbiolog|ecolog|evolution|genetic|transcriptom/.test(
      source,
    )
  ) {
    return "biology";
  }

  if (
    /physic|quantum|quant-ph|astro|cond-mat|hep-ph|hep-th|gr-qc|nuclear|electromagnet|thermodynamic|relativity/.test(
      source,
    )
  ) {
    return "physics";
  }

  return "ai";
}

/**
 * Kiểm tra URL HTTPS hợp lệ.
 */
function https(value: unknown): string | null {
  try {
    const url = new URL(text(value));

    if (url.protocol !== "https:" || url.username || url.password) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/**
 * Chuẩn hóa DOI.
 */
function safeDoi(value: unknown): string | null {
  const raw = text(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .trim()
    .toLowerCase();

  return /^10\.\d{4,9}\/\S+$/.test(raw) && raw.length < 300 ? raw : null;
}

/**
 * Lấy arXiv ID từ URL hoặc ID thuần.
 * Hỗ trợ định dạng ID mới và ID cũ.
 */
function extractArxivId(value: unknown): string | null {
  const raw = text(value).trim();

  if (!raw) {
    return null;
  }

  // Trường hợp đã là arXiv ID.
  const plainId = raw.replace(/v\d+$/i, "").trim();

  if (
    /^\d{4}\.\d{4,5}$/.test(plainId) ||
    /^[a-z-]+(?:\.[a-z-]+)?\/\d{7}$/i.test(plainId)
  ) {
    return plainId.toLowerCase();
  }

  // Trường hợp là URL arXiv.
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // Chỉ chấp nhận đúng hostname arxiv.org.
  // Hỗ trợ HTTP vì Atom feed của arXiv có thể trả URL dạng HTTP.
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.hostname.toLowerCase() !== "arxiv.org" ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null;
  }

  const match = url.pathname.match(
    /^\/(?:abs|pdf)\/([^/]+(?:\/\d{7}(?:v\d+)?)?)(?:\.pdf)?$/i,
  );

  if (!match) {
    return null;
  }

  const id = match[1]!.replace(/v\d+$/i, "").trim();

  if (
    /^\d{4}\.\d{4,5}$/.test(id) ||
    /^[a-z-]+(?:\.[a-z-]+)?\/\d{7}$/i.test(id)
  ) {
    return id.toLowerCase();
  }

  return null;
}

/**
 * Chuẩn hóa OpenAlex response thành Paper.
 */
export function normalizeOpenAlex(
  raw: unknown,
  now = new Date().toISOString(),
): Paper[] {
  const results = record(raw).results;

  if (!Array.isArray(results)) {
    throw new Error("OpenAlex trả dữ liệu không hợp lệ.");
  }

  const papers: Paper[] = [];

  for (const item of results.slice(0, MAX_RESULTS)) {
    const row = record(item);

    const id = text(row.id).match(/^https:\/\/openalex\.org\/(W\d+)$/i)?.[1];

    const title = cleanText(text(row.title));

    const abstract = reconstructAbstract(row.abstract_inverted_index);

    const topic = record(row.primary_topic);

    const field = text(record(topic.field).display_name);

    const location = record(row.primary_location);

    if (!id || !title) {
      continue;
    }

    const doi = safeDoi(row.doi);

    const authors = Array.isArray(row.authorships)
      ? row.authorships
          .map((author) =>
            cleanText(text(record(record(author).author).display_name)),
          )
          .filter(Boolean)
          .slice(0, 30)
      : [];

    const landing = text(location.landing_page_url);

    const arxivId = extractArxivId(landing);

    const sourceUrl = arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : doi
        ? `https://doi.org/${doi}`
        : `https://openalex.org/${id}`;

    const concepts = Array.isArray(row.concepts)
      ? row.concepts.map((item) => text(record(item).display_name))
      : [];

    const candidate = {
      id: arxivId ?? `oa:${id}`,

      title: title.slice(0, 1000),

      abstract:
        abstract || "Nguồn chưa cung cấp tóm tắt. Điểm được tính từ tiêu đề.",

      authors: authors.length > 0 ? authors : ["Chưa có thông tin tác giả"],

      year: row.publication_year,

      group: guessGroup([field, text(row.type), title, ...concepts].join(" ")),

      categories: field ? [field] : ["Unclassified"],

      sourceUrl,

      tags: ["OpenAlex"],

      summary: abstract
        ? abstract.slice(0, 240) + (abstract.length > 240 ? "…" : "")
        : "Chỉ có tiêu đề; mở nguồn để xem thêm.",

      provenance: {
        provider: "openalex",
        fetchedAt: now,
        doi,
        abstractAvailable: Boolean(abstract),
        pdfUrl: https(location.pdf_url),
      },
    };

    const parsed = paperSchema.safeParse(candidate);

    if (parsed.success) {
      papers.push(parsed.data);
    }
  }

  return papers;
}

/**
 * Chuẩn hóa arXiv Atom XML response thành Paper.
 */
export function normalizeArxiv(
  xml: string,
  now = new Date().toISOString(),
): Paper[] {
  if (!/<feed(?:\s|>)/i.test(xml)) {
    throw new Error("arXiv trả dữ liệu không hợp lệ.");
  }

  const papers: Paper[] = [];

  const entries = xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry\s*>/gi);

  for (const match of entries) {
    const entry = match[1];

    if (!entry) {
      continue;
    }

    const id = extractArxivId(extractXmlTag(entry, "id"));

    const title = cleanText(extractXmlTag(entry, "title"));

    const abstract = cleanText(extractXmlTag(entry, "summary"));

    if (!id || !title) {
      continue;
    }

    const categories = [...entry.matchAll(/<category\b[^>]*\bterm="([^"]+)"/gi)]
      .map((match) => cleanText(match[1] ?? ""))
      .filter(Boolean);

    const authors = [
      ...entry.matchAll(/<author(?:\s[^>]*)?>([\s\S]*?)<\/author\s*>/gi),
    ]
      .map((match) => cleanText(extractXmlTag(match[1] ?? "", "name")))
      .filter(Boolean)
      .slice(0, 30);

    const published = extractXmlTag(entry, "published");

    const year = Number(cleanText(published).slice(0, 4));

    const doi = safeDoi(extractXmlTag(entry, "arxiv:doi"));

    const candidate = {
      id,

      title: title.slice(0, 1000),

      abstract:
        abstract || "Nguồn chưa cung cấp tóm tắt. Điểm được tính từ tiêu đề.",

      authors: authors.length > 0 ? authors : ["Chưa có thông tin tác giả"],

      year,

      group: guessGroup(categories.join(" ") + " " + title),

      categories,

      sourceUrl: `https://arxiv.org/abs/${id}`,

      tags: categories,

      summary: abstract
        ? abstract.slice(0, 240) + (abstract.length > 240 ? "…" : "")
        : "Chỉ có tiêu đề.",

      provenance: {
        provider: "arxiv",
        fetchedAt: now,
        doi,
        abstractAvailable: Boolean(abstract),
        pdfUrl: `https://arxiv.org/pdf/${id}`,
      },
    };

    const parsed = paperSchema.safeParse(candidate);

    if (parsed.success) {
      papers.push(parsed.data);
    }

    if (papers.length >= MAX_RESULTS) {
      break;
    }
  }

  return papers;
}

/**
 * Lấy DOI và arXiv ID để nhận diện bài báo.
 */
function getPaperIdentity(paper: Paper) {
  const doi = safeDoi(paper.provenance?.doi);

  const arxivId = extractArxivId(paper.id) ?? extractArxivId(paper.sourceUrl);

  return {
    id: paper.id,
    doi,
    arxivId,
  };
}

/**
 * Loại bỏ bài báo trùng lặp.
 *
 * Ưu tiên nhận diện bằng:
 * 1. Paper ID.
 * 2. DOI.
 * 3. arXiv ID.
 */
export function deduplicatePapers(
  papers: Paper[],
  existing: Paper[] = [],
): Paper[] {
  const ids = new Set<string>();
  const dois = new Set<string>();
  const arxivIds = new Set<string>();

  const addIdentity = (paper: Paper) => {
    const identity = getPaperIdentity(paper);

    ids.add(identity.id);

    if (identity.doi) {
      dois.add(identity.doi);
    }

    if (identity.arxivId) {
      arxivIds.add(identity.arxivId);
    }
  };

  for (const paper of existing) {
    addIdentity(paper);
  }

  const result: Paper[] = [];

  for (const paper of papers) {
    const identity = getPaperIdentity(paper);

    if (
      ids.has(identity.id) ||
      (identity.doi && dois.has(identity.doi)) ||
      (identity.arxivId && arxivIds.has(identity.arxivId))
    ) {
      continue;
    }

    addIdentity(paper);
    result.push(paper);
  }

  return result;
}

export type SourceResult = {
  papers: Paper[];
  status: ProviderStatus;
};

const cache = new Map<
  string,
  {
    until: number;
    result: SourceResult;
  }
>();

const pending = new Map<string, Promise<SourceResult>>();

let nextArxiv = 0;

/**
 * Sao chép sâu kết quả để tránh bên gọi
 * vô tình thay đổi dữ liệu đang lưu trong cache.
 */
function copyResult(result: SourceResult): SourceResult {
  return {
    papers: structuredClone(result.papers),
    status: { ...result.status },
  };
}

/**
 * Đọc response theo giới hạn byte.
 */
async function limitedText(
  response: Response,
  maxBytes = MAX_RESPONSE_BYTES,
): Promise<string> {
  if (!response.body) {
    throw new Error("Nguồn không có dữ liệu.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let size = 0;
  let output = "";

  try {
    while (true) {
      const part = await reader.read();

      if (part.done) {
        break;
      }

      size += part.value.byteLength;

      if (size > maxBytes) {
        throw new Error("Phản hồi nguồn quá lớn.");
      }

      output += decoder.decode(part.value, { stream: true });
    }

    return output + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/**
 * Tìm kiếm từ arXiv hoặc OpenAlex.
 */
export async function searchProvider(
  provider: "arxiv" | "openalex",
  query: string,
): Promise<SourceResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      papers: [],
      status: {
        provider,
        status: "error",
        count: 0,
        message: "Truy vấn tìm kiếm không được để trống.",
        durationMs: 0,
      },
    };
  }

  const key = provider + ":" + normalizedQuery.toLowerCase();

  // Kiểm tra cache.
  const found = cache.get(key);

  if (found && found.until > Date.now()) {
    return {
      ...copyResult(found.result),
      status: {
        ...found.result.status,
        status: "cached",
        durationMs: 0,
      },
    };
  }

  if (found) {
    cache.delete(key);
  }

  // Nếu truy vấn đang được xử lý thì dùng chung Promise.
  const running = pending.get(key);

  if (running) {
    return copyResult(await running);
  }

  const job = (async (): Promise<SourceResult> => {
    const started = performance.now();

    try {
      const url = new URL(
        provider === "openalex"
          ? "https://api.openalex.org/works"
          : "https://export.arxiv.org/api/query",
      );

      if (provider === "openalex") {
        url.searchParams.set("search", normalizedQuery.slice(0, 300));

        url.searchParams.set("per_page", String(MAX_RESULTS));

        url.searchParams.set(
          "select",
          [
            "id",
            "doi",
            "title",
            "publication_year",
            "authorships",
            "abstract_inverted_index",
            "primary_location",
            "primary_topic",
            "type",
            "concepts",
          ].join(","),
        );

        if (process.env.OPENALEX_API_KEY) {
          url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
        }
      } else {
        // Giới hạn tần suất gọi arXiv.
        const scheduled = Math.max(Date.now(), nextArxiv);

        nextArxiv = scheduled + 3100;

        if (scheduled > Date.now()) {
          await new Promise((resolve) =>
            setTimeout(resolve, scheduled - Date.now()),
          );
        }

        const words =
          normalizedQuery
            .slice(0, 300)
            .match(/[\p{L}\p{N}]+/gu)
            ?.slice(0, 12) ?? [];

        if (words.length === 0) {
          throw new Error("Không thể tạo truy vấn arXiv hợp lệ.");
        }

        url.searchParams.set(
          "search_query",
          words.map((word) => `all:${word}`).join(" AND "),
        );

        url.searchParams.set("max_results", String(MAX_RESULTS));

        url.searchParams.set("sortBy", "relevance");
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),

        headers: {
          Accept:
            provider === "arxiv" ? "application/atom+xml" : "application/json",

          "User-Agent": "PaperMagic/0.6 academic search",
        },

        cache: "no-store",
      });

      if (!response.ok) {
        const status: ProviderStatus = {
          provider,

          status: response.status === 429 ? "rate-limited" : "error",

          count: 0,

          message:
            response.status === 429
              ? "Nguồn đang giới hạn lượt gọi; thử lại sau."
              : `Nguồn phản hồi HTTP ${response.status}.`,

          durationMs: performance.now() - started,
        };

        return {
          papers: [],
          status,
        };
      }

      const body = await limitedText(response);

      const papers =
        provider === "openalex"
          ? normalizeOpenAlex(JSON.parse(body))
          : normalizeArxiv(body);

      const result: SourceResult = {
        papers,

        status: {
          provider,
          status: "ok",
          count: papers.length,

          message: papers.length
            ? "Đã tìm từ nguồn thật."
            : "Nguồn không có kết quả phù hợp.",

          durationMs: performance.now() - started,
        },
      };

      // Xóa cache cũ nhất khi đạt giới hạn.
      if (cache.size >= CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;

        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }

      cache.set(key, {
        until: Date.now() + CACHE_TTL,
        result: copyResult(result),
      });

      return result;
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");

      return {
        papers: [],

        status: {
          provider,
          status: "error",
          count: 0,

          message: timedOut
            ? "Nguồn phản hồi quá thời gian cho phép."
            : "Không thể kết nối hoặc xử lý dữ liệu từ nguồn.",

          durationMs: performance.now() - started,
        },
      };
    }
  })();

  pending.set(key, job);

  try {
    return copyResult(await job);
  } finally {
    pending.delete(key);
  }
}
