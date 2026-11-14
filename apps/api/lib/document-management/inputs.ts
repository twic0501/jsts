import { z } from 'zod'
import { ReadingError, uuidPattern } from '../reading-states/storage'

const MiB = 1024 * 1024
const invalid = () => new ReadingError(422, 'INVALID_VERSION_IMPORT', 'Cần ID phiên bản và file hợp lệ.')
const subject = z.enum(['ai', 'biology', 'medicine', 'physics'])
const metadata = z.strictObject({
  title: z.string().trim().min(1).max(1000).optional(),
  subjects: z.array(subject).max(4).refine(items => new Set(items).size === items.length).optional(),
  primarySubject: subject.nullable().optional(),
}).refine(value => Object.keys(value).length > 0)

export function parseMetadata(body: unknown) {
  const result = metadata.safeParse(body)
  if (!result.success) throw new ReadingError(422, 'INVALID_DOCUMENT_METADATA', 'Thông tin tài liệu không hợp lệ.')
  const { title, subjects, primarySubject } = result.data
  return { ...(title !== undefined && { title }), ...(subjects !== undefined && { subjects }), ...(primarySubject !== undefined && { primarySubject }) }
}

export async function parseUpload(request: Request) {
  const contentType = request.headers.get('Content-Type') ?? ''
  if (contentType.split(';')[0]?.trim().toLowerCase() !== 'multipart/form-data') {
    throw new ReadingError(415, 'CONTENT_TYPE', 'Cần gửi multipart/form-data.')
  }
  const length = request.headers.get('Content-Length')
  const tooLarge = () => new ReadingError(413, 'BODY_TOO_LARGE', 'Tệp hoặc yêu cầu vượt giới hạn.')
  const limit = 21 * MiB
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw tooLarge()
  let bytes = 0
  const bounded = request.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength
      if (bytes > limit) throw tooLarge()
      controller.enqueue(chunk)
    },
  }))
  let parts: FormData
  try { parts = await new Response(bounded, { headers: { 'Content-Type': contentType } }).formData() }
  catch (error) {
    if (error instanceof ReadingError) throw error
    throw new ReadingError(400, 'INVALID_MULTIPART', 'Yêu cầu multipart không hợp lệ.')
  }
  const revisions = parts.getAll('baseDocumentRevision')
  if (!revisions.length) throw new ReadingError(428, 'BASE_DOCUMENT_REVISION_REQUIRED', 'Thiếu baseDocumentRevision.')
  const [base] = revisions
  const revision = Number(typeof base === 'string' ? base : NaN)
  if (revisions.length !== 1 || typeof base !== 'string' || !/^\d+$/.test(base) ||
      !Number.isSafeInteger(revision) || revision < 1) {
    throw new ReadingError(422, 'INVALID_BASE_DOCUMENT_REVISION', 'baseDocumentRevision phải là số nguyên dương an toàn.')
  }
  const [id] = parts.getAll('clientVersionId')
  const [file] = parts.getAll('file')
  if ([...parts.keys()].some(key => !['baseDocumentRevision', 'clientVersionId', 'file'].includes(key)) ||
      parts.getAll('clientVersionId').length !== 1 || parts.getAll('file').length !== 1 ||
      typeof id !== 'string' || !uuidPattern.test(id) || typeof file === 'string' || !file || !file.size) throw invalid()
  if (file.size > 20 * MiB) throw tooLarge()
  const extension = file.name.toLowerCase().split('.').at(-1)
  const mediaType = extension === 'pdf' ? 'application/pdf'
    : extension === 'md' ? 'text/markdown' : extension === 'txt' ? 'text/plain' : null
  if (!mediaType || (mediaType === 'application/pdf' &&
      !new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()).startsWith('%PDF-'))) {
    throw new ReadingError(415, 'UNSUPPORTED_FILE_TYPE', 'Chọn PDF có văn bản, TXT hoặc Markdown.')
  }
  return { versionId: id.toLowerCase(), revision, file, mediaType }
}
