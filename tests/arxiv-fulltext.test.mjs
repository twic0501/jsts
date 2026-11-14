import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { choosePilot, chunkSections, loadParsers, runPilot } from '../scripts/pilot-arxiv-fulltext.mjs';

function simplePdf(text) {
  const lines = text.match(/.{1,60}(?:\s|$)/g);
  const content = 'BT /F1 10 Tf 14 TL 40 750 Td ' + lines.map(line => '(' + line + ') Tj T*').join('\n') + ' ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((value, i) => {
    const offset = pdf.length;
    pdf += (i + 1) + ' 0 obj\n' + value + '\nendobj\n';
    return offset;
  });
  const startXref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n' +
    offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF\n';
  return Buffer.from(pdf, 'ascii');
}

const words = Array.from({ length: 205 }, (_, i) => 'word' + i).join(' ');
const records = ['2610.10000', '2610.10001', '2610.10002', '2610.10003'].map(paperId => ({
  paperId, abstractUrl: 'https://arxiv.org/abs/' + paperId, category: 'cs.LG',
}));

test('deterministic sample selection, paragraph-aware overlap, and exact UTF-16 offsets', () => {
  const papers = records.map(row => ({ id: row.paperId, sourceUrl: row.abstractUrl, categories: [row.category] }));
  assert.deepEqual(choosePilot(papers, 2), choosePilot(papers.toReversed(), 2));
  assert.throws(() => choosePilot(papers, 101), /limit/);
  const paragraphs = ['α 😀 ' + words.split(' ').slice(0, 120).join(' '), words];
  const { text, chunks } = chunkSections(records[0].paperId, [{ section: 'A', paragraphs }, { section: 'B', paragraphs: ['another section'] }]);
  assert(chunks.length >= 3);
  assert.equal(chunks[0].wordCount, 122);
  assert(chunks[1].text.startsWith('word85'));
  assert(chunks.every(chunk => chunk.text === text.slice(chunk.startChar, chunk.endChar) && chunk.wordCount <= 180));
  assert.equal(chunks.at(-1).section, 'B');
});

test('fixture downloads HTML first, falls back to an actual PDF, preserves provenance, and stops at 429',
  { skip: !process.env.JSTS_FULLTEXT_TOOLS }, async () => {
    const parsers = await loadParsers(process.env.JSTS_FULLTEXT_TOOLS);
    const tmp = await mkdtemp(join(tmpdir(), 'jsts-pilot-'));
    try {
      const output = join(tmp, 'pilot');
      const attempts = [];
      const pdf = simplePdf('token '.repeat(115));
      let time = Date.UTC(2026, 0, 1);
      const report = await runPilot({
        selection: records, output, ...parsers, fixture: true, contact: 'test fixture',
        corpusVersion: 'fixture', inputs: {}, now: () => time, pause: async ms => { time += ms; },
        fetchSource: async (url, options) => {
          const path = new URL(url).pathname;
          attempts.push({ path, time });
          assert.equal(options.redirect, 'manual');
          if (path === '/robots.txt') return new Response('User-agent: *\nAllow: /html\nAllow: /pdf\nCrawl-delay: 2\n');
          if (path === '/html/2610.10000') {
            return new Response('<meta name="citation_pdf_url" content="https://arxiv.org/pdf/2610.10000v2">' +
              '<article><h2>Results</h2><p>' + words + ' &amp; end</p><h2>References</h2><p>excluded reference</p></article>',
              { headers: { etag: '"f1"', 'content-type': 'text/html' } });
          }
          if (path === '/html/2610.10001') return new Response('HTML missing', { status: 404 });
          if (path === '/pdf/2610.10001') return new Response(null, { status: 302, headers: { location: '/pdf/2610.10001v3' } });
          if (path === '/pdf/2610.10001v3') return new Response(pdf, { headers: { 'content-type': 'application/pdf' } });
          return new Response('Limit', { status: 429 });
        },
      });
      assert.deepEqual(report.totals, { selected: 4, downloaded: 2, failed: 0, blocked: 2, html: 1, pdf: 1, chunks: 3 },
        JSON.stringify(report.rows.map(row => row.attempts)));
      assert.equal(report.rows[0].arxivVersion, 'v2');
      assert.equal(report.rows[1].arxivVersion, 'v3');
      assert.equal(report.rows[2].reason, 'arXiv refused/throttled requests (HTTP 429)');
      assert(attempts.every((entry, i) => i === 0 || entry.time - attempts[i - 1].time >= 15000));
      assert(!attempts.some(entry => entry.path.includes('2610.10003')));
      const mapping = JSON.parse(await readFile(join(output, 'paper-chunk-map.json')));
      for (const row of report.rows.filter(row => row.status === 'downloaded')) {
        const plain = await readFile(join(output, row.text.file), 'utf8');
        assert(!plain.includes('excluded reference'));
        const chunks = JSON.parse(await readFile(join(output, mapping[row.paperId].file)));
        assert(chunks.every(chunk => chunk.text === plain.slice(chunk.startChar, chunk.endChar)));
        assert.deepEqual(mapping[row.paperId].chunkIds, chunks.map(chunk => chunk.chunkId));
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

test('robots disallow blocks access before the first paper; HTTP 404 alone is an ordinary failure', async () => {
  for (const disallow of [true, false]) {
    const tmp = await mkdtemp(join(tmpdir(), 'jsts-robots-'));
    try {
      let requests = 0;
      const report = await runPilot({
        selection: records.slice(0, 1), output: join(tmp, 'out'), fixture: true, contact: 'test fixture',
        corpusVersion: 'fixture', now: () => 0, pause: async () => {},
        fetchSource: async url => {
          requests++;
          if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: ' + (disallow ? '/' : '/anything-else') + '\n');
          return new Response('missing', { status: 404 });
        },
      });
      assert.equal(requests, disallow ? 1 : 3);
      assert.equal(report.totals.blocked, disallow ? 1 : 0);
      assert.equal(report.totals.failed, disallow ? 0 : 1);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
});

test('ar5iv tracks canonical ID and does not infer the edition from the arXiv URL',
  { skip: !process.env.JSTS_FULLTEXT_TOOLS }, async () => {
    const parsers = await loadParsers(process.env.JSTS_FULLTEXT_TOOLS);
    const tmp = await mkdtemp(join(tmpdir(), 'jsts-ar5iv-'));
    try {
      const [first, second] = records;
      const november = { paperId: '2611.10000', abstractUrl: 'https://arxiv.org/abs/2611.10000v1', category: 'cs.LG' };
      const requests = [];
      const report = await runPilot({
        selection: [{ ...first, abstractUrl: first.abstractUrl + 'v2' }, second, november],
        output: join(tmp, 'pilot'), ...parsers, fixture: true, contact: 'fixture', source: 'ar5iv',
        now: () => 0, pause: async () => {},
        fetchSource: async url => {
          requests.push(url);
          if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nDisallow: /log/\n');
          return new Response('<link rel="canonical" href="https://ar5iv.labs.arxiv.org/html/' + first.paperId +
            '"><article><h2>Results</h2><p>' + words + '</p></article>');
        },
      });
      assert.equal(report.rows[0].status, 'downloaded');
      assert.equal(report.rows[0].arxivVersion, null);
      assert.equal(report.rows[0].requestedArxivVersion, 'v2');
      assert.equal(report.rows[0].versionVerified, false);
      assert.match(report.rows[0].sourceVersion, /^sha256:/);
      assert.match(report.rows[1].attempts[0].status, /canonical URL/);
      assert.match(report.rows[2].reason, /Outside/);
      assert.deepEqual(requests.map(url => new URL(url).pathname), ['/robots.txt', '/html/' + first.paperId, '/html/' + second.paperId]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
