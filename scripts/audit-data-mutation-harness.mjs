#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const sourceDir = path.resolve(repoRoot, 'datasets/arxiv-7500');
const auditScript = path.resolve(repoRoot, 'scripts/audit-data.mjs');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jsts-data-01-mutation-'));
const papersName = 'papers-selected-7500-with-summary.json';
const snapshotName = 'semantic-snapshot-selected.json';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value), 'utf8');

const cases = [
  {
    name: 'valid-control', expectedExit: 0, expectedFailedCheck: null,
    mutate: () => {}
  },
  {
    name: 'textHash-mismatch', expectedExit: 1, expectedFailedCheck: 4,
    mutate: ({ snapshot }) => { snapshot.papers[0].textHash = '0'.repeat(64); }
  },
  {
    name: 'missing-summary', expectedExit: 1, expectedFailedCheck: 1,
    mutate: ({ papers }) => { delete papers[0].summary; }
  },
  {
    name: 'duplicate-paper-id', expectedExit: 1, expectedFailedCheck: 2,
    mutate: ({ papers }) => { papers[1].id = papers[0].id; }
  },
  {
    name: 'vector-null', expectedExit: 1, expectedFailedCheck: 5,
    mutate: ({ snapshot }) => { snapshot.papers[0].vector[0] = null; }
  },
  {
    name: 'point-x-out-of-range', expectedExit: 1, expectedFailedCheck: 6,
    mutate: ({ snapshot }) => { snapshot.papers[0].point.x = 500; }
  },
  {
    name: 'missing-snapshot-record', expectedExit: 1, expectedFailedCheck: 3,
    mutate: ({ snapshot }) => { snapshot.papers.pop(); }
  },
  {
    name: 'duplicate-snapshot-id-same-set', expectedExit: 1, expectedFailedCheck: 3,
    mutate: ({ snapshot }) => { snapshot.papers.push({ ...snapshot.papers[0] }); },
    assert: ({ report }) => report?.checks.find((check) => check.id === 3)?.details.duplicateSnapshotIdCount === 1
      && report.checks.find((check) => check.id === 3)?.details.missingInSnapshotCount === 0
      && report.checks.find((check) => check.id === 3)?.details.extraInSnapshotCount === 0
  },
  {
    name: 'output-overwrites-input', expectedExit: 1, expectedFailedCheck: null,
    outputCollision: true,
    mutate: () => {}
  }
];

const results = [];
try {
  for (const testCase of cases) {
    const caseDir = path.join(fixtureRoot, testCase.name);
    fs.mkdirSync(caseDir, { recursive: true });
    const papers = readJson(path.join(sourceDir, papersName));
    const snapshot = readJson(path.join(sourceDir, snapshotName));
    testCase.mutate({ papers, snapshot });
    writeJson(path.join(caseDir, papersName), papers);
    writeJson(path.join(caseDir, snapshotName), snapshot);

    const reportPath = path.join(caseDir, 'audit-report.json');
    const outputPath = testCase.outputCollision ? path.join(caseDir, papersName) : reportPath;
    const sourceBefore = fs.readFileSync(path.join(caseDir, papersName));
    const sourceHashBefore = sourceBefore.toString('base64');
    const run = spawnSync(process.execPath, [auditScript, '--dir', caseDir, '--mode', 'fixture', '--out', outputPath], {
      cwd: repoRoot, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
    });
    const report = fs.existsSync(reportPath) ? readJson(reportPath) : null;
    const failedChecks = report?.checks.filter((check) => !check.passed).map((check) => check.id) ?? [];
    const passed = run.status === testCase.expectedExit
      && (testCase.expectedFailedCheck === null || failedChecks.includes(testCase.expectedFailedCheck))
      && (!testCase.assert || testCase.assert({ report }))
      && fs.readFileSync(path.join(caseDir, papersName)).toString('base64') === sourceHashBefore;
    results.push({
      name: testCase.name,
      expectedExit: testCase.expectedExit,
      actualExit: run.status,
      expectedFailedCheck: testCase.expectedFailedCheck,
      failedChecks,
      passed,
      stderr: run.stderr.trim()
    });
  }
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({
  harness: 'audit-data-mutation-harness',
  fixtureRoot,
  cases: results,
  passed: failed.length === 0,
  failedCount: failed.length
}, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
