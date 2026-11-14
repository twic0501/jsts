import { parseArgs } from 'node:util';
import { MongoClient } from 'mongodb';
import { checkLocalTarget, importDataset, prepareDataset, rollbackDataset, writeFallback } from './arxiv-mongo-dataset.mjs';

try {
  const { values } = parseArgs({
    options: {
      'artifact-dir': { type: 'string' }, uri: { type: 'string' },
      'dry-run': { type: 'boolean' }, rollback: { type: 'boolean' },
      'fallback-out': { type: 'string' },
    },
  });
  const { uri, 'artifact-dir': artifactDir, 'dry-run': dryRun, rollback, 'fallback-out': fallbackOut } = values;
  if (!artifactDir || Boolean(uri) === Boolean(fallbackOut) || (fallbackOut && (dryRun || rollback)) || (rollback && dryRun)) {
    throw new Error('Use --artifact-dir <dir> and either --uri <review Mongo URI> [--dry-run | --rollback] or --fallback-out <new dir>');
  }
  if (uri) checkLocalTarget(uri);
  const start = performance.now();
  const dataset = await prepareDataset(artifactDir);
  let result;
  if (fallbackOut) {
    await writeFallback(fallbackOut, dataset);
    result = { action: 'fallback-generated', papers: dataset.paperRows.length };
  } else {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 4, directConnection: true });
    try {
      result = rollback ? await rollbackDataset(client, dataset) : await importDataset(client, dataset, { dryRun });
    } finally {
      await client.close();
    }
  }
  console.log(JSON.stringify({ ...result, datasetVersion: dataset.metadata.version, fingerprint: dataset.metadata.fingerprint, elapsedMs: performance.now() - start }, null, 2));
} catch (error) {
  console.error('DB-02: ' + error.message);
  process.exitCode = 1;
}
