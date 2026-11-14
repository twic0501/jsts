import { openDB, type DBSchema } from 'idb'

const MiB = 1024 * 1024
export const MAX_FILE_BYTES = 5 * MiB
export const MAX_LIBRARY_BYTES = 20 * MiB

export interface ImportedDocument {
  id: string
  name: string
  text: string
  bytes: number
  importedAt: number
  visibility: 'private'
}

interface DocumentLibrary extends DBSchema {
  documents: { key: string; value: ImportedDocument }
}

function openLibrary() {
  return openDB<DocumentLibrary>('paper-magic-private-documents', 1, {
    upgrade(database) {
      database.createObjectStore('documents', { keyPath: 'id' })
    },
  })
}

export async function listDocuments() {
  const database = await openLibrary()
  try {
    const documents = await database.getAll('documents')
    return documents.sort((a, b) => b.importedAt - a.importedAt)
  } finally {
    database.close()
  }
}

export async function deleteDocument(id: string) {
  const database = await openLibrary()
  try {
    await database.delete('documents', id)
  } finally {
    database.close()
  }
}

export async function importDocument(file: File, onSaving: () => void) {
  if (!/\.(txt|md)$/i.test(file.name)) throw new Error('Chọn tệp .txt hoặc .md.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Tệp vượt giới hạn 5 MiB.')
  if (!file.size) throw new Error('Tệp rỗng. Hãy chọn tệp có văn bản.')

  let content: string
  try {
    const bytes = await file.arrayBuffer()
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (content.includes('\0')) throw new Error('Binary content')
  } catch {
    throw new Error('Không đọc được tệp. Hãy lưu lại dưới dạng văn bản UTF-8.')
  }

  const normalized = content.replace(/\r\n?/g, '\n').trim()
  if (!normalized) throw new Error('Tệp rỗng. Hãy chọn tệp có văn bản.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const document: ImportedDocument = {
    id,
    name: file.name,
    text: content,
    bytes: file.size,
    importedAt: Date.now(),
    visibility: 'private',
  }

  onSaving()
  const database = await openLibrary()
  try {
    // Duplicate and quota checks share the write transaction across tabs.
    const transaction = database.transaction('documents', 'readwrite')
    const saved = await transaction.store.getAll()
    const duplicate = saved.find((item) => item.id === id)
    if (duplicate) {
      await transaction.done
      return { document: duplicate, duplicate: true }
    }
    const used = saved.reduce((sum, item) => sum + item.bytes, 0)
    if (used + file.size > MAX_LIBRARY_BYTES) {
      await transaction.done
      throw new Error('Thư viện vượt giới hạn 20 MiB. Hãy xóa tài liệu để giải phóng dung lượng.')
    }
    await Promise.all([transaction.store.add(document), transaction.done])
    return { document, duplicate: false }
  } finally {
    database.close()
  }
}
