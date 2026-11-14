import { getBookmarkModule } from '../../../../../../../src/modules/personal-library/bookmarks/bookmark.bootstrap'
export const runtime='nodejs'
export const dynamic='force-dynamic'
type Context={params:Promise<{documentId:string}>}
export async function PUT(request:Request,{params}:Context){return getBookmarkModule().controller.put(request,(await params).documentId)}
export async function DELETE(request:Request,{params}:Context){return getBookmarkModule().controller.remove(request,(await params).documentId)}
