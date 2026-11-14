export interface Bookmark {
  id: string
  documentId: string
  saved: true
  revision: number
  updatedAt: string
}
export interface BookmarkPage { items: Bookmark[]; nextCursor: string | null }
export class BookmarkError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); this.name='BookmarkError' }
}
export const unavailable = () => new BookmarkError(503,'BOOKMARK_DEPENDENCY_UNAVAILABLE','Bookmark chưa sẵn sàng: thiếu cấu hình hoặc Document Service chính thức.')
