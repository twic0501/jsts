import type { AuthSession } from '../../auth/types/auth.types'
import { BookmarkClientError, type BookmarkClient } from '../types/bookmark.types'

function delay(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, 180)
    signal?.addEventListener('abort', abort, { once: true })
  })
}

/** Development memory only. Never imports storage.ts, cookies or any backend API. */
export function createMockBookmarkClient(): BookmarkClient {
  const byUser = new Map<string, Set<string>>()
  function collection(session: AuthSession) {
    if (session.source !== 'mock' || !session.user.id)
      throw new BookmarkClientError('Bookmark demo chỉ dùng với phiên đăng nhập mô phỏng.')
    let ids = byUser.get(session.user.id)
    if (!ids) { ids = new Set(); byUser.set(session.user.id, ids) }
    return ids
  }
  return {
    mode: 'mock',
    async list(session, signal) { await delay(signal); return [...collection(session)] },
    async save(session, paperId, signal) {
      await delay(signal)
      if (!paperId) throw new BookmarkClientError('Bài báo chưa có mã định danh hợp lệ.')
      collection(session).add(paperId)
    },
    async remove(session, paperId, signal) { await delay(signal); collection(session).delete(paperId) },
  }
}
