#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { paperSchema } from '../packages/core/src/contracts.ts';

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let targetDir = 'datasets/arxiv-7500';
let outFile = 'audit-report.json';
let reviewOutFile = null;
let auditMode = 'baseline';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--dir') {
    targetDir = args[++i];
  } else if (arg.startsWith('--dir=')) {
    targetDir = arg.slice(6);
  } else if (arg === '--out') {
    outFile = args[++i];
  } else if (arg.startsWith('--out=')) {
    outFile = arg.slice(6);
  } else if (arg === '--review-out') {
    reviewOutFile = args[++i];
  } else if (arg.startsWith('--review-out=')) {
    reviewOutFile = arg.slice(13);
  } else if (arg === '--mode') {
    auditMode = args[++i];
  } else if (arg.startsWith('--mode=')) {
    auditMode = arg.slice(7);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Cú pháp:
  node scripts/audit-data.mjs [--dir datasets/arxiv-7500] [--mode baseline|fixture] [--out audit-report.json] [--review-out audit-review-numbers.json]

Tùy chọn:
  --dir <path>          Thư mục chứa dữ liệu cần kiểm tra (mặc định: datasets/arxiv-7500)
  --out <path>          Đường dẫn lưu file JSON báo cáo audit (mặc định: audit-report.json)
  --review-out <path>   Đường dẫn lưu file review số lệch Check #9 (mặc định: audit-review-numbers.json cùng thư mục --out)
  --mode <mode>         baseline (mặc định, yêu cầu 7.500/7.500 và 384D) hoặc fixture (chế độ kiểm thử rõ ràng, cho phép corpus nhỏ)
  --help, -h            Hiển thị trợ giúp này
`);
    process.exit(0);
  } else {
    console.error(`Tham số không xác định: ${arg}`);
    process.exit(1);
  }
}

if (!['baseline', 'fixture'].includes(auditMode)) {
  console.error(`Chế độ không hợp lệ: ${auditMode}. Dùng baseline hoặc fixture.`);
  process.exit(1);
}

const resolvedDir = path.resolve(process.cwd(), targetDir);
const resolvedOut = outFile ? path.resolve(process.cwd(), outFile) : null;
const resolvedReviewOut = reviewOutFile
  ? path.resolve(process.cwd(), reviewOutFile)
  : path.join(path.dirname(resolvedOut || path.resolve(process.cwd(), 'audit-report.json')), 'audit-review-numbers.json');

// File paths
const papersFilePath = path.join(resolvedDir, 'papers-selected-7500-with-summary.json');
const snapshotFilePath = path.join(resolvedDir, 'semantic-snapshot-selected.json');

const outputPaths = [resolvedOut, resolvedReviewOut].filter(Boolean);
const inputPaths = [papersFilePath, snapshotFilePath].map(file => path.resolve(file));
if (outputPaths.some(file => inputPaths.includes(path.resolve(file)))) {
  console.error('ERROR: Đường dẫn output không được trùng với file input nguồn.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helper Functions: Hashing (Raw & LF normalized)
// ---------------------------------------------------------------------------
function getFileMetadataWithLfNormalization(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const rawBuffer = fs.readFileSync(filePath);
  const rawSize = rawBuffer.length;
  const rawSha256 = createHash('sha256').update(rawBuffer).digest('hex');

  // LF normalization (CRLF -> LF)
  const textContent = rawBuffer.toString('utf8');
  const hasCrlf = textContent.includes('\r\n');
  const lfContent = textContent.replace(/\r\n/g, '\n');
  const lfBuffer = Buffer.from(lfContent, 'utf8');
  const normalizedLfSize = lfBuffer.length;
  const normalizedLfSha256 = createHash('sha256').update(lfBuffer).digest('hex');

  return {
    path: filePath,
    rawSize,
    rawSha256,
    normalizedLfSize,
    normalizedLfSha256,
    hasCrlf
  };
}

function calcWordStats(lengths) {
  if (lengths.length === 0) return { min: 0, mean: 0, median: 0, max: 0 };
  const sorted = [...lengths].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Number((sum / sorted.length).toFixed(2));
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { min, mean, median, max };
}

// Word numbers zero..twenty to digits
const WORD_TO_DIGIT = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14',
  fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19',
  twenty: '20'
};

function replaceWordNumbers(text) {
  if (!text) return '';
  return text.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,
    match => WORD_TO_DIGIT[match.toLowerCase()] ?? match
  );
}

/**
 * Extract normalized numbers handling:
 * - Word numbers one..twenty -> 1..20
 * - Thousands separators: 1.234, 1,234, 1 234, 16{,}575
 * - Decimal separators: 0.913, 0,913, 2,78, 39.12
 */
function extractNormalizedNumberValues(rawText) {
  if (!rawText) return new Set();
  let text = rawText.replace(/\{,\}/g, ',');
  text = replaceWordNumbers(text);
  // Normalize space thousands separator (e.g. 1 234 -> 1234)
  text = text.replace(/(\d{1,3})(?:\s+(\d{3}))+/g, m => m.replace(/\s+/g, ''));

  const rawMatches = text.match(/\d+(?:[.,]\d+)*/g) || [];
  const numbers = new Set();

  for (let s of rawMatches) {
    s = s.replace(/[.,]+$/, '');
    if (!s) continue;

    // Exact raw match
    numbers.add(s);

    // Thousands separator normalization (1,234 / 1.234 / 1 234)
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
      const stripped = s.replace(/[.,]/g, '');
      numbers.add(stripped);
      numbers.add(String(Number(stripped)));
    }

    // Thousands with decimal: 1,234.56 or 1.234,56
    if (/^\d{1,3}(,\d{3})+\.\d+$/.test(s)) {
      const v = s.replace(/,/g, '');
      numbers.add(v);
      numbers.add(String(Number(v)));
    }
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
      const v = s.replace(/\./g, '').replace(',', '.');
      numbers.add(v);
      numbers.add(String(Number(v)));
    }

    // Decimal numbers: 0.913 or 0,913 -> 0.913
    if (/^\d+[.,]\d+$/.test(s)) {
      const dotForm = s.replace(',', '.');
      numbers.add(dotForm);
      numbers.add(String(Number(dotForm)));
    }

    // Plain integer
    if (/^\d+$/.test(s)) {
      numbers.add(String(Number(s)));
    }
  }

  return numbers;
}

/**
 * Find sentence in abstract that has the numerically closest number to any missing number.
 */
function findClosestAbstractSentence(abstract, missingNumbers) {
  if (!abstract || !Array.isArray(missingNumbers) || missingNumbers.length === 0) return null;
  const sentences = abstract.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return null;

  const targets = missingNumbers
    .map(n => parseFloat(n.replace(',', '.')))
    .filter(Number.isFinite);
  if (targets.length === 0) return null;

  let bestSentence = null;
  let minDiff = Infinity;

  for (const sentence of sentences) {
    const sNums = extractNormalizedNumberValues(sentence);
    for (const numStr of sNums) {
      const val = parseFloat(numStr);
      if (!Number.isFinite(val)) continue;
      for (const target of targets) {
        const diff = Math.abs(val - target);
        if (diff < minDiff) {
          minDiff = diff;
          bestSentence = sentence;
        }
      }
    }
  }
  return bestSentence;
}

// ---------------------------------------------------------------------------
// Load & Check Input Files
// ---------------------------------------------------------------------------
const papersMeta = getFileMetadataWithLfNormalization(papersFilePath);
const snapshotMeta = getFileMetadataWithLfNormalization(snapshotFilePath);

if (!papersMeta) {
  console.error(`ERROR: Không tìm thấy file bài báo: ${papersFilePath}`);
  process.exit(1);
}
if (!snapshotMeta) {
  console.error(`ERROR: Không tìm thấy file snapshot: ${snapshotFilePath}`);
  process.exit(1);
}

let papersRaw;
let snapshotRaw;
try {
  papersRaw = JSON.parse(fs.readFileSync(papersFilePath, 'utf8'));
} catch (err) {
  console.error(`ERROR: Không parse được JSON file bài báo: ${err.message}`);
  process.exit(1);
}

try {
  snapshotRaw = JSON.parse(fs.readFileSync(snapshotFilePath, 'utf8'));
} catch (err) {
  console.error(`ERROR: Không parse được JSON file snapshot: ${err.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tokenizer Loader (Xenova/multilingual-e5-small via @huggingface/transformers)
// ---------------------------------------------------------------------------
async function loadRealTokenizer() {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const apiPkgUrl = new URL('../apps/api/package.json', import.meta.url);
    const require = createRequire(apiPkgUrl);
    const transformersPath = require.resolve('@huggingface/transformers');
    const { env, AutoTokenizer } = await import(pathToFileURL(transformersPath).href);

    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useFSCache = false;

    // Resolve .local/models path
    const candidatePaths = [
      path.resolve(process.cwd(), '.local/models/'),
      path.resolve(scriptDir, '../.local/models/')
    ];
    let modelsPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
    env.localModelPath = modelsPath;

    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/multilingual-e5-small', {
      local_files_only: true
    });
    return { tokenizer, error: null, modelsPath };
  } catch (err) {
    return { tokenizer: null, error: err.message, modelsPath: null };
  }
}

function verifyTokenizerManifest() {
  const manifestPath = path.resolve(process.cwd(), '.local/models/manifest.json');
  if (!fs.existsSync(manifestPath)) return { verified: false, reason: 'Thiếu .local/models/manifest.json' };
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const modelDir = path.resolve(process.cwd(), '.local/models/Xenova/multilingual-e5-small');
    const files = (manifest.files ?? []).map(entry => {
      const filePath = path.join(modelDir, entry.file);
      if (!fs.existsSync(filePath)) return { file: entry.file, exists: false, expectedSha256: entry.sha256 };
      const actualSha256 = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
      return { file: entry.file, exists: true, expectedSha256: entry.sha256, actualSha256, matches: actualSha256 === entry.sha256 };
    });
    return {
      verified: manifest.modelId === 'Xenova/multilingual-e5-small'
        && files.length > 0 && files.every(file => file.exists && file.matches),
      manifestPath, modelId: manifest.modelId, revision: manifest.revision,
      files, dimensions: manifest.dimensions, specialTokensPolicy: 'XLMRobertaTokenizer defaults; no truncation; count raw _encode_text output'
    };
  } catch (error) {
    return { verified: false, manifestPath, reason: error.message };
  }
}

// ---------------------------------------------------------------------------
// Execution of Checks
// ---------------------------------------------------------------------------
const checks = [];
let errorCount = 0;
let warningCount = 0;

function addCheck(id, name, level, passed, details = {}, message = '') {
  checks.push({
    id,
    name,
    level,
    passed,
    message,
    details
  });
  if (!passed) {
    if (level === 'ERROR') errorCount++;
    else if (level === 'WARN') warningCount++;
  }
}

// ===========================================================================
// ERROR CHECKS (1 - 7)
// ===========================================================================

// 1. File bài là mảng; mọi phần tử qua paperSchema.safeParse (đếm số lỗi, in 5 ví dụ đầu)
let schemaPass = true;
let schemaErrorDetails = [];
let totalSchemaErrors = 0;

if (!Array.isArray(papersRaw)) {
  schemaPass = false;
  totalSchemaErrors = 1;
  schemaErrorDetails.push({ error: 'File bài báo không phải là mảng JSON' });
} else {
  for (let i = 0; i < papersRaw.length; i++) {
    const paper = papersRaw[i];
    const parseResult = paperSchema.safeParse(paper);
    if (!parseResult.success) {
      totalSchemaErrors++;
      if (schemaErrorDetails.length < 5) {
        schemaErrorDetails.push({
          index: i,
          id: paper?.id || `[index ${i}]`,
          errors: parseResult.error.issues.map(iss => `${iss.path.join('.')}: ${iss.message}`)
        });
      }
    }
  }
  if (totalSchemaErrors > 0) schemaPass = false;
}

addCheck(
  1,
  'Schema validation (paperSchema.safeParse)',
  'ERROR',
  schemaPass,
  {
    totalPapers: Array.isArray(papersRaw) ? papersRaw.length : 0,
    schemaErrors: totalSchemaErrors,
    first5Errors: schemaErrorDetails
  },
  schemaPass
    ? `Tất cả ${papersRaw.length} bài báo vượt qua paperSchema.safeParse.`
    : `Có ${totalSchemaErrors} bài báo vi phạm schema (in tối đa 5 ví dụ đầu).`
);

// 2. id duy nhất; tiêu đề duy nhất sau chuẩn hóa (hạ chữ thường, bỏ ký tự không phải chữ/số)
const idMap = new Map();
const duplicateIds = [];
const normTitleMap = new Map();
const duplicateTitles = [];

if (Array.isArray(papersRaw)) {
  for (let i = 0; i < papersRaw.length; i++) {
    const p = papersRaw[i];
    if (p && typeof p === 'object') {
      const id = p.id;
      if (id !== undefined && id !== null) {
        if (idMap.has(id)) {
          duplicateIds.push({ id, index: i, previousIndex: idMap.get(id) });
        } else {
          idMap.set(id, i);
        }
      }

      if (typeof p.title === 'string') {
        const normTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normTitleMap.has(normTitle)) {
          duplicateTitles.push({
            id: p.id,
            title: p.title,
            duplicateWithId: normTitleMap.get(normTitle).id,
            duplicateWithTitle: normTitleMap.get(normTitle).title
          });
        } else {
          normTitleMap.set(normTitle, { id: p.id, title: p.title });
        }
      }
    }
  }
}

const check2Passed = duplicateIds.length === 0 && duplicateTitles.length === 0;
addCheck(
  2,
  'Duy nhất id và tiêu đề (chuẩn hóa ký tự)',
  'ERROR',
  check2Passed,
  {
    duplicateIdCount: duplicateIds.length,
    duplicateIds: duplicateIds.slice(0, 10),
    duplicateTitleCount: duplicateTitles.length,
    duplicateTitles: duplicateTitles.slice(0, 10)
  },
  check2Passed
    ? 'Tất cả id và tiêu đề sau chuẩn hóa đều duy nhất.'
    : `Phát hiện ${duplicateIds.length} id trùng lặp, ${duplicateTitles.length} tiêu đề trùng lặp sau chuẩn hóa.`
);

// 3. Tập id của file bài == tập paperId của snapshot (ghép theo id, báo thiếu/thừa)
const snapshotPapers = Array.isArray(snapshotRaw?.papers) ? snapshotRaw.papers : [];
const snapshotIdSet = new Set(snapshotPapers.map(s => s.paperId).filter(Boolean));
const paperIdSet = new Set(Array.isArray(papersRaw) ? papersRaw.map(p => p.id).filter(Boolean) : []);

const snapshotIdOccurrences = new Map();
for (const snapshotPaper of snapshotPapers) {
  if (snapshotPaper && snapshotPaper.paperId) {
    snapshotIdOccurrences.set(
      snapshotPaper.paperId,
      (snapshotIdOccurrences.get(snapshotPaper.paperId) ?? 0) + 1
    );
  }
}
const duplicateSnapshotIds = [...snapshotIdOccurrences.entries()]
  .filter(([, count]) => count > 1)
  .map(([paperId, count]) => ({ paperId, count }));

const missingInSnapshot = [];
for (const id of paperIdSet) {
  if (!snapshotIdSet.has(id)) missingInSnapshot.push(id);
}
const extraInSnapshot = [];
for (const id of snapshotIdSet) {
  if (!paperIdSet.has(id)) extraInSnapshot.push(id);
}

const cardinalityPass = auditMode === 'fixture'
  || (Array.isArray(papersRaw) && papersRaw.length === 7500 && snapshotPapers.length === 7500);
const check3Passed = cardinalityPass && missingInSnapshot.length === 0 && extraInSnapshot.length === 0 && duplicateSnapshotIds.length === 0;
addCheck(
  3,
  'Khớp tập id giữa file bài báo và snapshot',
  'ERROR',
  check3Passed,
  {
    papersCount: paperIdSet.size,
    snapshotCount: snapshotIdSet.size,
    missingInSnapshotCount: missingInSnapshot.length,
    missingInSnapshot: missingInSnapshot.slice(0, 10),
    extraInSnapshotCount: extraInSnapshot.length,
    extraInSnapshot: extraInSnapshot.slice(0, 10),
    duplicateSnapshotIdCount: duplicateSnapshotIds.length,
    duplicateSnapshotIds: duplicateSnapshotIds.slice(0, 10),
    requiredBaselineCardinality: auditMode === 'baseline' ? { papers: 7500, snapshot: 7500 } : null,
    cardinalityPass
  },
  check3Passed
    ? `Tập id hoàn toàn khớp (${paperIdSet.size} bài).`
    : `Tập id không khớp, snapshot có id trùng, hoặc sai cardinality baseline: thiếu ${missingInSnapshot.length} bài, thừa ${extraInSnapshot.length} bài, id snapshot trùng ${duplicateSnapshotIds.length}.`
);

// Snapshot lookup map
const snapshotByPaperId = new Map();
for (const s of snapshotPapers) {
  if (s && s.paperId) snapshotByPaperId.set(s.paperId, s);
}

// 4. textHash tính lại = sha256('passage: ' + title + '\n' + abstract) (hex, UTF-8)
let textHashErrors = [];
if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p || !p.id) continue;
    const snapEntry = snapshotByPaperId.get(p.id);
    if (!snapEntry) continue;

    const passageText = `passage: ${p.title}\n${p.abstract}`;
    const expectedHash = createHash('sha256').update(passageText, 'utf8').digest('hex');
    if (snapEntry.textHash !== expectedHash) {
      textHashErrors.push({
        id: p.id,
        expectedHash,
        actualHash: snapEntry.textHash
      });
    }
  }
}

const check4Passed = textHashErrors.length === 0;
addCheck(
  4,
  'Kiểm tra textHash (sha256 passage: title + newline + abstract)',
  'ERROR',
  check4Passed,
  {
    mismatchCount: textHashErrors.length,
    mismatches: textHashErrors.slice(0, 10)
  },
  check4Passed
    ? 'Tất cả textHash trong snapshot khớp chính xác hash tính lại.'
    : `Phát hiện ${textHashErrors.length} bài báo có textHash không khớp.`
);

// 5. Mỗi vector có độ dài đúng bằng snapshot.model.dimensions (384), mọi phần tử hữu hạn, chuẩn L2 trong khoảng 1 ± 1e-3
const expectedDim = auditMode === 'baseline' ? 384 : (snapshotRaw?.model?.dimensions ?? 384);
let vectorErrors = [];

for (const s of snapshotPapers) {
  if (!s || !s.paperId) continue;
  const vec = s.vector;
  if (!Array.isArray(vec)) {
    vectorErrors.push({ id: s.paperId, reason: 'Vector không phải là mảng' });
    continue;
  }
  if (vec.length !== expectedDim) {
    vectorErrors.push({ id: s.paperId, reason: `Độ dài vector là ${vec.length}, kỳ vọng ${expectedDim}` });
    continue;
  }
  let sumSq = 0;
  let allFinite = true;
  for (let i = 0; i < vec.length; i++) {
    const v = vec[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      allFinite = false;
      break;
    }
    sumSq += v * v;
  }
  if (!allFinite) {
    vectorErrors.push({ id: s.paperId, reason: 'Chứa phần tử không hữu hạn (NaN hoặc null/Infinity)' });
    continue;
  }
  const norm = Math.sqrt(sumSq);
  if (Math.abs(norm - 1) > 1e-3) {
    vectorErrors.push({ id: s.paperId, reason: `Chuẩn L2 = ${norm.toFixed(6)} nằm ngoài [1 - 1e-3, 1 + 1e-3]` });
  }
}

const check5Passed = vectorErrors.length === 0;
addCheck(
  5,
  'Kiểm tra vector (độ dài 384, hữu hạn, chuẩn L2 1 ± 1e-3)',
  'ERROR',
  check5Passed,
  {
    expectedDimensions: expectedDim,
    vectorErrorCount: vectorErrors.length,
    errors: vectorErrors.slice(0, 10)
  },
  check5Passed
    ? `Tất cả ${snapshotPapers.length} vector có độ dài ${expectedDim}, hữu hạn và chuẩn L2 đạt 1 ± 1e-3.`
    : `Phát hiện ${vectorErrors.length} vector không hợp lệ.`
);

// 6. point.x/y/z hữu hạn và nằm trong [-100, 100]
let pointErrors = [];
for (const s of snapshotPapers) {
  if (!s || !s.paperId) continue;
  const pt = s.point;
  if (!pt || typeof pt !== 'object') {
    pointErrors.push({ id: s.paperId, reason: 'Thiếu trường point hoặc point không phải object' });
    continue;
  }
  const { x, y, z } = pt;
  const validX = typeof x === 'number' && Number.isFinite(x) && x >= -100 && x <= 100;
  const validY = typeof y === 'number' && Number.isFinite(y) && y >= -100 && y <= 100;
  const validZ = typeof z === 'number' && Number.isFinite(z) && z >= -100 && z <= 100;

  if (!validX || !validY || !validZ) {
    pointErrors.push({
      id: s.paperId,
      point: pt,
      reason: `Tọa độ không hợp lệ: x=${x}, y=${y}, z=${z}`
    });
  }
}

const check6Passed = pointErrors.length === 0;
addCheck(
  6,
  'Tọa độ point 3D hữu hạn và trong [-100, 100]',
  'ERROR',
  check6Passed,
  {
    pointErrorCount: pointErrors.length,
    errors: pointErrors.slice(0, 10)
  },
  check6Passed
    ? 'Tất cả tọa độ 3D (x, y, z) đều hữu hạn và nằm trong khoảng [-100, 100].'
    : `Phát hiện ${pointErrors.length} tọa độ 3D vi phạm giới hạn.`
);

// 7. summary không rỗng sau trim
let emptySummaryErrors = [];
if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p) continue;
    const summary = p.summary;
    if (typeof summary !== 'string' || summary.trim().length === 0) {
      emptySummaryErrors.push({
        id: p.id,
        summary: summary ?? null
      });
    }
  }
}

const check7Passed = emptySummaryErrors.length === 0;
addCheck(
  7,
  'Summary không rỗng sau trim',
  'ERROR',
  check7Passed,
  {
    emptySummaryCount: emptySummaryErrors.length,
    errors: emptySummaryErrors.slice(0, 10)
  },
  check7Passed
    ? 'Tất cả summary đều là chuỗi không rỗng sau khi trim.'
    : `Phát hiện ${emptySummaryErrors.length} bài báo có summary rỗng.`
);

// ===========================================================================
// WARN CHECKS (8 - 11)
// ===========================================================================

// 8. Summary ngoài khoảng 20–30 từ (đếm tách theo <20 và >30), summary trùng nhau, summary không có dấu tiếng Việt nào
let summaryLt20 = 0;
let summaryGt30 = 0;
let summaryBetween2030 = 0;
const summaryFreq = new Map();
let noVietnameseSummary = [];
const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúũụưừứửữựỳýỷỹỵđ]/i;

if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p || typeof p.summary !== 'string') continue;
    const s = p.summary.trim();
    const words = s.split(/\s+/).filter(Boolean);
    const wc = words.length;

    if (wc < 20) summaryLt20++;
    else if (wc > 30) summaryGt30++;
    else summaryBetween2030++;

    summaryFreq.set(s, (summaryFreq.get(s) || 0) + 1);

    if (!vietnameseRegex.test(s)) {
      noVietnameseSummary.push({ id: p.id, summary: s });
    }
  }
}

const duplicateSummariesList = [];
let totalDuplicateSummariesCount = 0;
for (const [s, count] of summaryFreq.entries()) {
  if (count > 1) {
    duplicateSummariesList.push({ summary: s, count });
    totalDuplicateSummariesCount += (count - 1);
  }
}

const check8HasWarning = summaryLt20 > 0 || summaryGt30 > 0 || duplicateSummariesList.length > 0 || noVietnameseSummary.length > 0;
addCheck(
  8,
  'Chất lượng và độ dài summary (20–30 từ, trùng lặp, dấu tiếng Việt)',
  'WARN',
  !check8HasWarning,
  {
    summaryCountLt20: summaryLt20,
    summaryCountGt30: summaryGt30,
    summaryCountBetween2030: summaryBetween2030,
    duplicateSummaryGroupsCount: duplicateSummariesList.length,
    totalDuplicateSummariesCount,
    duplicateSummaries: duplicateSummariesList.slice(0, 5),
    noVietnameseCount: noVietnameseSummary.length,
    noVietnameseSamples: noVietnameseSummary.slice(0, 5)
  },
  `Summary: ${summaryLt20} bài < 20 từ, ${summaryGt30} bài > 30 từ, ${summaryBetween2030} bài trong khoảng [20, 30]. Trùng lặp: ${totalDuplicateSummariesCount} bài. Không dấu TV: ${noVietnameseSummary.length} bài.`
);

// 9. Số xuất hiện trong summary không có trong title+abstract (chuẩn hóa dấu phân cách, từ số one..twenty)
// Xuất TOÀN BỘ bài bị cờ ra audit-review-numbers.json
let unmatchedNumberPapers = [];
if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p) continue;
    const sourceText = `${p.title || ''} ${p.abstract || ''}`;
    const srcNumbers = extractNormalizedNumberValues(sourceText);

    // Summary numbers
    const sumNumbersRaw = replaceWordNumbers(p.summary || '').match(/\d+(?:[.,]\d+)*/g) || [];
    const missing = [];

    for (let token of sumNumbersRaw) {
      token = token.replace(/[.,]+$/, '');
      if (!token) continue;

      const tokenForms = extractNormalizedNumberValues(token);
      let matched = false;
      for (const tf of tokenForms) {
        if (srcNumbers.has(tf)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        missing.push(token);
      }
    }

    if (missing.length > 0) {
      const closestSentence = findClosestAbstractSentence(p.abstract, missing);
      unmatchedNumberPapers.push({
        id: p.id,
        title: p.title || '',
        mismatchedNumbers: missing,
        summary: p.summary || '',
        closestAbstractSentence: closestSentence
      });
    }
  }
}

// Write audit-review-numbers.json
if (resolvedReviewOut) {
  try {
    fs.writeFileSync(resolvedReviewOut, JSON.stringify(unmatchedNumberPapers, null, 2), 'utf8');
  } catch (err) {
    console.error(`Không thể ghi file review số tại ${resolvedReviewOut}: ${err.message}`);
  }
}

const check9HasWarning = unmatchedNumberPapers.length > 0;
addCheck(
  9,
  'Số xuất hiện trong summary không có trong title+abstract',
  'WARN',
  !check9HasWarning,
  {
    unmatchedCount: unmatchedNumberPapers.length,
    reviewFile: resolvedReviewOut,
    first10Examples: unmatchedNumberPapers.slice(0, 10)
  },
  `Có ${unmatchedNumberPapers.length} bài báo có số xuất hiện trong summary nhưng không có trong title+abstract (đã chuẩn hóa dấu phân cách và số chữ one..twenty; toàn bộ đã xuất ra file ${path.basename(resolvedReviewOut)}).`
);

// 10. Abstract dưới 30 từ; abstract chứa "withdrawn" trong 300 ký tự đầu
let abstractLt30 = [];
let abstractWithdrawn = [];

if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p || typeof p.abstract !== 'string') continue;
    const abs = p.abstract.trim();
    const words = abs.split(/\s+/).filter(Boolean);
    if (words.length < 30) {
      abstractLt30.push({ id: p.id, wordCount: words.length, abstract: abs });
    }
    const head300 = abs.slice(0, 300).toLowerCase();
    if (head300.includes('withdrawn')) {
      abstractWithdrawn.push({ id: p.id, snippet: abs.slice(0, 150) });
    }
  }
}

const check10HasWarning = abstractLt30.length > 0 || abstractWithdrawn.length > 0;
addCheck(
  10,
  'Chất lượng abstract (< 30 từ, chứa "withdrawn")',
  'WARN',
  !check10HasWarning,
  {
    abstractLt30Count: abstractLt30.length,
    abstractLt30Samples: abstractLt30.slice(0, 5),
    withdrawnCount: abstractWithdrawn.length,
    withdrawnSamples: abstractWithdrawn.slice(0, 5)
  },
  `Abstract: ${abstractLt30.length} bài < 30 từ; ${abstractWithdrawn.length} bài chứa 'withdrawn' trong 300 ký tự đầu.`
);

// 11. Bài có số token vượt 512 (dùng tokenizer thật Xenova/multilingual-e5-small)
const { tokenizer, error: tokenizerLoadError } = await loadRealTokenizer();
const tokenizerManifest = verifyTokenizerManifest();
let papersExceeding512Tokens = [];
let tokenCheckMethod = '';
let tokenCheckDisclaimer = null;
let isRealTokenizer = false;

if (tokenizer && Array.isArray(papersRaw)) {
  isRealTokenizer = true;
  tokenCheckMethod = 'Tokenizer thật: Xenova/multilingual-e5-small (@huggingface/transformers, XLMRobertaTokenizer), không truncation; count _encode_text';
  for (let i = 0; i < papersRaw.length; i++) {
    const p = papersRaw[i];
    if (!p) continue;
    const passage = `passage: ${p.title || ''}\n${p.abstract || ''}`;
    // Fast synchronous subword tokenization
    const tokens = tokenizer._encode_text(passage);
    const tokenCount = tokens.length;
    if (tokenCount > 512) {
      papersExceeding512Tokens.push({
        id: p.id,
        tokenCount
      });
    }
  }
} else {
  // Fallback to word-based heuristic if tokenizer failed to load
  isRealTokenizer = false;
  tokenCheckDisclaimer = 'ƯỚC LƯỢNG, KHÔNG KIỂM CHỨNG';
  const HEURISTIC_WORD_RATIO = 1.33; // Standard 1 word ~ 1.33 subwords for general NLP (without fitting to 171)
  tokenCheckMethod = `Ước lượng qua số từ passage nhân hệ số ${HEURISTIC_WORD_RATIO} (quy tắc phổ biến 1.33 token/từ tiếng Anh; ${tokenCheckDisclaimer}; lỗi nạp tokenizer: ${tokenizerLoadError || 'không xác định'})`;

  if (Array.isArray(papersRaw)) {
    for (const p of papersRaw) {
      if (!p) continue;
      const text = `passage: ${p.title || ''}\n${p.abstract || ''}`;
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const estimatedTokens = Math.round(words * HEURISTIC_WORD_RATIO);
      if (estimatedTokens > 512) {
        papersExceeding512Tokens.push({
          id: p.id,
          wordCount: words,
          estimatedTokens
        });
      }
    }
  }
}

const readmeCountComparison = isRealTokenizer
  ? (papersExceeding512Tokens.length === 171
      ? 'Khớp 100% với con số 171 bài trong README (171 bài vượt 512 token).'
      : `Lệch so với README: tokenizer thật đo được ${papersExceeding512Tokens.length} bài, trong khi README ghi 171 bài.`)
  : `Không thể so sánh chính xác do dùng ước lượng (${tokenCheckDisclaimer}).`;

addCheck(
  11,
  'Số token vượt 512 (chuỗi passage: title + newline + abstract)',
  'WARN',
  papersExceeding512Tokens.length === 0 && isRealTokenizer && tokenizerManifest.verified,
  {
    isRealTokenizer,
    tokenizerManifest,
    disclaimer: tokenCheckDisclaimer,
    tokenCheckMethod,
    papersExceedingCount: papersExceeding512Tokens.length,
    readmeExpected: 171,
    readmeComparison: readmeCountComparison,
    samples: papersExceeding512Tokens.slice(0, 10)
  },
  isRealTokenizer
    ? `Có ${papersExceeding512Tokens.length} bài vượt 512 token (đo bằng tokenizer thật Xenova/multilingual-e5-small; ${readmeCountComparison}).`
    : `[${tokenCheckDisclaimer}] Có ${papersExceeding512Tokens.length} bài vượt 512 token (${tokenCheckMethod}).`
);

// ===========================================================================
// DISTRIBUTIONS
// ===========================================================================
const monthDist = {};
const yearDist = {};
const groupDist = {};
const mainCategoryDist = {};
let nonCsMainCategoryCount = 0;
const abstractWordCounts = [];
const summaryWordCounts = [];

if (Array.isArray(papersRaw)) {
  for (const p of papersRaw) {
    if (!p) continue;
    // Month from first 4 characters of id: YYMM
    if (typeof p.id === 'string' && p.id.length >= 4) {
      const ym = p.id.slice(0, 4);
      monthDist[ym] = (monthDist[ym] || 0) + 1;
    }
    // Year
    if (p.year !== undefined) {
      yearDist[p.year] = (yearDist[p.year] || 0) + 1;
    }
    // Group
    if (p.group !== undefined) {
      groupDist[p.group] = (groupDist[p.group] || 0) + 1;
    }
    // Categories
    if (Array.isArray(p.categories) && p.categories.length > 0) {
      const mainCat = p.categories[0];
      mainCategoryDist[mainCat] = (mainCategoryDist[mainCat] || 0) + 1;
      if (!mainCat.startsWith('cs.')) {
        nonCsMainCategoryCount++;
      }
    }
    // Word counts
    if (typeof p.abstract === 'string') {
      abstractWordCounts.push(p.abstract.trim().split(/\s+/).filter(Boolean).length);
    }
    if (typeof p.summary === 'string') {
      summaryWordCounts.push(p.summary.trim().split(/\s+/).filter(Boolean).length);
    }
  }
}

// Top 15 categories
const sortedCategories = Object.entries(mainCategoryDist)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => ({ category: cat, count }));
const top15Categories = sortedCategories.slice(0, 15);

// Projection stats
const proj = snapshotRaw?.projection || {};
const expVar = Array.isArray(proj.explainedVariance) ? proj.explainedVariance : [];
const explainedVarianceSum = expVar.reduce((a, b) => a + b, 0);

const distributions = {
  months: monthDist,
  years: yearDist,
  groups: groupDist,
  categories: {
    uniqueMainCategoriesCount: Object.keys(mainCategoryDist).length,
    nonCsMainCategoriesCount: nonCsMainCategoryCount,
    top15MainCategories: top15Categories
  },
  abstractWords: calcWordStats(abstractWordCounts),
  summaryWords: calcWordStats(summaryWordCounts),
  projection: {
    scale: proj.scale ?? null,
    seed: proj.seed ?? null,
    explainedVariance: expVar,
    explainedVarianceSum
  }
};

// ---------------------------------------------------------------------------
// Output Generation
// ---------------------------------------------------------------------------
const passed = errorCount === 0;
const auditScriptPath = fileURLToPath(import.meta.url);
const report = {
  passed,
  errorCount,
  warningCount,
  checks,
  distributions,
  generatedAt: new Date().toISOString(),
  auditMode,
  auditCode: {
    path: path.relative(process.cwd(), auditScriptPath),
    sha256: createHash('sha256').update(fs.readFileSync(auditScriptPath)).digest('hex')
  },
  tokenizer: tokenizerManifest,
  inputFiles: {
    papers: papersMeta,
    snapshot: snapshotMeta
  },
  reviewFile: resolvedReviewOut
};

if (resolvedOut) {
  try {
    fs.writeFileSync(resolvedOut, JSON.stringify(report, null, 2), 'utf8');
  } catch (err) {
    console.error(`Không thể ghi file báo cáo tại ${resolvedOut}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Console Formatted Report
// ---------------------------------------------------------------------------
const border = '='.repeat(80);
const subBorder = '-'.repeat(80);

console.log(border);
console.log('             BÁO CÁO KIỂM TRA DỮ LIỆU ARXIV-7500 (AUDIT DATA REPORT)             ');
console.log(border);
console.log(`Thời gian chạy : ${report.generatedAt}`);
console.log(`Thư mục nguồn  : ${resolvedDir}`);
if (resolvedOut) console.log(`File báo cáo   : ${resolvedOut}`);
if (resolvedReviewOut) console.log(`File review số : ${resolvedReviewOut} (${unmatchedNumberPapers.length} bài)`);
console.log(subBorder);
console.log('THÔNG TIN FILE ĐẦU VÀO (VỚI TÁI LẬP HASH LF & RAW):');
console.log(`  1. ${path.basename(papersFilePath)}:`);
console.log(`     - Kích thước RAW trên đĩa : ${(papersMeta.rawSize / (1024 * 1024)).toFixed(2)} MB (${papersMeta.rawSize.toLocaleString()} bytes)`);
console.log(`     - SHA256 RAW trên đĩa     : ${papersMeta.rawSha256}`);
console.log(`     - Kích thước chuẩn hóa LF : ${(papersMeta.normalizedLfSize / (1024 * 1024)).toFixed(2)} MB (${papersMeta.normalizedLfSize.toLocaleString()} bytes)`);
console.log(`     - SHA256 chuẩn hóa LF     : ${papersMeta.normalizedLfSha256} [Canonical]`);
console.log(`     - Chứa ký tự xuống dòng CRLF : ${papersMeta.hasCrlf ? 'Có (Windows CRLF)' : 'Không (LF)'}`);
console.log(`  2. ${path.basename(snapshotFilePath)}:`);
console.log(`     - Kích thước RAW trên đĩa : ${(snapshotMeta.rawSize / (1024 * 1024)).toFixed(2)} MB (${snapshotMeta.rawSize.toLocaleString()} bytes)`);
console.log(`     - SHA256 RAW trên đĩa     : ${snapshotMeta.rawSha256}`);
console.log(`     - SHA256 chuẩn hóa LF     : ${snapshotMeta.normalizedLfSha256} [Canonical]`);
console.log(subBorder);

console.log('KẾT QUẢ KIỂM TRA (CHECKS):');
console.log(
  'STT'.padEnd(5) +
  'Cấp độ'.padEnd(8) +
  'Trạng thái'.padEnd(12) +
  'Tên phép kiểm tra'
);
console.log('-'.repeat(80));

for (const c of checks) {
  const statusStr = c.passed ? '[OK] PASS' : (c.level === 'ERROR' ? '[X] FAIL' : '[!] WARN');
  console.log(
    `#${c.id}`.padEnd(5) +
    c.level.padEnd(8) +
    statusStr.padEnd(12) +
    c.name
  );
  console.log(`    -> ${c.message}`);
}
console.log(subBorder);

// If there are schema errors, print first 5
if (totalSchemaErrors > 0) {
  console.log(`CHI TIẾT ${schemaErrorDetails.length} VÍ DỤ LỖI SCHEMA ĐẦU TIÊN:`);
  for (const err of schemaErrorDetails) {
    console.log(`  - [ID: ${err.id}] Lỗi: ${err.errors.join('; ')}`);
  }
  console.log(subBorder);
}

// Print Check 9 summary
if (unmatchedNumberPapers.length > 0) {
  console.log(`CẢNH BÁO SỐ TRONG SUMMARY KHÔNG CÓ TRONG TITLE+ABSTRACT (${unmatchedNumberPapers.length} bài):`);
  console.log(`  -> Đã xuất chi tiết 100% bài bị cờ ra: ${resolvedReviewOut}`);
  console.log('  -> 5 ví dụ đầu kèm câu abstract gần nhất:');
  unmatchedNumberPapers.slice(0, 5).forEach((ex, idx) => {
    console.log(`     ${idx + 1}. [ID: ${ex.id}] Số lệch: [${ex.mismatchedNumbers.join(', ')}]`);
    console.log(`        Summary  : "${ex.summary}"`);
    if (ex.closestAbstractSentence) {
      console.log(`        Câu gần  : "${ex.closestAbstractSentence}"`);
    }
  });
  console.log(subBorder);
}

// Print Check 11 details
console.log('THÔNG TIN CHI TIẾT CHECK #11 (SỐ TOKEN > 512):');
console.log(`  - Phương pháp kiểm tra : ${tokenCheckMethod}`);
console.log(`  - Số bài vượt 512 token: ${papersExceeding512Tokens.length} bài`);
console.log(`  - Đối chiếu README     : ${readmeCountComparison}`);
console.log(subBorder);

console.log('THỐNG KÊ PHÂN BỐ DỮ LIỆU (DISTRIBUTIONS):');
console.log('  1. Phân bố theo tháng (YYMM):');
for (const [ym, count] of Object.entries(distributions.months)) {
  console.log(`     - Tháng ${ym}: ${count.toLocaleString()} bài`);
}
console.log('  2. Phân bố theo năm & nhóm:');
console.log(`     - Năm  : ${JSON.stringify(distributions.years)}`);
console.log(`     - Nhóm : ${JSON.stringify(distributions.groups)}`);

console.log('  3. Phân bố Category chính:');
console.log(`     - Tổng số category chính khác nhau : ${distributions.categories.uniqueMainCategoriesCount}`);
console.log(`     - Số bài có category chính ngoài cs.* : ${distributions.categories.nonCsMainCategoriesCount}`);
console.log('     - Top 15 category chính:');
distributions.categories.top15MainCategories.forEach((cat, idx) => {
  console.log(`       ${(idx + 1).toString().padStart(2)}. ${cat.category.padEnd(12)} : ${cat.count.toLocaleString()} bài`);
});

console.log('  4. Thống kê độ dài từ:');
console.log(`     - Abstract : Min=${distributions.abstractWords.min}, Trung bình=${distributions.abstractWords.mean}, Trung vị=${distributions.abstractWords.median}, Max=${distributions.abstractWords.max}`);
console.log(`     - Summary  : Min=${distributions.summaryWords.min}, Trung bình=${distributions.summaryWords.mean}, Trung vị=${distributions.summaryWords.median}, Max=${distributions.summaryWords.max}`);

console.log('  5. Thông số chiếu PCA (Projection):');
console.log(`     - Scale: ${distributions.projection.scale}`);
console.log(`     - Seed : ${distributions.projection.seed}`);
console.log(`     - Explained Variance: [${distributions.projection.explainedVariance.map(v => v.toFixed(6)).join(', ')}]`);
console.log(`     - Tổng Explained Variance: ${(distributions.projection.explainedVarianceSum * 100).toFixed(2)}% (${distributions.projection.explainedVarianceSum.toFixed(6)})`);

console.log(border);
console.log(`TỔNG KẾT: ${passed ? 'PASSED (HỢP LỆ)' : 'FAILED (CÓ LỖI)'} | Lỗi (ERROR): ${errorCount} | Cảnh báo (WARN): ${warningCount}`);
console.log(border);

// Set exit code
process.exitCode = passed ? 0 : 1;
