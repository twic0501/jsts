import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { embedTexts } from '../apps/api/lib/embedding-runtime.mjs';
import { DIMENSIONS, FILES, sha256 } from './arxiv-artifact-format.mjs';
import { decodeVectors, loadValidatedArtifacts, vectorNorms } from './arxiv-artifact-input.mjs';
import { compareIds } from './export-arxiv-neighbors.mjs';

const K = [3, 5, 10];
const BM25 = { k1: 1.2, b: 0.75 };
const RRF = { k: 60, depth: 100, denseWeight: 1, bm25Weight: 0.5 };
const tokenize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd').match(/[\p{L}\p{N}]{2,}/gu) ?? [];

function lexicalRanker(papers) {
  const postings = new Map();
  const lengths = papers.map(({ title, abstract }, row) => {
    const words = tokenize(title + ' ' + abstract);
    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    for (const [word, count] of counts) {
      if (!postings.has(word)) postings.set(word, []);
      postings.get(word).push([row, count]);
    }
    return words.length;
  });
  const average = lengths.reduce((sum, n) => sum + n, 0) / papers.length;
  return query => {
    const scores = new Float64Array(papers.length);
    for (const word of new Set(tokenize(query))) {
      const hits = postings.get(word);
      if (!hits) continue;
      const idf = Math.log(1 + (papers.length - hits.length + 0.5) / (hits.length + 0.5));
      for (const [row, tf] of hits) {
        scores[row] += idf * tf * (BM25.k1 + 1) /
          (tf + BM25.k1 * (1 - BM25.b + BM25.b * lengths[row] / average));
      }
    }
    return papers.flatMap(({ id }, row) => scores[row] > 0 ? [{ id, score: scores[row] }] : [])
      .sort((a, b) => b.score - a.score || compareIds(a.id, b.id)).map(row => row.id);
  };
}

function denseRanker(ids, vectors) {
  const norms = vectorNorms(vectors);
  return query => {
    const qNorm = Math.hypot(...query);
    if (query.length !== DIMENSIONS || !Number.isFinite(qNorm) || qNorm === 0) throw new Error('Invalid E5 query embedding');
    return ids.map((id, row) => {
      let dot = 0;
      for (let i = 0; i < DIMENSIONS; i++) dot += query[i] * vectors[row * DIMENSIONS + i];
      return { id, score: dot / (qNorm * norms[row]) };
    }).sort((a, b) => b.score - a.score || compareIds(a.id, b.id)).map(row => row.id);
  };
}

function hybridRank(lexical, dense) {
  const totals = new Map();
  for (const [ranking, weight] of [[dense, RRF.denseWeight], [lexical, RRF.bm25Weight]]) {
    ranking.slice(0, RRF.depth).forEach((id, rank) => totals.set(id, (totals.get(id) ?? 0) + weight / (RRF.k + rank + 1)));
  }
  return [...totals].sort(([a, x], [b, y]) => y - x || compareIds(a, b)).map(([id]) => id);
}

export function measureRanking(ranked, grades, cutoffs = K) {
  const ideal = Object.values(grades).sort((a, b) => b - a);
  const gain = (grade, i) => (2 ** grade - 1) / Math.log2(i + 2);
  const firstRank = ranked.findIndex(id => Object.hasOwn(grades, id) && grades[id] > 0);
  const scores = { mrr: firstRank === -1 ? 0 : 1 / (firstRank + 1) };
  for (const k of cutoffs) {
    const hits = ranked.slice(0, k).map(id => grades[id] ?? 0);
    scores['recall@' + k] = hits.filter(Boolean).length / ideal.length;
    const first = hits.findIndex(Boolean);
    scores['mrr@' + k] = first === -1 ? 0 : 1 / (first + 1);
    scores['ndcg@' + k] = hits.reduce((sum, grade, i) => sum + gain(grade, i), 0) /
      ideal.slice(0, k).reduce((sum, grade, i) => sum + gain(grade, i), 0);
  }
  return scores;
}

function averages(rows) {
  return Object.fromEntries(['bm25', 'dense', 'hybrid'].map(algorithm => [
    algorithm, Object.fromEntries(Object.keys(rows[0].scores[algorithm]).map(metric => [
      metric, rows.reduce((sum, row) => sum + row.scores[algorithm][metric], 0) / rows.length,
    ])),
  ]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      'artifact-dir': { type: 'string' }, out: { type: 'string' },
      qrels: { type: 'string', default: 'data/benchmark/arxiv-7500-qrels.json' },
    } });
    if (!values['artifact-dir'] || !values.out) throw new Error('Use --artifact-dir <dir> --out <new report>');
    const { sources, files } = await loadValidatedArtifacts(values['artifact-dir']);
    const rawLabels = await readFile(values.qrels);
    const labels = JSON.parse(rawLabels);
    if (labels.corpusVersion !== sources.snapshot.corpusVersion) throw new Error('Qrels corpus version mismatch');
    const ids = sources.snapshot.papers.map(paper => paper.paperId);
    const idSet = new Set(ids);
    const queries = labels.topics.flatMap(({ id, relevant, en, vi }) => {
      const judgments = Object.entries(relevant);
      if (!judgments.length || judgments.some(([paperId, grade]) => !idSet.has(paperId) || ![1, 2].includes(grade))) {
        throw new Error('Invalid qrels for ' + id);
      }
      return [['en', en], ['vi', vi]].map(([language, query]) => ({ id: id + '-' + language, language, query, relevant }));
    });
    if (queries.length < 30 || new Set(queries.map(q => q.id)).size !== queries.length ||
        queries.some(q => typeof q.query !== 'string' || !q.query.trim())) throw new Error('Invalid benchmark queries');
    const started = performance.now();
    const lexical = lexicalRanker(sources.papers);
    const dense = denseRanker(ids, decodeVectors(files[FILES.embeddings]));
    const indexBuildMs = performance.now() - started;
    const results = [];
    for (let start = 0; start < queries.length; start += 3) {
      const batch = queries.slice(start, start + 3);
      const beforeEmbedding = performance.now();
      const embeddings = await embedTexts(process.cwd(), batch.map(q => 'query: ' + q.query));
      const embeddingBatchMs = performance.now() - beforeEmbedding;
      for (const [row, query] of batch.entries()) {
        const bm25 = lexical(query.query);
        const denseRanking = dense(embeddings[row]);
        const hybrid = hybridRank(bm25, denseRanking);
        const rankings = { bm25, dense: denseRanking, hybrid };
        const scores = Object.fromEntries(Object.entries(rankings).map(([name, ranked]) => [name, measureRanking(ranked, query.relevant)]));
        const top10 = Object.fromEntries(Object.entries(rankings).map(([name, ranked]) => [name, ranked.slice(0, 10)]));
        results.push({ ...query, embeddingBatchMs, scores, top10 });
      }
    }
    const report = {
      corpusVersion: labels.corpusVersion, papers: ids.length, queryCount: queries.length, model: sources.snapshot.model,
      source: { inputs: sources.inputs, embeddingSha256: sha256(files[FILES.embeddings]), qrelsSha256: sha256(rawLabels) },
      config: { indexing: 'title + abstract', tokenizer: 'Unicode alphanumeric length >= 2, lowercase and accent-folded', BM25, RRF, K,
        dense: 'local E5 query prefix; cosine 384D Float32 dataset', ties: 'ordinal paperId', unjudgedForScoring: 0 },
      labeling: labels.method, indexBuildMs,
      average: averages(results), en: averages(results.filter(q => q.language === 'en')), vi: averages(results.filter(q => q.language === 'vi')),
      queries: results,
    };
    await writeFile(values.out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ queryCount: report.queryCount, average: report.average, en: report.en, vi: report.vi }, null, 2));
  } catch (error) {
    console.error('DATA-03: ' + error.message);
    process.exitCode = 1;
  }
}
