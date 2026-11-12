import { z } from "zod";

export const groupSchema = z.enum(["ai", "biology", "medicine", "physics"]);
export type Group = z.infer<typeof groupSchema>;

export const GROUPS: Record<
  Group,
  { label: string; color: string; short: string }
> = {
  ai: { label: "Trí tuệ nhân tạo", color: "#a68aef", short: "AI" },
  biology: { label: "Sinh học", color: "#58bdb0", short: "BIO" },
  medicine: { label: "Y sinh", color: "#e4a773", short: "MED" },
  physics: { label: "Vật lý", color: "#7da7e5", short: "PHY" },
};

export const safeHttpsUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);

      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Cần URL HTTPS hợp lệ.");

function isValidSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:" || url.username || url.password) {
      return false;
    }

    return (
      (hostname === "arxiv.org" && url.pathname.startsWith("/abs/")) ||
      (hostname === "openalex.org" && /^\/W\d+$/.test(url.pathname)) ||
      (hostname === "doi.org" && url.pathname.startsWith("/10."))
    );
  } catch {
    return false;
  }
}

export const paperSchema = z
  .object({
    id: z
      .string()
      .regex(/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}|oa:W\d+)$/),
    title: z.string().min(1).max(1000),
    abstract: z.string().min(1).max(20000),
    authors: z.array(z.string()).min(1),
    year: z.number().int().min(1900).max(2100),
    group: groupSchema,
    categories: z.array(z.string()),
    sourceUrl: safeHttpsUrl.refine(
      isValidSourceUrl,
      "URL phải thuộc arXiv, OpenAlex hoặc DOI hợp lệ.",
    ),
    tags: z.array(z.string()),
    summary: z.string().min(1),
    provenance: z
      .object({
        provider: z.enum(["arxiv", "openalex"]),
        fetchedAt: z.string().datetime(),
        doi: z.string().max(300).nullable(),
        abstractAvailable: z.boolean(),
        pdfUrl: safeHttpsUrl.nullable(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type Paper = z.infer<typeof paperSchema>;

export const corpusSchema = z
  .object({
    version: z.string(),
    title: z.string(),
    fetchedAt: z.string(),
    papers: z.array(paperSchema).min(1),
  })
  .strict();

export type Corpus = z.infer<typeof corpusSchema>;

export const searchSchema = z
  .object({
    query: z.string().trim().max(300).default(""),
    group: groupSchema.optional(),
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
    topK: z.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine(
    (x) =>
      x.yearFrom === undefined ||
      x.yearTo === undefined ||
      x.yearFrom <= x.yearTo,
    {
      message: "Năm bắt đầu phải nhỏ hơn hoặc bằng năm kết thúc.",
      path: ["yearFrom"],
    },
  );

export type SearchInput = z.infer<typeof searchSchema>;

export type SearchHit = {
  paper: Paper;
  score: number;
};

export type SearchResult = {
  items: SearchHit[];
  total: number;
  durationMs: number;
  method: "tfidf" | "semantic";
  datasetVersion: string;
  queryPoint?: Point3;
};

export const searchResultSchema = z
  .object({
    items: z.array(
      z
        .object({
          paper: paperSchema,
          score: z.number().finite().min(-1).max(1),
        })
        .strict(),
    ),
    total: z.number().int().min(0),
    durationMs: z.number().finite().min(0),
    method: z.enum(["tfidf", "semantic"]),
    datasetVersion: z.string(),
    queryPoint: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type Point3 = {
  x: number;
  y: number;
  z: number;
};
