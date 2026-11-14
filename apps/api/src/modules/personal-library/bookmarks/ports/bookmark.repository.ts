import type { Bookmark } from '../domain/bookmark.entity'
export interface BookmarkMutation {
  ownerId: string
  documentId: string
  method: 'PUT' | 'DELETE'
  /** null means If-None-Match:*, otherwise the exact strong revision. */
  revision: number | null
  keyHash: string
  fingerprint: string
  now: Date
  receiptExpiresAt: Date
}
export interface BookmarkRepository {
  ready(): Promise<void>
  scan(ownerId: string, after: string | null, limit: number): Promise<Bookmark[]>
  /** Atomic receipt + CAS state. null is a successful DELETE; never stores auth secrets. */
  mutate(input: BookmarkMutation): Promise<Bookmark | null>
}
