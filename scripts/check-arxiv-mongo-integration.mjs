import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { Binary, MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { FILES, artifactDigest, sha256 } from './arxiv-artifact-format.mjs';
import { importDataset, prepareDataset, writeFallback } from './arxiv-mongo-dataset.mjs';
import { embedTexts } from '../apps/api/lib/embedding-runtime.mjs';

async function availablePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function closeProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

async function waitForNext(child, port) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Next exited before readiness');
    const ready = await new Promise(resolve => {
      const socket = createServerProbe(port);
      socket.once('error', () => resolve(false));
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
    });
    if (ready) return;
    await sleep(400);
  }
  throw new Error('Timed out waiting for Next listener');
}

// A socket probe avoids warming the dataset with a health request.
function createServerProbe(port) {
  return createConnection({ host: '127.0.0.1', port });
}

async function nextProbe(mode, envOverrides, work, dataset) {
  const port = await availablePort();
  const api = resolve('apps/api');
  const log = await open(join(work, 'next-' + mode + '.log'), 'wx');
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', JSTS_REVIEW_NEXT_DIST: '1' };
  delete env.MONGODB_URI;
  delete env.JSTS_DATASET_DIR;
  const args = ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)];
  const child = spawn(process.execPath, args, { cwd: api, env: { ...env, ...envOverrides }, stdio: ['ignore', log.fd, log.fd], windowsHide: true });
  try {
    await waitForNext(child, port);
    const request = async (path, expectedStatus = 200, options) => {
      const start = performance.now();
      const response = await fetch('http://127.0.0.1:' + port + '/api/v1/' + path, { ...options, signal: AbortSignal.timeout(150000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, expectedStatus, path + ': ' + bytes.toString().slice(0, 500));
      return { body: JSON.parse(bytes), bytes: bytes.length, ms: performance.now() - start };
    };
    const health = await request('health');
    assert.equal(health.body.storage, mode);
    assert.equal(health.body.datasetVersion, dataset.corpus.version);
    assert.deepEqual(health.body.model, dataset.snapshot.model);
    assert.equal(health.body.paperCount, dataset.corpus.papers.length);
    const papers = await request('papers');
    assert.equal(papers.body.version, dataset.corpus.version);
    assert.deepEqual(papers.body.papers, dataset.corpus.papers);
    const graph = await request('graph');
    assert.equal(graph.body.datasetVersion, dataset.corpus.version);
    assert.deepEqual(graph.body.points, dataset.snapshot.papers.map(({ paperId, point }) => ({ paperId, point })));
    const bundle = await request('dataset');
    assert.equal(bundle.body.storage, mode);
    assert.equal(bundle.body.dataset.corpus.version, dataset.corpus.version);
    assert.equal(bundle.body.dataset.snapshot.corpusVersion, dataset.corpus.version);
    assert.deepEqual(bundle.body.dataset.corpus.papers, dataset.corpus.papers);
    assert.deepEqual(bundle.body.dataset.snapshot.papers.map(({ paperId, point }) => ({ paperId, point })), graph.body.points);
    assert.equal(bundle.body.neighbors.length, dataset.corpus.papers.length);
    for (const [i, row] of bundle.body.dataset.snapshot.papers.entries()) {
      const expected = dataset.snapshot.papers[i];
      assert.equal(row.vector.length, 384);
      assert(row.vector.every((component, d) => Object.is(Math.fround(component), Math.fround(expected.vector[d]))));
    }
    const paperId = dataset.snapshot.papers[0].paperId;
    const paper = await request('papers/' + paperId);
    assert.equal((paper.body.paper ?? paper.body).id, paperId);
    const neighbors = await request('papers/' + paperId + '/neighbors?topK=20');
    const warm = [];
    for (let i = 0; i < 10; i++) warm.push((await request('papers/' + paperId + '/neighbors?topK=20')).ms);
    const query = 'low-bit language model weight quantization';
    const params = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, topK: 10 }) };
    const search = await request('search', 200, params);
    const searchWarm = await request('search', 200, params);
    assert.equal(search.body.method, 'semantic');
    assert.equal(search.body.datasetVersion, dataset.corpus.version);
    assert.equal(Object.keys(search.body.queryPoint).sort().join(','), 'x,y,z');
    const [vector] = await embedTexts(process.cwd(), ['query: ' + query]);
    assert.equal(vector.length, 384);
    const qNorm = Math.hypot(...vector);
    const expected = dataset.snapshot.papers.map(({ paperId, vector: v }) => {
      const dot = v.reduce((sum, value, i) => sum + vector[i] * Math.fround(value), 0);
      return { paperId, cosine: dot / (qNorm * Math.hypot(...v.map(Math.fround))) };
    }).sort((a, b) => b.cosine - a.cosine || a.paperId.localeCompare(b.paperId)).slice(0, 10);
    assert.deepEqual(search.body.items.map(hit => hit.paper.id), expected.map(hit => hit.paperId));
    assert(search.body.items.every((hit, i) => Math.abs(hit.score - expected[i].cosine) < 1e-10));
    assert.equal((await request('papers/0000.00000', 404)).body.error.code, 'PAPER_NOT_FOUND');
    return {
      mode, command: process.execPath + ' ' + args.join(' '), checks: {
        papers: papers.body.papers.length, paperIdSha256: sha256(JSON.stringify(papers.body.papers.map(p => p.id))),
        points: graph.body.points.length, pointsSha256: sha256(JSON.stringify(graph.body.points)),
        queryDimensions: vector.length, neighbors: neighbors.body.items.map(hit => hit.paper.id),
        bundledVectorsCompared: bundle.body.dataset.snapshot.papers.length * 384, bundledNeighbors: bundle.body.neighbors.length,
        denseSearchIds: search.body.items.map(hit => hit.paper.id), versionsMatch: true,
      },
      timings: {
        firstHealthMsIncludingDevCompilation: health.ms, papersMsIncludingFirstRouteCompilation: papers.ms,
        papersBytes: papers.bytes, graphMsIncludingFirstRouteCompilation: graph.ms, graphBytes: graph.bytes,
        bundleBytes: bundle.bytes, bundleMsIncludingFirstRouteCompilation: bundle.ms,
        neighborsMsIncludingFirstRouteCompilation: neighbors.ms, neighborsWarmMs: warm,
        searchFirstMs: search.ms, searchWarmMs: searchWarm.ms,
      },
    };
  } finally {
    await closeProcess(child);
    await log.close();
  }
}

const { values } = parseArgs({ options: {
  'artifact-dir': { type: 'string' }, 'out-dir': { type: 'string' }, 'system-binary': { type: 'string' },
  'neighbor-graph': { type: 'string' },
} });
try {
  if (!values['artifact-dir'] || !values['out-dir'] || !values['neighbor-graph']) {
    throw new Error('Use --artifact-dir <dir> --neighbor-graph <file> --out-dir <new dir> [--system-binary <mongod>]');
  }
  const work = resolve(values['out-dir']);
  await mkdir(work);
  const dataset = await prepareDataset(values['artifact-dir']);
  await writeFallback(join(work, 'fallback'), dataset);
  const binary = values['system-binary'] ? { systemBinary: resolve(values['system-binary']) } : { downloadDir: join(work, 'mongodb-binaries') };
  const replset = await MongoMemoryReplSet.create({
    binary: { version: '8.0.16', ...binary },
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', name: 'jsts-review' },
  });
  const uri = replset.getUri('jsts_data02_review_integration').split('?')[0];
  const client = new MongoClient(uri, { directConnection: true, serverSelectionTimeoutMS: 5000 });
  try {
    const database = client.db();
    const importer = async (extra = [], expectedCode = 0, target = uri, artifactDir = values['artifact-dir']) => {
      const args = ['scripts/import-arxiv-mongo.mjs', '--artifact-dir', artifactDir, '--uri', target, ...extra];
      const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const stdout = [];
      const stderr = [];
      child.stdout.on('data', chunk => stdout.push(chunk));
      child.stderr.on('data', chunk => stderr.push(chunk));
      const [exitCode] = await once(child, 'close');
      const message = Buffer.concat(stderr).toString();
      assert.equal(exitCode, expectedCode, message);
      const output = stdout.length ? JSON.parse(Buffer.concat(stdout)) : null;
      return { command: 'node ' + args.join(' '), exitCode, output, stderr: message.trim() };
    };
    const counts = async () => Object.fromEntries(await Promise.all(['papers', 'embeddings', 'datasets'].map(async name =>
      [name, await database.collection(name).countDocuments()])));
    const zero = { papers: 0, embeddings: 0, datasets: 0 };
    const present = { papers: 7500, embeddings: 7500, datasets: 1 };
    const dryRun = await importer(['--dry-run']);
    assert.equal(dryRun.output.action, 'would-import');
    assert.deepEqual(await database.listCollections().toArray(), []);
    let fault;
    try {
      await importDataset(client, dataset, { afterPapers: () => { throw new Error('Injected failure after writing papers'); } });
      assert.fail('Expected rollback after fault');
    } catch (error) {
      assert.equal(error.message, 'Injected failure after writing papers');
      fault = { error: error.message, counts: await counts() };
      assert.deepEqual(fault.counts, zero);
    }
    const first = await importer();
    assert.equal(first.output.action, 'imported');
    const afterFirst = await counts();
    assert.deepEqual(afterFirst, present);
    const second = await importer();
    assert.equal(second.output.action, 'unchanged');
    const afterSecond = await counts();
    assert.deepEqual(afterSecond, present);
    const rejectedMongoWrite = await database.collection('embeddings').insertOne({
      datasetVersion: dataset.metadata.version, paperId: 'invalid', row: 7500,
      textHash: '0'.repeat(64), point: { x: 0, y: 0, z: 0 }, vector: new Binary(Buffer.alloc(4)),
    }).then(() => null, error => error.code);
    assert.equal(rejectedMongoWrite, 121);
    assert.deepEqual(await counts(), present);
    const indexes = Object.fromEntries(await Promise.all(['papers', 'embeddings', 'datasets'].map(async name =>
      [name, await database.collection(name).indexes()])));

    const badTarget = uri.replace('_integration', '_foreign');
    const foreign = client.db('jsts_data02_review_foreign');
    await foreign.collection('team-data-marker').insertOne({ preserved: true });
    const refusedTarget = await importer([], 1, badTarget);
    assert.match(refusedTarget.stderr, /unrelated collections/);
    assert.equal(await foreign.collection('team-data-marker').countDocuments({ preserved: true }), 1);
    const corruptDir = join(work, 'corrupt');
    await mkdir(corruptDir);
    for (const name of Object.values(FILES)) {
      const bytes = await readFile(join(values['artifact-dir'], name));
      await writeFile(join(corruptDir, name), name === FILES.embeddings ? bytes.subarray(0, bytes.length - 1) : bytes);
    }
    const refusedArtifact = await importer([], 1, uri, corruptDir);
    assert.match(refusedArtifact.stderr, /11519999/);
    assert.deepEqual(await counts(), present);
    const rollback = await importer(['--rollback']);
    const afterRollback = await counts();
    assert.equal(rollback.output.action, 'rolled-back');
    assert.deepEqual(afterRollback, zero);
    const restore = await importer();
    assert.equal(restore.output.action, 'imported');
    const afterRestore = await counts();
    assert.deepEqual(afterRestore, present);
    await writeFile(join(work, 'mongo-report.json'), JSON.stringify({
      databaseIsolation: 'temporary loopback single-node MongoDB replica set', version: (await database.command({ buildInfo: 1 })).version,
      datasetVersion: dataset.metadata.version, dryRun, dryRunCreatedCollections: 0,
      fault, first, afterFirst, second, afterSecond, refusedTarget, refusedArtifact, rejectedMongoWrite, preservedForeignRows: 1,
      rollback, afterRollback, restore, afterRestore, indexes,
    }, null, 2));

    const graphBytes = await readFile(values['neighbor-graph']);
    const begin = performance.now();
    const graph = JSON.parse(graphBytes);
    const neighborIndex = new Map(graph.rows.map(row => [row.paperId, row.neighbors]));
    const parseAndIndexMs = performance.now() - begin;
    const fileStart = performance.now();
    const sample = [];
    for (let i = 0; i < 1000; i++) sample.push(neighborIndex.get(graph.rows[i % graph.rows.length].paperId).length);
    const lookup1000Ms = performance.now() - fileStart;
    assert(sample.every(count => count === 20));
    const graphEnv = { JSTS_NEIGHBOR_GRAPH: resolve(values['neighbor-graph']) };
    const mongo = await nextProbe('mongodb', { ...graphEnv, MONGODB_URI: uri }, work, dataset);
    const fallback = await nextProbe('json', { ...graphEnv, JSTS_DATASET_DIR: join(work, 'fallback') }, work, dataset);
    assert.deepEqual(mongo.checks, fallback.checks);
    assert.deepEqual(mongo.checks.neighbors, graph.rows[0].neighbors.map(edge => edge.paperId));
    const report = {
      mongo, fallback,
      precomputedNeighbors: { ...artifactDigest(graphBytes), parseAndIndexMs, lookup1000Ms, sampleLookups: 1000, sameTop20AsApiForSample: true },
    };
    await writeFile(join(work, 'integration-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
    await replset.stop();
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
