import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { artifactDigest, jsonBytes, readBaselineSources, sha256 } from './arxiv-artifact-format.mjs';

const ORIGIN = 'https://export.arxiv.org';
const AR5IV = 'https://ar5iv.labs.arxiv.org';
const AGENT = 'JSTS-DataPilot';
const MAX_BYTES = 25 * 1024 * 1024;
const WINDOW = 180;
const OVERLAP = 35;
const ID = /^\d{4}\.\d{4,5}$/;
const REFS = /^(?:[ivx\d.]+\s+)?(?:references|bibliography|acknowledg(?:e)?ments)\.?$/i;

function versionInArticleUrl(value, paperId) {
  return value?.match(new RegExp('/(?:abs|html|pdf)/' + paperId.replace('.', '\\.') + '(v[1-9]\\d*)(?:\\.pdf)?/?$'))?.[1] ?? null;
}

export function choosePilot(papers, count = 100) {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Pilot limit must be 1–100');
  const candidates = papers.filter(paper => ID.test(paper.id)).map(paper => ({
    ...paper, sampleKey: sha256('jsts-data04-v1/' + paper.id),
  })).sort((a, b) => a.sampleKey < b.sampleKey ? -1 : 1);
  if (candidates.length < count) throw new Error('Insufficient pilot candidates');
  return candidates.slice(0, count).map(({ id, sourceUrl, categories }) => ({ paperId: id, abstractUrl: sourceUrl, category: categories[0] }));
}

function robotsPolicy(body, minimumDelayMs) {
  const groups = [];
  let group;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    const split = line.indexOf(':');
    if (split === -1) continue;
    const name = line.slice(0, split).trim().toLowerCase();
    const value = line.slice(split + 1).trim();
    if (name === 'user-agent') {
      if (!group || group.rules.length || group.delay) {
        group = { agents: [], rules: [], delay: 0 };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow', 'disallow'].includes(name) && value) {
      group.rules.push({ allow: name === 'allow', pattern: value });
    } else if (group && name === 'crawl-delay') {
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Unrecognized crawl delay');
      group.delay = seconds * 1000;
    }
  }
  const agent = AGENT.toLowerCase();
  const specific = groups.flatMap(g => g.agents.filter(name => name !== '*' && agent.includes(name))).sort((a, b) => b.length - a.length)[0];
  const chosen = groups.filter(g => g.agents.includes(specific ?? '*'));
  if (!chosen.length) throw new Error('No applicable rules in robots.txt');
  const rules = chosen.flatMap(g => g.rules).map(({ allow, pattern }) => {
    const exact = pattern.endsWith('$');
    const body = exact ? pattern.slice(0, -1) : pattern;
    const escaped = body.split('*').map(piece => piece.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')).join('.*');
    return { allow, length: body.replaceAll('*', '').length, regex: new RegExp('^' + escaped + (exact ? '$' : '')) };
  }).sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow));
  return {
    delayMs: Math.max(minimumDelayMs, ...chosen.map(g => g.delay)),
    allowed: path => rules.find(rule => rule.regex.test(path))?.allow ?? true,
  };
}

function stripText(value) {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function extractHtml(bytes, parseHtml) {
  const document = parseHtml(bytes.toString('utf8'));
  const article = document.querySelector('article') ?? document.querySelector('main .ltx_document') ??
    document.querySelector('.ltx_document');
  if (!article) throw new Error('HTML contains no article body');
  for (const el of article.querySelectorAll('script, style, nav, footer, .ltx_bibliography, .ltx_acknowledgements, .ltx_authors, .ltx_note')) el.remove();
  const sections = [];
  let title = 'Body';
  let paragraphs = [];
  for (const node of article.querySelectorAll('h2, h3, h4, p')) {
    const text = stripText(node.text);
    if (!text) continue;
    if (node.tagName === 'P') paragraphs.push(text);
    else {
      if (paragraphs.length) sections.push({ section: title, paragraphs });
      paragraphs = [];
      if (REFS.test(text)) break;
      title = text;
    }
  }
  if (paragraphs.length) sections.push({ section: title, paragraphs });
  const canonical = document.querySelector('meta[name="citation_pdf_url"]')?.getAttribute('content') ??
    document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? null;
  const license = document.querySelector('a[rel=license]')?.getAttribute('href') ?? null;
  return { sections, canonical, license };
}

function pdfSections(pageText) {
  const sections = [];
  let section = 'Body';
  let paragraphs = [];
  for (const page of pageText) {
    for (const paragraph of page.split(/\r?\n[\t ]*\r?\n/)) {
      const lines = paragraph.split(/\r?\n/).filter(line => !/^\s*\d+\s*$/.test(line));
      for (const [i, line] of lines.entries()) {
        if (!REFS.test(line.trim())) continue;
        const text = stripText(lines.slice(0, i).join(' '));
        if (text) paragraphs.push(text);
        if (paragraphs.length) sections.push({ section, paragraphs });
        return sections;
      }
      const text = stripText(lines.join(' '));
      if (!text) continue;
      if (/^(?:\d+(?:\.\d+)*\.?\s+)?(?:abstract|introduction|background|methods?|methodology|experiments?|results|discussion|conclusions?)$/i.test(text)) {
        if (paragraphs.length) sections.push({ section, paragraphs });
        section = text;
        paragraphs = [];
      } else paragraphs.push(text);
    }
  }
  if (paragraphs.length) sections.push({ section, paragraphs });
  return sections;
}

/** Offsets are UTF-16 indices into the exact normalized text persisted with this run. */
export function chunkSections(paperId, sections) {
  const parts = [];
  const chunks = [];
  let base = 0;
  for (const { section, paragraphs } of sections) {
    const text = paragraphs.join('\n\n');
    if (!text) continue;
    if (parts.length) base += 2;
    parts.push(text);
    const words = [...text.matchAll(/\S+/gu)];
    for (let start = 0; start < words.length;) {
      const maxEnd = Math.min(start + WINDOW, words.length);
      let end = maxEnd;
      if (maxEnd < words.length) {
        for (let i = maxEnd; i > start + 100; i--) {
          if (text.slice(words[i - 1].index + words[i - 1][0].length, words[i].index).includes('\n\n')) {
            end = i;
            break;
          }
        }
      }
      const startChar = words[start].index;
      const endChar = words[end - 1].index + words[end - 1][0].length;
      chunks.push({ chunkId: paperId + '#chunk-' + (chunks.length + 1), paperId, section,
        startChar: base + startChar, endChar: base + endChar, wordCount: end - start, text: text.slice(startChar, endChar) });
      if (end === words.length) break;
      start = end - OVERLAP;
    }
    base += text.length;
  }
  return { text: parts.join('\n\n'), chunks };
}

async function responseBytes(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  const blocks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(blocks);
      length += value.length;
      if (length > limit) throw new Error('Response exceeds maximum bytes');
      blocks.push(value);
    }
  } finally {
    await reader.cancel();
  }
}

function accessStop(reason) {
  return Object.assign(new Error(reason), { stop: true });
}

export async function runPilot({ selection, output, parseHtml, extractPdf, fetchSource = fetch,
  pause = sleep, now = () => Date.now(), contact, corpusVersion, inputs, fixture = false, source = 'arxiv' }) {
  if (!contact || /[\r\n]/.test(contact)) throw new Error('Set a project URL or contact for the User-Agent');
  if (selection.some(row => !ID.test(row.paperId)) || new Set(selection.map(row => row.paperId)).size !== selection.length) {
    throw new Error('Invalid pilot IDs');
  }
  if (!['arxiv', 'ar5iv'].includes(source)) throw new Error('Invalid full-text source');
  const converted = source === 'ar5iv';
  const origin = converted ? AR5IV : ORIGIN;
  const robotsUrl = origin + '/robots.txt';
  await mkdir(output);
  await mkdir(join(output, 'documents'));
  const headers = { 'user-agent': AGENT + '/1.0 (' + contact + ')' };
  let nextAt = 0;
  let delay = converted ? 3000 : 15000;
  let policy;
  let robots;
  let blocked;
  const rows = [];
  const map = {};

  async function request(url) {
    if (nextAt > now()) await pause(nextAt - now());
    nextAt = now() + delay;
    try {
      return await fetchSource(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(45000) });
    } catch (error) {
      throw accessStop('Network error: ' + (error.cause?.code ?? error.message));
    }
  }
  try {
    const response = await request(robotsUrl);
    if (!response.ok) {
      await response.body?.cancel();
      throw accessStop('robots.txt HTTP ' + response.status);
    }
    const bytes = await responseBytes(response, 512 * 1024);
    robots = { url: robotsUrl, ...artifactDigest(bytes) };
    policy = robotsPolicy(bytes.toString('utf8'), delay);
    delay = policy.delayMs;
    nextAt = Math.max(nextAt, now() + delay);
  } catch (error) {
    blocked = error.message;
  }

  for (const paper of selection) {
    const { paperId } = paper;
    const baselineVersion = versionInArticleUrl(paper.abstractUrl, paperId);
    const attempts = [];
    // ar5iv publishes one converted edition through October 2026. Requests
    // with a vN suffix can still return that edition, so do not infer vN.
    if (converted && paperId.slice(0, 4) > '2610') {
      rows.push({ ...paper, status: 'failed', reason: 'Outside the ar5iv October 2026 coverage', attempts });
      continue;
    }
    let saved = false;
    let allowed = 0;
    if (!blocked) for (const format of converted ? ['html'] : ['html', 'pdf']) {
      const initialPath = '/' + format + '/' + paperId + (converted ? '' : baselineVersion ?? '');
      if (!policy.allowed(initialPath)) {
        attempts.push({ format, requestedUrl: origin + initialPath, status: 'robots-disallowed' });
        continue;
      }
      allowed++;
      let url = new URL(initialPath, origin);
      const attempt = { format, requestedUrl: url.href };
      attempts.push(attempt);
      let response;
      let bytes;
      let result;
      try {
        for (let redirects = 0;; redirects++) {
          response = await request(url.href);
          attempt.httpStatus = response.status;
          if (![301, 302, 303, 307, 308].includes(response.status)) break;
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location || redirects >= 2) throw new Error('Invalid redirect');
          const target = new URL(location, url);
          if (target.origin !== origin || !new RegExp('^/' + format + '/' + paperId.replace('.', '\\.') + '(?:v[1-9]\\d*)?(?:\\.pdf)?$').test(target.pathname) ||
              target.search || target.hash || !policy.allowed(target.pathname)) throw new Error('Redirect outside permitted article URL');
          if (!converted && baselineVersion && versionInArticleUrl(target.pathname, paperId) !== baselineVersion) {
            throw new Error('Redirect would discard or change the corpus version');
          }
          url = target;
        }
        if (!response.ok) {
          await response.body?.cancel();
          if ([401, 403, 429, 503].includes(response.status)) throw accessStop('arXiv refused/throttled requests (HTTP ' + response.status + ')');
          throw new Error('HTTP ' + response.status);
        }
        bytes = await responseBytes(response, MAX_BYTES);
        if (format === 'pdf') {
          if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Response is not a PDF');
          const extracted = await extractPdf(bytes);
          result = { sections: pdfSections(extracted.text), canonical: null, license: null };
        } else {
          result = extractHtml(bytes, parseHtml);
          if (converted) {
            const canonical = result.canonical ? new URL(result.canonical, url) : null;
            if (canonical?.origin !== origin ||
                !new RegExp('^/html/' + paperId.replace('.', '\\.') + '(?:v[1-9]\\d*)?/?$').test(canonical.pathname)) {
              throw new Error('ar5iv canonical URL does not identify the requested paper');
            }
          }
        }
        const normalized = chunkSections(paperId, result.sections);
        if (normalized.text.split(/\s+/).length < 100) throw new Error('Fewer than 100 extracted words');
        const canonicalVersion = versionInArticleUrl(result.canonical, paperId);
        if (canonicalVersion && baselineVersion && canonicalVersion !== baselineVersion) throw new Error('Article version differs from corpus URL');
        const version = converted ? canonicalVersion : canonicalVersion ?? versionInArticleUrl(url.pathname, paperId);
        const raw = 'documents/' + paperId + '.' + format;
        const text = 'documents/' + paperId + '.txt';
        const chunks = 'documents/' + paperId + '.chunks.json';
        // Local writes happen outside the download/parser error handler.
        const rawDigest = artifactDigest(bytes);
        const textBytes = Buffer.from(normalized.text, 'utf8');
        const chunkBytes = jsonBytes(normalized.chunks);
        const provenance = {
          ...paper, status: 'downloaded', attempts, format, resolvedUrl: url.href, arxivVersion: version,
          requestedArxivVersion: baselineVersion, versionVerified: Boolean(version && version === baselineVersion),
          sourceVersion: version ?? 'sha256:' + rawDigest.sha256, retrievedAt: new Date(now()).toISOString(),
          contentType: response.headers.get('content-type'), etag: response.headers.get('etag'),
          lastModified: response.headers.get('last-modified'), license: result.license,
          raw: { file: raw, ...rawDigest }, text: { file: text, ...artifactDigest(textBytes) },
          chunks: { file: chunks, count: normalized.chunks.length, ...artifactDigest(chunkBytes) },
        };
        const chunkIds = normalized.chunks.map(chunk => chunk.chunkId);
        attempt.status = 'ok';
        saved = { provenance, raw, text, chunks, rawBytes: bytes, textBytes, chunkBytes, chunkIds };
      } catch (error) {
        attempt.status = error.message;
        if (error.stop) {
          blocked = error.message;
          break;
        }
      }
      if (saved) break;
    }
    if (saved) {
      await writeFile(join(output, saved.raw), saved.rawBytes, { flag: 'wx' });
      await writeFile(join(output, saved.text), saved.textBytes, { flag: 'wx' });
      await writeFile(join(output, saved.chunks), saved.chunkBytes, { flag: 'wx' });
      rows.push(saved.provenance);
      map[paperId] = { file: saved.chunks, chunkIds: saved.chunkIds };
    } else {
      rows.push({ ...paper, status: blocked || !allowed ? 'blocked' : 'failed',
        reason: blocked ?? (!allowed ? 'Requested formats disallowed by robots.txt' : 'No usable full text'), attempts });
    }
  }
  const totals = { selected: rows.length, downloaded: 0, failed: 0, blocked: 0, html: 0, pdf: 0, chunks: 0 };
  for (const row of rows) {
    totals[row.status]++;
    if (row.status === 'downloaded') {
      totals[row.format]++;
      totals.chunks += row.chunks.count;
    }
  }
  const mappingBytes = jsonBytes(map);
  await writeFile(join(output, 'paper-chunk-map.json'), mappingBytes, { flag: 'wx' });
  const report = { schemaVersion: 'arxiv-fulltext-pilot-v1', fixture, corpusVersion, inputs, origin, source,
    robots: robots ?? { url: robotsUrl }, delayMs: delay, totals, rows,
    chunking: { windowWords: WINDOW, overlapWords: OVERLAP, offsets: 'UTF-16 exclusive end' },
    mapping: { file: 'paper-chunk-map.json', ...artifactDigest(mappingBytes) } };
  await writeFile(join(output, 'pilot-manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}

export async function loadParsers(directory) {
  const require = createRequire(pathToFileURL(resolve(directory, 'package.json')));
  const { parse } = require('node-html-parser');
  const { extractText } = await import(pathToFileURL(require.resolve('unpdf')).href);
  return {
    parseHtml: parse,
    extractPdf: bytes => extractText(new Uint8Array(bytes), { mergePages: false }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      'out-dir': { type: 'string' }, 'tools-dir': { type: 'string' }, contact: { type: 'string' }, limit: { type: 'string', default: '100' },
      source: { type: 'string', default: 'arxiv' },
      'backfill-from': { type: 'string' },
    } });
    if (!values['out-dir'] || !values['tools-dir'] || !values.contact) {
      throw new Error('Use --out-dir <new dir> --tools-dir <dir with parsers> --contact <project URL or email> [--limit 100] [--source arxiv|ar5iv]');
    }
    const { papers, snapshot, inputs } = await readBaselineSources();
    const parsers = await loadParsers(values['tools-dir']);
    let candidates = papers;
    if (values['backfill-from']) {
      const previous = JSON.parse(await readFile(values['backfill-from'], 'utf8'));
      if (values.source !== 'ar5iv' || previous.source !== 'ar5iv' || previous.corpusVersion !== snapshot.corpusVersion ||
          previous.fixture || !Array.isArray(previous.rows)) throw new Error('Expected live ar5iv manifest for the same corpus');
      const seen = new Set(previous.rows.map(row => row.paperId));
      candidates = papers.filter(paper => paper.id.startsWith('2610.') && !seen.has(paper.id));
    }
    const { totals } = await runPilot({
      selection: choosePilot(candidates, Number(values.limit)), output: values['out-dir'], contact: values.contact,
      corpusVersion: snapshot.corpusVersion, inputs, source: values.source, ...parsers,
    });
    console.log(JSON.stringify(totals, null, 2));
    if (totals.blocked || totals.downloaded === 0) process.exitCode = 2;
  } catch (error) {
    console.error('DATA-04: ' + error.message);
    process.exitCode = 1;
  }
}
