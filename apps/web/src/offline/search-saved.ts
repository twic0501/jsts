import {
  cosineSimilarity,
  type SearchInput,
  type SearchResult,
} from "@paper-galaxy/core";

import {
  getSavedOfflinePapers,
  type SavedOfflinePaper,
} from "./papers-store";

function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
}

function keywordScore(
  paper: SavedOfflinePaper["paper"],
  query: string,
): number {
  const phrase = normalizeText(query).trim();

  if (!phrase) return 0;

  const tokens = phrase.split(/\s+/).filter(Boolean);

  const title = normalizeText(paper.title);
  const abstract = normalizeText(paper.abstract ?? "");
  const summary = normalizeText(paper.summary ?? "");
  const tags = normalizeText((paper.tags ?? []).join(" "));

  let score = 0;

  if (title.includes(phrase)) score += 5;
  if (abstract.includes(phrase)) score += 2;
  if (summary.includes(phrase)) score += 1;
  if (tags.includes(phrase)) score += 2;

  for (const token of tokens) {
    if (title.includes(token)) score += 3;
    if (abstract.includes(token)) score += 1;
    if (tags.includes(token)) score += 1;
  }

  return score;
}

export type SavedSearchOutcome = {
  result: SearchResult;
  usedSemantic: boolean;
  savedCount: number;
};

export async function searchSavedOfflinePapers(
  input: SearchInput,
  datasetVersion: string,
  queryVector?: readonly number[],
): Promise<SavedSearchOutcome> {
  const started = performance.now();
  const records = await getSavedOfflinePapers();

  const matching = records.filter(({ paper }) => {
    if (input.group && paper.group !== input.group) {
      return false;
    }

    if (
      input.yearFrom !== undefined &&
      paper.year < input.yearFrom
    ) {
      return false;
    }

    if (
      input.yearTo !== undefined &&
      paper.year > input.yearTo
    ) {
      return false;
    }

    return true;
  });

  const query = (input.query ?? "").trim();

  // Chỉ dùng cosine khi tất cả bài được tìm có vector.
  // Nếu thiếu vector, chuyển toàn bộ sang tìm kiếm từ khóa.
  const usedSemantic =
    query.length > 0 &&
    queryVector?.length === 384 &&
    matching.every(
      (record) =>
        record.vector?.length === 384 &&
        record.vector.every(Number.isFinite),
    );

  const hits = matching
    .map((record) => {
      const score = !query
        ? 0
        : usedSemantic && queryVector && record.vector
          ? cosineSimilarity(queryVector, record.vector)
          : keywordScore(record.paper, query);

      return {
        paper: record.paper,
        score,
      };
    })
    .filter((hit) => {
      if (!query || usedSemantic) return true;
      return hit.score > 0;
    })
    .sort((a, b) => {
      if (!query) {
        return (
          b.paper.year - a.paper.year ||
          a.paper.id.localeCompare(b.paper.id)
        );
      }

      return (
        b.score - a.score ||
        a.paper.id.localeCompare(b.paper.id)
      );
    });

  return {
    result: {
      items: hits.slice(0, input.topK),
      total: hits.length,
      durationMs: performance.now() - started,
      method: "semantic",
      datasetVersion,
    },
    usedSemantic,
    savedCount: records.length,
  };
}

