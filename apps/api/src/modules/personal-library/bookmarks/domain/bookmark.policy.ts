import { BookmarkError } from './bookmark.entity'
export function assertReadable(readable: boolean) {
  if (!readable) throw new BookmarkError(404,'DOCUMENT_NOT_ACCESSIBLE','Tài liệu không tồn tại hoặc không được phép truy cập.')
}
export function revisionMismatch(): never { throw new BookmarkError(412,'REVISION_MISMATCH','Bookmark đã thay đổi. Vui lòng tải lại.') }
