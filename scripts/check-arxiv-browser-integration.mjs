import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values } = parseArgs({ options: {
  'fallback-dir': { type: 'string' }, out: { type: 'string' }, browser: { type: 'string' },
  'neighbor-graph': { type: 'string' },
} });
const web = resolve('apps/web');
const api = resolve('apps/api');

async function unusedPort() {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

try {
  if (!values['fallback-dir'] || !values.out || !values['neighbor-graph']) {
    throw new Error('Use --fallback-dir <directory> --neighbor-graph <file> --out <report> [--browser <executable>]');
  }
  const port = await unusedPort();
  const target = 'http://127.0.0.1:' + port;
  const env = { ...process.env, JSTS_REVIEW_NEXT_DIST: '1', NEXT_TELEMETRY_DISABLED: '1', JSTS_DATASET_DIR: resolve(values['fallback-dir']) };
  delete env.MONGODB_URI;
  env.JSTS_NEIGHBOR_GRAPH = resolve(values['neighbor-graph']);
  const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)],
    { cwd: api, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  next.stdout.on('data', bytes => process.stderr.write(bytes));
  next.stderr.on('data', bytes => process.stderr.write(bytes));
  let vite;
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      ready = await fetch(target + '/api/v1/health', { signal: AbortSignal.timeout(8000) })
        .then(async response => response.ok && (await response.json()).paperCount === 7500, () => false);
      if (ready) break;
      if (next.exitCode !== null) throw new Error('Next exited during startup');
      await sleep(500);
    }
    assert(ready, 'API did not load its 7500-paper fallback');
    const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
    const { createServer: createViteServer } = await import(pathToFileURL(requireFromWeb.resolve('vite')).href);
    vite = await createViteServer({
      root: web, cacheDir: resolve('.local/data-engineering/browser-vite-cache'),
      server: { host: '127.0.0.1', port: await unusedPort(), strictPort: true, proxy: { '/api': target } },
    });
    await vite.listen();
    const address = vite.resolvedUrls.local[0];
    browser = await chromium.launch({ executablePath: values.browser, headless: true, args: ['--enable-unsafe-swiftshader'] });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const positive = await context.newPage();
    await positive.route('**/api/v1/dataset', route => route.abort('connectionfailed'));
    const bundledErrors = [];
    positive.on('pageerror', error => bundledErrors.push(error.message));
    await positive.goto(address);
    await positive.getByTestId('magic-book').waitFor({ state: 'visible', timeout: 60000 });
    await positive.waitForFunction(() => document.querySelector('.workspace-heading')?.textContent.includes('30 bài báo'));
    await positive.waitForFunction(() => document.querySelector('[data-testid="magic-book"]')?.getAttribute('data-phase') === 'idle');
    assert.deepEqual(bundledErrors, []);
    await positive.close();

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const starter = JSON.parse(await readFile('data/semantic-snapshot.json'));
    const source = JSON.parse(await readFile(resolve(values['fallback-dir'], 'semantic-snapshot.json')));
    const version = source.corpusVersion;
    const awaitScene = async (targetPage, expectedVersion) => {
      const handle = await targetPage.waitForFunction(expected => {
        const canvas = document.querySelector('[data-testid="magic-book"]');
        const visibleNodes = Number(canvas?.getAttribute('data-nodes'));
        if (canvas?.getAttribute('data-dataset-version') !== expected || canvas.getAttribute('data-projection') !== 'pca' ||
            visibleNodes <= 0 || document.querySelector('.app-shell')?.getAttribute('data-dataset-version') !== expected) return false;
        return { version: expected, projection: 'pca', totalPoints: Number(canvas.getAttribute('data-dataset-points')),
          neighborSource: canvas.getAttribute('data-neighbor-source'), visibleNodes };
      }, expectedVersion, { timeout: 120000 });
      try {
        return await handle.jsonValue();
      } finally {
        await handle.dispose();
      }
    };
    const start = performance.now();
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/v1/dataset'), { timeout: 120000 }),
      page.goto(address),
    ]);
    assert.equal(response.status(), 200);
    const onlineScene = await awaitScene(page, version);
    const firstSceneMs = performance.now() - start;
    assert.equal(onlineScene.neighborSource, 'precomputed');
    assert.equal(onlineScene.totalPoints, 7500);
    await page.waitForFunction(() => document.querySelector('.workspace-heading')?.textContent.includes('7500 bài báo'));
    await page.waitForFunction(async expected => {
      const db = await new Promise((resolve, reject) => {
        const open = indexedDB.open('paper-magic-v1');
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const read = db.transaction('library').objectStore('library').get('bundle');
          read.onsuccess = () => resolve(read.result?.dataset?.snapshot?.corpusVersion === expected);
          read.onerror = () => reject(read.error);
        });
      } finally { db.close(); }
    }, version, { timeout: 60000 });

    const query = 'low-bit language model weight quantization';
    await page.getByLabel('Tìm bài báo', { exact: true }).fill(query);
    const searchResponse = page.waitForResponse(res => res.url().endsWith('/api/v1/search') &&
      res.request().postDataJSON().query === query, { timeout: 60000 });
    await page.getByRole('button', { name: 'Tìm trong sách' }).click();
    const search = await searchResponse;
    assert.equal(search.status(), 200);
    const searchJson = await search.json();
    assert.equal(searchJson.datasetVersion, version);
    assert.equal(searchJson.method, 'semantic');
    assert(searchJson.items.length > 0);
    await page.waitForFunction(() => document.querySelector('[data-testid="magic-book"]')?.getAttribute('data-color-basis') === 'cosine-384d');
    assert.deepEqual(pageErrors, []);

    await context.route('**/api/**', route => route.abort('connectionfailed'));
    await page.reload();
    const offlineScene = await awaitScene(page, version);
    assert.equal(offlineScene.neighborSource, 'precomputed');
    assert.equal(offlineScene.totalPoints, 7500);
    assert.deepEqual(pageErrors, []);
    await page.close();
    await context.unroute('**/api/**');

    const mismatchContext = await browser.newContext({ serviceWorkers: 'block' });
    const mismatchPage = await mismatchContext.newPage();
    const mismatchErrors = [];
    mismatchPage.on('pageerror', error => mismatchErrors.push(error.message));
    const starterCorpus = JSON.parse(await readFile('data/corpus.json'));
    await mismatchPage.route('**/api/v1/dataset', route => route.fulfill({ json: {
      dataset: { corpus: { ...starterCorpus, version }, snapshot: starter }, storage: 'json',
    } }));
    await mismatchPage.goto(address);
    const mismatchScene = await awaitScene(mismatchPage, starter.corpusVersion);
    await mismatchPage.getByText('Dữ liệu trong máy', { exact: true }).waitFor();
    assert.deepEqual(mismatchErrors, []);

    const report = {
      bundledBrowserFallback: { passed: true, papers: starter.papers.length, datasetVersion: starter.corpusVersion },
      browserWithLargeCorpus: { passed: true, papers: source.papers.length, firstSceneMs, ...onlineScene,
        searchMethod: searchJson.method, query, results: searchJson.items.map(hit => hit.paper.id) },
      indexedDbReloadWithApiUnavailable: { passed: true, ...offlineScene },
      mismatchedBundleRejected: { passed: true, ...mismatchScene },
      pageErrors,
    };
    await writeFile(values.out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser?.close();
    await vite?.close();
    if (next.exitCode === null && next.signalCode === null) {
      const exit = once(next, 'exit');
      next.kill();
      await exit;
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
