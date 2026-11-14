import { createHash, randomUUID } from 'node:crypto'
import { buffer } from 'node:stream/consumers'
import { setTimeout as delay } from 'node:timers/promises'
import { embedBatch } from '../embedding.ts'
import type { StoredChunk, StoredVersion } from '../reading-states/storage'
import type { DocumentJob, DocumentManagement, PreparedVersion } from './storage'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim()
const maxExtractedChars = 5_000_000
const maxChunks = 10_000

class InvalidDocument extends Error {}
class LeaseLost extends Error {}

async function extract(bytes: Buffer, mediaType?: string) {
  if (mediaType !== 'application/pdf') {
    try {
      const text = normalize(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (!text || text.includes('\0')) throw new InvalidDocument()
      return { pages: [text], pageCount: null, parserRevision: 'utf8-v1' }
    } catch { throw new InvalidDocument('File phải có văn bản UTF-8 hợp lệ.') }
  }
  const pdf = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = pdf.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false })
  try {
    const document = await task.promise
    if (document.numPages > 2500) throw new InvalidDocument('PDF vượt giới hạn 2.500 trang.')
    const pages: string[] = []
    let total = 0
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number)
      const content = await page.getTextContent()
      const text = normalize(content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''))
      total += text.length
      if (total > maxExtractedChars) throw new InvalidDocument('Văn bản tách từ PDF vượt giới hạn.')
      pages.push(text)
      page.cleanup()
    }
    if (!total) throw new InvalidDocument('PDF không có lớp văn bản đọc được.')
    return { pages, pageCount: pages.length, parserRevision: `pdfjs-${pdf.version}` }
  } catch (error) {
    if (error instanceof InvalidDocument) throw error
    throw new InvalidDocument('Không trích được văn bản từ PDF.')
  } finally { await task.destroy() }
}

function chunkPages(version: StoredVersion, pages: string[], pageCount: number | null) {
  const chunks: StoredChunk[] = []
  const width = 850
  let total = 0
  for (const [index, page] of pages.entries()) {
    total += page.length
    if (total > maxExtractedChars) throw new InvalidDocument('Văn bản trích xuất vượt giới hạn.')
    for (let start = 0; start < page.length;) {
      let end = Math.min(page.length, start + width)
      const wordBoundary = page.lastIndexOf(' ', end)
      if (end < page.length && wordBoundary > start + width / 2) end = wordBoundary + 1
      if (end < page.length && /[\uD800-\uDBFF]/.test(page.charAt(end - 1))) end--
      const text = page.slice(start, end)
      if (text.trim()) chunks.push({
        _id: randomUUID(), documentId: version.documentId, versionId: version._id, ordinal: chunks.length,
        text, page: pageCount === null ? null : index + 1, section: null, start, end, textHash: hash(text),
      })
      if (chunks.length > maxChunks) throw new InvalidDocument('Tài liệu có quá nhiều đoạn để lập chỉ mục.')
      start = end
    }
  }
  return chunks
}

async function advance(store: DocumentManagement, job: DocumentJob, stage: string) {
  if (!await store.stage(job, stage)) throw new LeaseLost()
}

export async function prepareDocumentJob(
  store: DocumentManagement, job: DocumentJob, embed: (texts: string[]) => Promise<number[][]> = embedBatch,
): Promise<PreparedVersion | null> {
  const input = await store.inputs(job)
  if (!input) return null
  const { version, title } = input
  let chunks: StoredChunk[]
  let pageCount = version.pageCount
  let parserRevision = version.parserRevision ?? 'unknown'
  let textHash = version.textHash ?? ''
  if (job.kind === 'ingestion') {
    await advance(store, job, 'extracting')
    if (!version.sourceFileId) throw new InvalidDocument('Không tìm thấy file đã tải.')
    const bytes = await buffer(store.sources.openDownloadStream(version.sourceFileId))
    if (createHash('sha256').update(bytes).digest('hex') !== version.source.rawHash) {
      throw new InvalidDocument('Nội dung file đã tải không khớp checksum.')
    }
    const parsed = await extract(bytes, version.mediaType)
    await advance(store, job, 'chunking')
    chunks = chunkPages(version, parsed.pages, parsed.pageCount)
    pageCount = parsed.pageCount
    parserRevision = parsed.parserRevision
    textHash = hash(parsed.pages.join('\n'))
  } else {
    chunks = await store.existingChunks(job)
  }
  if (!chunks.length) throw new InvalidDocument('Tài liệu không có đoạn văn bản.')
  await advance(store, job, 'embedding')
  const inputs = [{ chunkId: null, text: title + '\n' + chunks[0]!.text }, ...chunks.map(chunk => ({ chunkId: chunk._id, text: chunk.text }))]
  const vectors: PreparedVersion['vectors'] = []
  for (let offset = 0; offset < inputs.length; offset += 3) {
    if (offset > 0) await advance(store, job, 'embedding')
    const batch = inputs.slice(offset, offset + 3)
    const output = await embed(batch.map(input => 'passage: ' + input.text))
    if (output.length !== batch.length || output.some(vector => vector.length !== 384 ||
      vector.some(value => !Number.isFinite(value)) || Math.abs(Math.hypot(...vector) - 1) > .002)) {
      throw new Error('Invalid embedding result')
    }
    batch.forEach((item, index) => vectors.push({ chunkId: item.chunkId, vector: output[index]! }))
  }
  await advance(store, job, 'indexing')
  return { chunks, vectors, title, pageCount, parserRevision, textHash }
}

export async function runDocumentJob(store: DocumentManagement) {
  const job = await store.claim()
  if (!job) return false
  try {
    if (job.kind === 'cleanup') await store.cleanup(job)
    else {
      const prepared = await prepareDocumentJob(store, job)
      if (prepared) await store.publish(job, prepared)
    }
  } catch (error) {
    if (!(error instanceof LeaseLost)) {
      const failure = error instanceof InvalidDocument
        ? { code: 'INVALID_DOCUMENT_CONTENT', message: error.message }
        : { code: 'PROCESSING_UNAVAILABLE', message: 'Tạm thời không thể xử lý tài liệu.' }
      await store.fail(job, failure, !(error instanceof InvalidDocument))
    }
  }
  return true
}

export async function pollDocumentJobs(store: DocumentManagement, signal: AbortSignal) {
  while (!signal.aborted) {
    try {
      if (await runDocumentJob(store)) continue
    } catch {
      console.error('FR20 worker could not access the job store.')
    }
    await delay(1000, undefined, { signal }).catch(error => { if (!signal.aborted) throw error })
  }
}
