import { createHash } from "node:crypto";

import {
  chunkPaper,
  rankPassages,
  extractiveReport,
  projectPca,
  embeddingText,
  type DatasetBundle,
  type QueryPlan,
  type ResearchRequest,
  type ResearchResponse,
  type ProviderStatus,
  type Paper,
} from "@paper-galaxy/core";

import { deduplicatePapers, type SourceResult } from "../online/providers";

import {
  planningPrompt,
  parsePlan,
  synthesisPrompt,
  parseSynthesis,
} from "./prompts";

import type { ChatMessage } from "./generation";

import { createPassageEmbeddingCache } from "./embedding-cache";

type Dependencies = {
  dataset: () => Promise<DatasetBundle>;
  embed: (texts: string[]) => Promise<number[][]>;
  provider: (
    provider: "arxiv" | "openalex",
    query: string,
  ) => Promise<SourceResult>;
  generate: (messages: ChatMessage[], maxTokens: number) => Promise<string>;
  audit: (
    traceId: string,
    stage: "plan" | "synthesis",
    messages: ChatMessage[],
    output: string,
    accepted: boolean,
  ) => Promise<void>;
  rerank?: (query: string, texts: string[]) => Promise<number[]>;
};

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/**
 * Một cache dùng chung trong vòng đời tiến trình API.
 * Giới hạn 2.000 passage embedding.
 */
const embedPassageTexts = createPassageEmbeddingCache({
  maxEntries: 2000,
  dimensions: 384,
});

async function batches(
  texts: string[],
  embed: Dependencies["embed"],
): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += 2) {
    const batch = texts.slice(i, i + 2);
    const result = await embed(batch);

    if (result.length !== batch.length) {
      throw new Error("Missing embedding");
    }

    vectors.push(...result);
  }

  return vectors;
}

export async function runResearch(
  input: ResearchRequest,
  deps: Dependencies,
): Promise<ResearchResponse> {
  const started = performance.now();
  const traceId = crypto.randomUUID();
  const base = await deps.dataset();
  const warnings: string[] = [];

  let plan: QueryPlan = {
    original: input.query,
    intent: input.query,
    queries: [input.query.slice(0, 160)],
    method: "original",
  };

  const conceptual = input.query.trim().split(/\s+/).length >= 5;

  if (conceptual) {
    const messages = planningPrompt(input.query);

    let output = "";
    let accepted = false;

    try {
      output = await deps.generate(messages, 150);
      plan = parsePlan(input.query, output);
      accepted = true;
    } catch {
      warnings.push("Chưa diễn đạt lại được câu hỏi; đang tìm bằng câu gốc.");
    }

    try {
      await deps.audit(traceId, "plan", messages, output, accepted);
    } catch {
      warnings.push("Chưa lưu được nhật ký prompt cục bộ.");
    }
  }

  const sources =
    input.scope === "library"
      ? []
      : await Promise.all(
          plan.queries
            .slice(0, 2)
            .flatMap((query) =>
              (["arxiv", "openalex"] as const).map((provider) =>
                deps.provider(provider, query),
              ),
            ),
        );

  const candidates = Array.from({ length: 8 }, (_, i) =>
    sources.flatMap((source) => (source.papers[i] ? [source.papers[i]!] : [])),
  ).flat();

  const matches = (paper: Paper) =>
    (!input.group || paper.group === input.group) &&
    (input.yearFrom === undefined || paper.year >= input.yearFrom) &&
    (input.yearTo === undefined || paper.year <= input.yearTo);

  const fresh = deduplicatePapers(candidates, base.corpus.papers)
    .filter(matches)
    .slice(0, 24);

  const freshVectors = await batches(fresh.map(embeddingText), deps.embed);

  const papers = [...base.corpus.papers, ...fresh];

  const version =
    "research-" + digest(papers.map((p) => p.id).join("|")).slice(0, 16);

  const corpus = {
    ...base.corpus,
    version,
    papers,
  };

  const snapshot = {
    ...base.snapshot,
    corpusVersion: version,
    papers: [
      ...base.snapshot.papers,
      ...fresh.map((paper, i) => ({
        paperId: paper.id,
        textHash: digest(embeddingText(paper)),
        vector: freshVectors[i]!,
        point: projectPca(freshVectors[i]!, base.snapshot.projection),
      })),
    ],
  };

  const externalIds = new Set(candidates.map((p) => p.id));

  const eligible = papers.filter(
    (p) => matches(p) && (input.scope !== "online" || externalIds.has(p.id)),
  );

  const passages = eligible.flatMap((p) => chunkPaper(p));

  const queryTexts = [
    input.query,
    ...(plan.method === "local-llm"
      ? [plan.intent + " " + plan.queries.join(" ")]
      : []),
  ];

  const queryVectors = await batches(
    queryTexts.map((q) => "query: " + q),
    deps.embed,
  );

  // Tạo nội dung passage theo đúng định dạng E5.
  const passageTexts = passages.map(
    (p) => "passage: " + p.paper.title + "\n" + p.text,
  );

  // Tái sử dụng embedding nếu passage đã được xử lý.
  const vectors = await embedPassageTexts(passageTexts, deps.embed);

  let allEvidence = rankPassages(
    passages,
    vectors,
    queryVectors,
    queryTexts.join(" "),
    Math.min(40, input.topK * 2),
  );

  if (
    deps.rerank &&
    allEvidence.length &&
    (plan.method === "local-llm" || /^[\x00-\x7F]+$/.test(input.query))
  ) {
    try {
      const shortlist = allEvidence.slice(0, 20);

      const scores = await deps.rerank(
        plan.intent + " " + plan.queries.join(" "),
        shortlist.map((e) => e.title + "\n" + e.quote),
      );

      if (
        scores.length !== shortlist.length ||
        scores.some((x) => !Number.isFinite(x))
      ) {
        throw new Error("Invalid reranker scores");
      }

      const crossRanks = scores
        .map((score, i) => ({ score, i }))
        .sort((a, b) => b.score - a.score || a.i - b.i);

      const byIndex = new Map(crossRanks.map((row, rank) => [row.i, rank]));

      allEvidence = [
        ...shortlist
          .map((e, i) => ({
            ...e,
            rerankScore: scores[i]!,
            fusionScore: 1 / (61 + i) + 1 / (61 + byIndex.get(i)!),
          }))
          .sort((a, b) => b.fusionScore - a.fusionScore),
        ...allEvidence.slice(20),
      ];
    } catch {
      warnings.push(
        "Chưa chạy được model đọc lại cặp câu hỏi–đoạn; giữ xếp hạng hybrid.",
      );
    }
  }

  const seen = new Set<string>();
  const items: ResearchResponse["result"]["items"] = [];

  for (const evidence of allEvidence) {
    if (seen.has(evidence.paperId)) {
      continue;
    }

    seen.add(evidence.paperId);

    const paper = eligible.find((p) => p.id === evidence.paperId)!;

    items.push({
      paper,
      score: evidence.cosine,
    });

    if (items.length >= input.topK) {
      break;
    }
  }

  const evidence = allEvidence.slice(0, 6);

  const research = extractiveReport(
    input.query,
    plan,
    evidence,
    eligible.length,
    passages.length,
  );

  research.traceId = traceId;

  if (conceptual && evidence.length) {
    const messages = synthesisPrompt(input.query, evidence.slice(0, 4));

    let output = "";
    let accepted = false;

    try {
      output = await deps.generate(messages, 260);

      research.claims = parseSynthesis(output, evidence.slice(0, 4));

      research.mode = "grounded-generation";
      research.model = "onnx-community/Qwen3-0.6B-ONNX";

      accepted = true;
    } catch {
      research.gaps.push(
        "Model chưa tạo được diễn giải hợp lệ; chỉ hiển thị đoạn trích nguồn.",
      );
    }

    try {
      await deps.audit(traceId, "synthesis", messages, output, accepted);
    } catch {
      warnings.push("Chưa lưu được nhật ký prompt cục bộ.");
    }
  }

  const providers: ProviderStatus[] = (["arxiv", "openalex"] as const).flatMap(
    (provider) => {
      const rows = sources.filter((s) => s.status.provider === provider);

      if (!rows.length) {
        return [];
      }

      const ok = rows.filter(
        (s) => s.status.status === "ok" || s.status.status === "cached",
      );

      const count = new Set(rows.flatMap((s) => s.papers.map((p) => p.id)))
        .size;

      return [
        {
          provider,
          status: ok.length
            ? rows.every((s) => s.status.status === "cached")
              ? "cached"
              : "ok"
            : rows[0]!.status.status,
          count,
          message: ok.length
            ? "Đã tìm qua " + rows.length + " cách diễn đạt."
            : rows[0]!.status.message,
          durationMs: Math.max(...rows.map((s) => s.status.durationMs)),
        },
      ];
    },
  );

  for (const source of sources) {
    if (
      source.status.status === "error" ||
      source.status.status === "rate-limited"
    ) {
      warnings.push(source.status.provider + ": " + source.status.message);
    }
  }

  research.metrics.elapsedMs = performance.now() - started;

  return {
    dataset: {
      corpus,
      snapshot,
    },
    result: {
      items,
      total: eligible.length,
      durationMs: research.metrics.elapsedMs,
      method: "semantic",
      datasetVersion: version,
      queryPoint: projectPca(queryVectors[0]!, base.snapshot.projection),
    },
    research,
    providers,
    scope: input.scope,
    ranking: allEvidence.some((e) => e.rerankScore !== undefined)
      ? "hybrid-e5-bm25-rrf-rerank"
      : "hybrid-e5-bm25-rrf",
    storage: "memory",
    warnings: [...new Set(warnings)],
  };
}
