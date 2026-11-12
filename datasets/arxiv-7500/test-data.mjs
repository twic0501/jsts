import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const options = {};
for (const arg of process.argv.slice(2)) {
  if (arg === '--strict-summary-length') { options.strict = true; continue; }
  const match = /^--(dir|expected)=(.+)$/.exec(arg);
  if (!match) throw new Error(`Tham so khong hop le: ${arg}`);
  options[match[1]] = match[2];
}
const directory = options.dir ? path.resolve(options.dir) : path.dirname(fileURLToPath(import.meta.url));
const expected = Number(options.expected ?? 7500);
if (!Number.isSafeInteger(expected) || expected < 3) throw new Error('--expected phai la so nguyen >=3.');
const files = {
  papers: path.join(directory, 'papers-selected-7500-with-summary.json'),
  semantic: path.join(directory, 'semantic-snapshot-selected.json')
};
const sha256 = text => createHash('sha256').update(text).digest('hex');
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const finiteArray = (x, length) => Array.isArray(x) && x.length === length && x.every(Number.isFinite);
const pointValid = point => point && ['x', 'y', 'z'].every(key => Number.isFinite(point[key]));
const issues = [];
const errors = (code, id, message) => issues.push({ level: 'error', code, paperId: id ?? null, message });
const warnings = (code, id, message) => issues.push({ level: 'warning', code, paperId: id ?? null, message });
const stats = {
  expected, papers: 0, embeddings: 0, summariesPresent: 0,
  missingSummaries: 0, summaryEqualsAbstract: 0, summaryLengthWarnings: 0,
  hashMatches: 0, validVectors: 0, pcaPointMatches: 0
};
const fileHashes = {};

async function readJson(key) {
  try {
    const bytes = await fs.readFile(files[key]);
    fileHashes[key] = sha256(bytes);
    return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    errors('READ_JSON', null, `${path.basename(files[key])}: ${error.message}`);
    return null;
  }
}
function allowedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (
      (url.hostname === 'arxiv.org' && url.pathname.startsWith('/abs/')) ||
      (url.hostname === 'openalex.org' && /^\/W\d+$/.test(url.pathname)) ||
      (url.hostname === 'doi.org' && url.pathname.startsWith('/10.'))
    );
  } catch { return false; }
}
function ownKeys(object, allowed, label, id) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) errors('UNEXPECTED_FIELD', id, `${label}.${key} ngoai schema ung dung hien tai.`);
  }
}
function validateProjection(projection) {
  if (!projection || !finiteArray(projection.mean, 384) ||
      !Array.isArray(projection.components) || projection.components.length !== 3 ||
      !projection.components.every(c => finiteArray(c, 384)) ||
      !finiteArray(projection.explainedVariance, 3) ||
      !pointValid(projection.center) || !Number.isFinite(projection.scale) ||
      projection.scale <= 0 || !Number.isInteger(projection.seed)) {
    errors('PROJECTION', null, 'Projection PCA sai cau truc, so chieu hoac co so khong huu han.');
    return false;
  }
  ownKeys(projection, ['mean', 'components', 'explainedVariance', 'center', 'scale', 'seed'], 'projection');
  ownKeys(projection.center, ['x', 'y', 'z'], 'projection.center');
  const ratios = projection.explainedVariance;
  if (ratios.some(x => x < -1e-8 || x > 1 + 1e-6) || ratios.reduce((a, b) => a + b, 0) > 1.00001) {
    errors('VARIANCE', null, 'Ty le phuong sai PCA ngoai khoang hop le.');
  }
  return true;
}
function project(vector, p) {
  const raw = p.components.map(axis => axis.reduce(
    (sum, value, i) => sum + (vector[i] - p.mean[i]) * value, 0
  ));
  return { x: (raw[0] - p.center.x) * p.scale,
           y: (raw[1] - p.center.y) * p.scale,
           z: (raw[2] - p.center.z) * p.scale };
}

console.log(`Dang kiem tra du lieu tai: ${directory}`);
const papers = await readJson('papers');
const snapshot = await readJson('semantic');
const byId = new Map();

if (!Array.isArray(papers)) {
  errors('PAPERS_ROOT', null, 'File papers phai la mang JSON.');
} else {
  stats.papers = papers.length;
  if (papers.length !== expected) errors('PAPER_COUNT', null, `Co ${papers.length}, can ${expected} bai.`);
  for (const paper of papers) {
    if (!paper || typeof paper !== 'object' || Array.isArray(paper)) {
      errors('PAPER_OBJECT', null, 'Bai bao phai la object.'); continue;
    }
    const id = paper.id;
    ownKeys(paper, ['id', 'title', 'abstract', 'authors', 'year', 'group', 'categories', 'sourceUrl', 'tags', 'summary', 'provenance'], 'paper', id);
    if (!nonempty(id) || !/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}|oa:W\d+)$/.test(id)) {
      errors('PAPER_ID', id, 'Ma bai khong hop le.');
    } else if (byId.has(id)) errors('DUPLICATE_PAPER', id, 'Trung ma bai.');
    else byId.set(id, paper);
    if (!nonempty(paper.title) || paper.title.length > 1000) errors('TITLE', id, 'Title rong/sai kieu/qua 1000 ky tu.');
    if (!nonempty(paper.abstract) || paper.abstract.length > 20000) errors('ABSTRACT', id, 'Abstract rong/sai kieu/qua 20000 ky tu.');
    if (!Array.isArray(paper.authors) || !paper.authors.length || !paper.authors.every(nonempty)) errors('AUTHORS', id, 'Thieu tac gia hoac tac gia rong/sai kieu.');
    if (!Number.isInteger(paper.year) || paper.year < 1900 || paper.year > 2100) errors('YEAR', id, 'Nam sai schema.');
    if (!['ai', 'biology', 'medicine', 'physics'].includes(paper.group)) errors('GROUP', id, 'Group khong duoc ung dung ho tro.');
    for (const field of ['categories', 'tags']) {
      if (!Array.isArray(paper[field]) || !paper[field].every(nonempty)) errors('STRING_ARRAY', id, `${field} phai la mang chuoi khong rong.`);
    }
    if (!allowedUrl(paper.sourceUrl)) errors('SOURCE_URL', id, 'Nguon phai la URL HTTPS duoc ung dung ho tro.');
    else {
      const source = new URL(paper.sourceUrl);
      if (source.hostname === 'arxiv.org' && source.pathname.slice(5).replace(/v\d+$/, '') !== id) {
        errors('SOURCE_ID', id, 'Ma trong URL arXiv khong khop id bai.');
      }
      if (source.hostname === 'openalex.org' && `oa:${source.pathname.slice(1)}` !== id) {
        errors('SOURCE_ID', id, 'Ma trong URL OpenAlex khong khop id bai.');
      }
    }
    if (paper.provenance !== undefined) {
      const p = paper.provenance;
      if (!p || typeof p !== 'object' || Array.isArray(p) ||
          !['arxiv', 'openalex'].includes(p.provider) || !nonempty(p.fetchedAt) ||
          !Number.isFinite(Date.parse(p.fetchedAt)) || typeof p.abstractAvailable !== 'boolean' ||
          !(p.doi === null || (typeof p.doi === 'string' && p.doi.length <= 300))) {
        errors('PROVENANCE', id, 'Provenance khong hop le.');
      } else {
        ownKeys(p, ['provider', 'fetchedAt', 'doi', 'abstractAvailable', 'pdfUrl'], 'provenance', id);
        if (p.pdfUrl !== null) {
          try {
            const u = new URL(p.pdfUrl);
            if (u.protocol !== 'https:' || u.username || u.password) throw new Error();
          } catch { errors('PDF_URL', id, 'pdfUrl phai la HTTPS hoac null.'); }
        }
      }
    }
    if (!nonempty(paper.summary)) {
      stats.missingSummaries++; errors('SUMMARY_MISSING', id, 'Summary thieu/rong/sai kieu.');
    } else {
      stats.summariesPresent++;
      if (typeof paper.abstract === 'string' && paper.summary.trim() === paper.abstract.trim()) {
        stats.summaryEqualsAbstract++;
        errors('SUMMARY_FALLBACK', id, 'Summary trung nguyen abstract, chua phai summary ngan tieng Viet.');
      }
      const words = paper.summary.trim().split(/\s+/).length;
      if (words < 20 || words > 30) {
        stats.summaryLengthWarnings++;
        (options.strict ? errors : warnings)('SUMMARY_LENGTH', id, `${words} tu (dem theo khoang trang), muc tieu 20-30.`);
      }
    }
  }
}

if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
  errors('SNAPSHOT_ROOT', null, 'Snapshot phai la object JSON.');
} else {
  ownKeys(snapshot, ['version', 'corpusVersion', 'createdAt', 'corpusHash', 'model', 'projection', 'papers'], 'snapshot');
  for (const key of ['version', 'corpusVersion', 'createdAt', 'corpusHash']) {
    if (!nonempty(snapshot[key])) errors('SNAPSHOT_METADATA', null, `Thieu ${key}.`);
  }
  if (!Number.isFinite(Date.parse(snapshot.createdAt))) errors('CREATED_AT', null, 'createdAt khong hop le.');
  const model = snapshot.model;
  if (!model || model.id !== 'Xenova/multilingual-e5-small' || model.dtype !== 'q8' ||
      model.dimensions !== 384 || !nonempty(model.revision) || model.pipelineVersion !== 'e5-mean-l2-512-v1') {
    errors('MODEL', null, 'Model khong khop pipeline E5 Q8 384 chieu.');
  }
  if (model && typeof model === 'object') ownKeys(model, ['id', 'revision', 'dtype', 'dimensions', 'pipelineVersion'], 'model');
  const projectionOk = validateProjection(snapshot.projection);
  if (!Array.isArray(snapshot.papers)) errors('EMBEDDING_ROOT', null, 'Snapshot.papers phai la mang.');
  else {
    stats.embeddings = snapshot.papers.length;
    if (snapshot.papers.length !== expected) errors('EMBEDDING_COUNT', null, `Co ${snapshot.papers.length}, can ${expected} embedding.`);
    const seen = new Set();
    const texts = [];
    let textsComplete = true;
    for (const item of snapshot.papers) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors('EMBEDDING_OBJECT', null, 'Embedding phai la object.'); textsComplete = false; continue;
      }
      const id = item.paperId;
      ownKeys(item, ['paperId', 'textHash', 'vector', 'point'], 'embedding', id);
      if (!nonempty(id) || seen.has(id)) errors('DUPLICATE_EMBEDDING', id, 'Ma embedding thieu hoac trung.');
      seen.add(id);
      const paper = byId.get(id);
      if (!paper || !nonempty(paper.title) || !nonempty(paper.abstract)) {
        errors('ORPHAN_EMBEDDING', id, 'Khong tim thay paper hop le tuong ung.'); textsComplete = false;
      } else {
        const text = `passage: ${paper.title}\n${paper.abstract}`;
        texts.push(text);
        if (item.textHash !== sha256(text)) errors('TEXT_HASH', id, 'textHash khong khop title + abstract.');
        else stats.hashMatches++;
      }
      const vectorOk = finiteArray(item.vector, 384) && Math.abs(Math.hypot(...item.vector) - 1) < 0.002;
      if (!vectorOk) errors('VECTOR', id, 'Vector sai chieu, khong huu han hoac chua L2 normalize.');
      else stats.validVectors++;
      if (!pointValid(item.point)) errors('POINT', id, 'Toa do thieu hoac khong huu han.');
      else {
        ownKeys(item.point, ['x', 'y', 'z'], 'point', id);
        if (projectionOk && vectorOk) {
          const calculated = project(item.vector, snapshot.projection);
          const delta = Math.hypot(calculated.x - item.point.x, calculated.y - item.point.y, calculated.z - item.point.z);
          if (!Number.isFinite(delta) || delta > 1e-5) errors('PCA_POINT', id, 'point khong khop vector va projection.');
          else stats.pcaPointMatches++;
        }
      }
    }
    for (const id of byId.keys()) {
      if (!seen.has(id)) errors('MISSING_EMBEDDING', id, 'Paper chua co embedding.');
    }
    // The corpus hash uses snapshot order, not the order of the metadata array.
    if (textsComplete && snapshot.corpusHash !== sha256(JSON.stringify(texts))) {
      errors('CORPUS_HASH', null, 'corpusHash khong khop danh sach dau vao theo thu tu snapshot.');
    }
  }
}

const errorCount = issues.filter(i => i.level === 'error').length;
const warningCount = issues.length - errorCount;
const report = {
  checkedAt: new Date().toISOString(), passed: errorCount === 0,
  files, fileSha256: fileHashes, datasetVersion: snapshot?.corpusVersion ?? null,
  strictSummaryLength: Boolean(options.strict), stats, errorCount, warningCount,
  limitations: [
    'Khong tu danh gia do chinh xac, ngon ngu hay viec tron noi dung trong summary.',
    'Khong tao lai embedding bang model de chung minh vector phan anh dung noi dung.',
    'Khong goi API, khong doc/ghi MongoDB, khong thay doi JSON nguon.',
    'Khong xac nhan toan van, RAG hoac hieu nang giao dien.'
  ],
  issues
};
const reportPath = path.join(directory, 'data-validation-report.json');
const temporary = `${reportPath}.${process.pid}.tmp`;
await fs.writeFile(temporary, JSON.stringify(report, null, 2), 'utf8');
await fs.rename(temporary, reportPath);

console.table(stats);
console.log(`KET QUA: ${report.passed ? 'PASS' : 'FAIL'}; loi=${errorCount}, canh bao=${warningCount}`);
if (issues.length) console.table(issues.slice(0, 15));
console.log(`Bao cao day du: ${reportPath}`);
console.log('PASS chi xac nhan cac quy tac tu dong, khong thay the viec doc mau summary.');
process.exitCode = report.passed ? 0 : 1;
