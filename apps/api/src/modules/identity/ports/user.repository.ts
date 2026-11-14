import type { User } from '../domain/user.entity'
import type { NewAccount, RegistrationReceipt, StoredCredential } from './authentication'

/** FR12 account boundary. Credentials are internal; registration commits User + receipt atomically. */
export interface UserRepository {
  updateProfile: (userId: string, displayName: string, revision: number, receipt: RegistrationReceipt, at: Date) => Promise<User>
  findById: (id: User['id']) => Promise<User | null>
  findCredentialsByEmail: (canonicalEmail: string) => Promise<StoredCredential | null>
  findRegistrationReceipt: (keyHash: string, now: Date) => Promise<RegistrationReceipt | null>
  /** Must atomically commit user + receipt and enforce unique canonical email. */
  /** Returns the committed/winning receipt. Application verifies its slow payload verifier. */
  commitRegistration: (account: NewAccount, receipt: RegistrationReceipt, now: Date) => Promise<RegistrationReceipt>
}
