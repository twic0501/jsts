import type { AuthSession } from '../../auth/types/auth.types'
export type BookmarkStatus = 'loading'|'guest'|'ready'|'unavailable'|'error'
export const ACCOUNT_BOOKMARK_UNAVAILABLE='Bookmark tài khoản chưa sẵn sàng: cần Document Service và mapping Paper ↔ Document chính thức.'
export interface BookmarkClient {
  mode:'mock'|'disabled'|'backend'
  list(session:AuthSession,signal?:AbortSignal):Promise<string[]>
  save(session:AuthSession,paperId:string,signal?:AbortSignal):Promise<void>
  remove(session:AuthSession,paperId:string,signal?:AbortSignal):Promise<void>
  reset?():void
}
export type ResolveDocumentId=(paperId:string)=>Promise<string|null>
export interface DocumentMapping {
  ready():Promise<void>
  toDocumentId(paperId:string):Promise<string|null>
  toPaperId(documentId:string):Promise<string|null>
}
export type BookmarkErrorCode='UNAVAILABLE'|'DEPENDENCY_UNAVAILABLE'|'INVALID_RESPONSE'|'SESSION_EXPIRED'|'FORBIDDEN'|'CONFLICT'|'STALE_REVISION'|'MAPPING_UNAVAILABLE'|'INVALID_INPUT'|'RATE_LIMITED'
export class BookmarkClientError extends Error {
  constructor(message:string,readonly code:BookmarkErrorCode='UNAVAILABLE',readonly retryAfterSeconds?:number){super(message);this.name='BookmarkClientError'}
}
export interface WireBookmark {id:string;documentId:string;saved:true;revision:number;updatedAt:string}
export const unavailableMapping:DocumentMapping={
  async ready(){throw new BookmarkClientError(ACCOUNT_BOOKMARK_UNAVAILABLE,'MAPPING_UNAVAILABLE')},
  async toDocumentId(){return null},async toPaperId(){return null},
}
