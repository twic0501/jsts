import type { IdentityModule } from '../../../identity/identity.module'
import type { MutationProof } from '../../../identity/ports/authentication'
import type { BookmarkRepository, BookmarkMutation } from '../ports/bookmark.repository'
import type { DocumentAccess } from '../ports/document-access'
import { unavailable, type Bookmark, type BookmarkPage } from '../domain/bookmark.entity'
import { assertReadable } from '../domain/bookmark.policy'
import { BookmarkCursor } from './bookmark.cursor'
export interface BookmarkQuery { limit: number; cursor?: string }
export interface BookmarkInput { documentId: string; key: string; revision: number | null }
export interface BookmarkApplication {
  list(proof: MutationProof, input: () => BookmarkQuery): Promise<BookmarkPage>
  mutate(proof: MutationProof, method: 'PUT'|'DELETE', input: () => Promise<BookmarkInput>): Promise<Bookmark|null>
}
export interface BookmarkDependencies {
  authorization: IdentityModule['authorization']
  repository: BookmarkRepository
  documents: DocumentAccess
  cursor: BookmarkCursor
  fingerprint(purpose: string, value: string): string
  receiptTtlSeconds: number
  now(): Date
}
export class BookmarkService implements BookmarkApplication {
  constructor(private readonly d: BookmarkDependencies) {}
  async list(proof: MutationProof, input: () => BookmarkQuery): Promise<BookmarkPage> {
    const user=await this.d.authorization.requireAuthenticatedUser(proof),query=input(),now=this.d.now()
    let after=query.cursor?this.d.cursor.decode(query.cursor,user.id,query.limit,now):null
    await this.d.documents.ready()
    const items: Bookmark[]=[]
    let scanned=0,more=false
    // Bound ACL work. Opaque encrypted continuation resumes even after an empty filtered page.
    while(items.length<query.limit&&scanned<1000) {
      const batchLimit=Math.min(200,1000-scanned)
      const batch=await this.d.repository.scan(user.id,after,batchLimit)
      if(!batch.length)break
      for(const bookmark of batch) {
        after=bookmark.documentId;scanned++
        if(await this.d.documents.readable(user.id,bookmark.documentId))items.push(bookmark)
        if(items.length===query.limit)break
      }
      if(items.length===query.limit||scanned===1000) {more=(await this.d.repository.scan(user.id,after,1)).length>0;break}
      if(batch.length<batchLimit)break
    }
    return {items,nextCursor:more&&after?this.d.cursor.encode(user.id,query.limit,after,now):null}
  }
  async mutate(proof: MutationProof, method: 'PUT'|'DELETE', input: () => Promise<BookmarkInput>) {
    const user=await this.d.authorization.requireAuthenticatedUser(proof,true),data=await input()
    await this.d.documents.ready()
    assertReadable(await this.d.documents.readable(user.id,data.documentId))
    const now=this.d.now()
    const mutation: BookmarkMutation={ownerId:user.id,documentId:data.documentId,method,revision:data.revision,
      keyHash:this.d.fingerprint('fr14:bookmark-key',JSON.stringify([user.id,data.key])),
      fingerprint:this.d.fingerprint('fr14:bookmark-request',JSON.stringify([user.id,method,data.documentId,data.revision,method==='PUT'?{saved:true}:null])),
      now,receiptExpiresAt:new Date(now.getTime()+this.d.receiptTtlSeconds*1000)}
    return this.d.repository.mutate(mutation)
  }
}
/** Missing dependencies never fabricate a list or a saved state; authentication still runs. */
export class UnavailableBookmarkService implements BookmarkApplication {
  constructor(private readonly auth: IdentityModule['authorization']) {}
  async list(proof: MutationProof,input:()=>BookmarkQuery): Promise<BookmarkPage> {
    await this.auth.requireAuthenticatedUser(proof);input();throw unavailable()
  }
  async mutate(proof: MutationProof,_method:'PUT'|'DELETE',input:()=>Promise<BookmarkInput>): Promise<Bookmark|null> {
    await this.auth.requireAuthenticatedUser(proof,true);await input();throw unavailable()
  }
}
