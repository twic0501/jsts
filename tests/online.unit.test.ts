import { it, expect, vi, afterEach } from "vitest";
import {
  normalizeOpenAlex,
  normalizeArxiv,
  reconstructAbstract,
  deduplicatePapers,
  searchProvider,
} from "../apps/api/lib/online/providers";
import { runOnlineSearch } from "../apps/api/lib/online/search";
import {
  onlineSearchSchema,
  onlineResponseSchema,
  mergeBundles,
  embeddingText,
  validateBundle,
  projectPca,
  normalizeVector,
  type Paper,
  type DatasetBundle,
} from "@paper-galaxy/core";
import corpus from "../data/corpus.json";
import snapshot from "../data/semantic-snapshot.json";
const base = validateBundle({ corpus, snapshot }),
  now = "2026-11-04T00:00:00.000Z";
function record(
  id = "W123",
  doi: string | null = "https://doi.org/10.1000/example",
) {
  return {
    id: "https://openalex.org/" + id,
    doi,
    title: "Cell image segmentation",
    publication_year: 2024,
    authorships: [{ author: { display_name: "Researcher" } }],
    abstract_inverted_index: { Cell: [0], images: [1], segmentation: [2] },
    primary_topic: { field: { display_name: "Medicine" } },
    primary_location: {
      landing_page_url: "https://publisher.example/paper",
      pdf_url: "https://publisher.example/paper.pdf",
    },
  };
}
afterEach(() => vi.unstubAllGlobals());

it("khôi phục abstract đúng vị trí, bỏ chỉ số sai/giới hạn thay vì dựng nội dung", () => {
  expect(
    reconstructAbstract({ world: [1], hello: [0], bad: [-1, Infinity, 9000] }),
  ).toBe("hello world");
  expect(reconstructAbstract(null)).toBe("");
});

it("OpenAlex chuẩn hóa DOI, tác giả, lĩnh vực và link PDF", () => {
  const papers = normalizeOpenAlex({ results: [record()] }, now);
  expect(papers).toHaveLength(1);
  expect(papers[0]).toMatchObject({
    id: "oa:W123",
    year: 2024,
    group: "medicine",
    abstract: "Cell images segmentation",
    sourceUrl: "https://doi.org/10.1000/example",
    provenance: {
      provider: "openalex",
      doi: "10.1000/example",
      abstractAvailable: true,
    },
  });
});

it("thiếu abstract ghi rõ và embedding chỉ chứa title", () => {
  const paper = normalizeOpenAlex(
    { results: [{ ...record(), abstract_inverted_index: null }] },
    now,
  )[0]!;
  expect(paper.provenance?.abstractAvailable).toBe(false);
  expect(embeddingText(paper)).toBe("passage: Cell image segmentation");
  expect(paper.abstract).toContain("chưa cung cấp");
});

it("loại ID/năm sai và không đưa javascript hoặc credentials vào link", () => {
  const paper = normalizeOpenAlex(
    {
      results: [
        { ...record(), primary_location: { pdf_url: "javascript:alert(1)" } },
      ],
    },
    now,
  )[0]!;
  expect(paper.provenance?.pdfUrl).toBeNull();
  expect(
    normalizeOpenAlex(
      {
        results: [
          { ...record(), id: "https://evil.test/W123" },
          { ...record(), publication_year: 1800 },
        ],
      },
      now,
    ),
  ).toEqual([]);
  expect(() => normalizeOpenAlex({ oops: [] })).toThrow();
});

it("arXiv parse nguồn thật, XML entities, DOI và loại version ID", () => {
  const xml =
    '<feed><entry><id>http://arxiv.org/abs/2401.12345v2</id><title>A &amp; B</title><summary>Cell &#x69;mages.</summary><published>2024-01-01</published><author><name>Alice</name></author><category term="q-bio.BM"/><arxiv:doi>10.1000/TEST</arxiv:doi></entry></feed>';
  const paper = normalizeArxiv(xml, now)[0]!;
  expect(paper.id).toBe("2401.12345");
  expect(paper.title).toBe("A & B");
  expect(paper.abstract).toBe("Cell images.");
  expect(paper.provenance?.doi).toBe("10.1000/test");
  expect(paper.sourceUrl).toBe("https://arxiv.org/abs/2401.12345");
  expect(() => normalizeArxiv("error")).toThrow();
});

it("arXiv hỗ trợ ID cũ và chuẩn hóa chữ thường", () => {
  const xml =
    '<feed><entry><id>http://arxiv.org/abs/math.AG/0601001v2</id><title>Legacy arXiv paper</title><summary>Research abstract.</summary><published>2006-01-01</published><author><name>Alice</name></author><category term="math.AG"/></entry></feed>';
  const paper = normalizeArxiv(xml, now)[0]!;

  expect(paper).toBeDefined();
  expect(paper.id).toBe("math.ag/0601001");
  expect(paper.sourceUrl).toBe("https://arxiv.org/abs/math.ag/0601001");
});

it("arXiv từ chối hostname giả mạo", () => {
  const paper = normalizeOpenAlex(
    {
      results: [
        {
          ...record(),
          primary_location: {
            landing_page_url: "https://arxiv.org.evil.com/abs/1505.04597",
          },
        },
      ],
    },
    now,
  )[0]!;
  expect(paper.id).toBe("oa:W123");
  expect(paper.sourceUrl).toBe("https://doi.org/10.1000/example");
});

it("trùng DOI hoặc cùng arXiv được loại, tên giống không đủ để gộp", () => {
  const a = normalizeOpenAlex({ results: [record()] }, now)[0]!,
    b = normalizeOpenAlex({ results: [record("W456")] }, now)[0]!,
    c = normalizeOpenAlex({ results: [record("W789", null)] }, now)[0]!;
  expect(deduplicatePapers([a, b, c])).toHaveLength(2);
  expect(deduplicatePapers([a], [a])).toEqual([]);
});

it("OpenAlex trỏ arXiv dùng cùng ID tránh duplicate khác nguồn", () => {
  const paper = normalizeOpenAlex(
    {
      results: [
        {
          ...record(),
          primary_location: {
            landing_page_url: "http://arxiv.org/abs/1505.04597v2",
          },
        },
      ],
    },
    now,
  )[0]!;
  expect(paper.id).toBe("1505.04597");
  expect(deduplicatePapers([paper], base.corpus.papers)).toHaveLength(0);
});

it("schema query chặn dưới2 ký tự, field lạ, năm đảo và topK không phải số nguyên", () => {
  for (const input of [
    { query: "a", scope: "online" },
    { query: "AI", scope: "online", topK: "12" },
    { query: "AI", scope: "online", yearFrom: 2025, yearTo: 2020 },
    { query: "AI", scope: "online", url: "http://localhost" },
  ])
    expect(onlineSearchSchema.safeParse(input).success).toBe(false);
});

it("provider429 được ghi riêng, không lộ lỗi/secret thành thành công", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 429 })),
  );
  const r = await searchProvider("openalex", "unit unique limited");
  expect(r.status.status).toBe("rate-limited");
  expect(r.papers).toEqual([]);
});

it("provider cache tránh gọi lại khi query giống, mạng lỗi có trạng thái lỗi", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ results: [record()] }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await searchProvider("openalex", "unit unique cache");
  expect(
    (await searchProvider("openalex", "unit unique cache")).status.status,
  ).toBe("cached");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockRejectedValue(new Error("api_key=secret"));
  expect(
    (await searchProvider("openalex", "unit unique error")).status.message,
  ).not.toContain("secret");
});

const vector = normalizeVector(
  Array.from({ length: 384 }, (_, i) => Math.sin(i * 0.2) + 0.1),
);

async function execute(
  scope: "online" | "combined",
  papers: Paper[],
  failed = false,
) {
  return runOnlineSearch(
    onlineSearchSchema.parse({ query: "cell images", scope, topK: 12 }),
    {
      dataset: async () => base,
      query: async () => vector,
      passages: async (texts) => texts.map(() => vector),
      provider: async (provider) => ({
        papers: provider === "openalex" ? papers : [],
        status: {
          provider,
          status: failed && provider === "arxiv" ? "error" : "ok",
          count: provider === "openalex" ? papers.length : 0,
          message: "test fixture",
          durationMs: 1,
        },
      }),
    },
  );
}

it("search online trả vector384D/PCA từ cùng phép chiếu, chỉ các ID được nguồn tìm thấy", async () => {
  const paper = normalizeOpenAlex({ results: [record()] }, now)[0]!,
    output = await execute("online", [paper]);
  expect(onlineResponseSchema.safeParse(output).success).toBe(true);
  expect(output.result.items.map((h) => h.paper.id)).toEqual([paper.id]);
  expect(output.result.items[0]?.score).toBeCloseTo(1);
  const embedding = output.dataset.snapshot.papers.find(
    (e) => e.paperId === paper.id,
  )!;
  expect(embedding.point).toEqual(projectPca(vector, base.snapshot.projection));
  validateBundle(output.dataset);
});

it("một nguồn lỗi vẫn trả nội bộ+nguồn còn lại; online rỗng không giả kết quả nội bộ", async () => {
  const paper = normalizeOpenAlex({ results: [record()] }, now)[0]!,
    output = await execute("combined", [paper], true);
  expect(output.warnings).toHaveLength(1);
  expect(output.result.total).toBe(31);
  expect(output.result.items.some((hit) => hit.paper.id === paper.id)).toBe(
    true,
  );
  expect((await execute("online", [], true)).result.items).toHaveLength(0);
});

it("merge cache giữ corpus/vector ghép đúng, original library và version; loại model khác", async () => {
  const one = (
      await execute("online", normalizeOpenAlex({ results: [record()] }, now))
    ).dataset,
    two = (
      await execute(
        "online",
        normalizeOpenAlex({ results: [record("W999", null)] }, now),
      )
    ).dataset;
  const merged = mergeBundles(base, two, one);
  expect(merged.corpus.papers).toHaveLength(32);
  expect(merged.snapshot.papers).toHaveLength(32);
  validateBundle(merged);
  expect(mergeBundles(base, one, one).corpus.papers).toHaveLength(31);
  const bad: DatasetBundle = structuredClone(one);
  bad.snapshot.model.revision = "different";
  expect(() => mergeBundles(base, bad)).toThrow();
});
