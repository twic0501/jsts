import type { User } from '../domain/user.entity'
import type { SessionWrite } from './authentication'

/** Internal read projection, not a persisted Session schema or a public Session DTO. */
export interface ActiveSessionSubject {
  readonly userId: User['id']
  readonly expiresAt: string
}

/** Only token hashes cross this persistence boundary; no raw cookie/session secrets. */
export interface SessionRepository {
  revoke: (tokenHash: string, at: Date) => Promise<boolean>
  findActiveByTokenHash: (tokenHash: string, at: Date) => Promise<ActiveSessionSubject | null>
  /** Session insert + optional previous-session revocation are one transaction. */
  create: (session: SessionWrite, previousTokenHash?: string) => Promise<void>
}
