import { getBookmarkModule } from '../../../../../../src/modules/personal-library/bookmarks/bookmark.bootstrap'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export function GET(request:Request){return getBookmarkModule().controller.list(request)}
