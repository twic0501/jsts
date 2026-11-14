import { MongoClient } from 'mongodb'
import { DocumentManagement } from './storage.ts'
import { pollDocumentJobs } from './worker.ts'

const uri = process.env.MONGODB_URI?.trim()
if (!uri) throw new Error('FR20 worker requires MONGODB_URI')
const stop = new AbortController()
process.once('SIGINT', () => stop.abort())
process.once('SIGTERM', () => stop.abort())
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2500, maxPoolSize: 5 })
try {
  const database = client.db(process.env.FR17_MONGODB_DB?.trim() || undefined)
  await pollDocumentJobs(new DocumentManagement(client, database), stop.signal)
} finally {
  await client.close()
}
// The reusable embedding worker thread belongs to this dedicated process.
process.exit(0)
