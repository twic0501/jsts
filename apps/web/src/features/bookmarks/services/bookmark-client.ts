import { getAuthClient, mockAuthEnabled } from '../../auth/services/auth-client'
import { BookmarkClientError, unavailableMapping, type BookmarkClient } from '../types/bookmark.types'
import { createRealBookmarkClient } from './real-bookmark-client'
const disabled:BookmarkClient={mode:'disabled',async list(){throw new BookmarkClientError('Bookmark tài khoản chưa khả dụng.')},async save(){throw new BookmarkClientError('Bookmark tài khoản chưa khả dụng.')},async remove(){throw new BookmarkClientError('Bookmark tài khoản chưa khả dụng.')}}
let client:Promise<BookmarkClient>|undefined
export function getBookmarkClient():Promise<BookmarkClient>{
  client??=import.meta.env.DEV&&mockAuthEnabled
    ?import('./mock-bookmark-client').then(({createMockBookmarkClient})=>createMockBookmarkClient())
    :getAuthClient().then(auth=>auth.mode==='backend'?createRealBookmarkClient(auth,unavailableMapping):disabled)
  return client
}
