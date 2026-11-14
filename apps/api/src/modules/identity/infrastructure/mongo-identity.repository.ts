import { MongoClient, MongoServerError, type Db } from 'mongodb'
import type { User } from '../domain/user.entity'
import { publicUser } from '../domain/role.policy'
import { duplicateEmail, IdentityError, IdentityUnavailableError, receiptConflict, tooManyAttempts } from '../domain/identity.error'
import type { UserRepository } from '../ports/user.repository'
import type { SessionRepository } from '../ports/session.repository'
import type { AttemptLimiter, NewAccount, RegistrationReceipt, SessionWrite } from '../ports/authentication'

interface AccountRow extends User { _id: string; passwordHash: string }
interface ReceiptRow { _id: string; fingerprint: string; user: User; expiresAt: Date }
interface SessionRow { _id: string; userId: string; createdAt: Date; expiresAt: Date; revokedAt: Date | null }
interface LimitRow { _id: string; count: number; expiresAt: Date }
const duplicateKey = (error: unknown) => error instanceof MongoServerError && error.code === 11000

/** FR12-owned collections only. No JSON/in-memory fallback and no corpus schema changes. */
export class MongoIdentityRepository implements UserRepository, SessionRepository, AttemptLimiter {
  private readonly client: MongoClient
  private readonly database: Db
  private ready: Promise<void> | undefined

  constructor(uri: string, databaseName: string) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 2500, connectTimeoutMS: 2500, waitQueueTimeoutMS: 2500, socketTimeoutMS: 10_000, maxPoolSize: 5 })
    this.database = this.client.db(databaseName)
  }
  private users() { return this.database.collection<AccountRow>('identity_users') }
  private receipts() { return this.database.collection<ReceiptRow>('identity_registration_receipts') }
  private sessions() { return this.database.collection<SessionRow>('identity_sessions') }
  private limits() { return this.database.collection<LimitRow>('identity_auth_limits') }

  private async ensureReady() {
    if (!this.ready) this.ready = (async () => {
      await this.client.connect()
      const hello = await this.database.command({ hello: 1 })
      // Registration receipts and session rotation require atomic multi-document commits.
      if (!hello.setName && hello.msg !== 'isdbgrid') throw new IdentityUnavailableError()
      await Promise.all([
        this.users().createIndex({ email: 1 }, { unique: true }),
        this.receipts().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        this.sessions().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        this.sessions().createIndex({ userId: 1 }),
        this.limits().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ])
    })().catch(error => { this.ready = undefined; throw error })
    await this.ready
  }
  private async available<T>(work: () => Promise<T>): Promise<T> {
    try { await this.ensureReady(); return await work() }
    catch (error) {
      if (error instanceof IdentityError) throw error
      throw new IdentityUnavailableError()
    }
  }
  /** Explicit owned-module readiness; concurrent callers share ensureReady's promise. */
  checkReady() { return this.available(async () => undefined) }
  findById(id: string) {
    return this.available(async () => {
      const row = await this.users().findOne({ _id: id })
      return row ? publicUser(row) : null
    })
  }
  findCredentialsByEmail(email: string) {
    return this.available(async () => {
      const row = await this.users().findOne({ email })
      return row ? { user: publicUser(row), passwordHash: row.passwordHash } : null
    })
  }
  findRegistrationReceipt(keyHash: string, now: Date) {
    return this.available(async () => {
      const row = await this.receipts().findOne({ _id: keyHash, expiresAt: { $gt: now } })
      return row ? { keyHash: row._id, fingerprint: row.fingerprint, user: publicUser(row.user), expiresAt: row.expiresAt } : null
    })
  }
  commitRegistration(account: NewAccount, receipt: RegistrationReceipt, now: Date): Promise<RegistrationReceipt> {
    return this.available(async () => {
      const transaction = this.client.startSession()
      try {
        const result = await transaction.withTransaction(async () => {
          const previous = await this.receipts().findOne({ _id: receipt.keyHash }, { session: transaction })
          if (previous && previous.expiresAt > now) {
            return { keyHash: previous._id, fingerprint: previous.fingerprint, user: publicUser(previous.user), expiresAt: previous.expiresAt }
          }
          if (previous) await this.receipts().deleteOne({ _id: previous._id }, { session: transaction })
          await this.users().insertOne({ ...publicUser(account.user), _id: account.user.id, passwordHash: account.passwordHash }, { session: transaction })
          await this.receipts().insertOne({ _id: receipt.keyHash, fingerprint: receipt.fingerprint, user: publicUser(account.user), expiresAt: receipt.expiresAt }, { session: transaction })
          return receipt
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 })
        if (!result) throw new IdentityUnavailableError()
        return result
      } catch (error) {
        if (duplicateKey(error)) {
          // Concurrent same-key retries may hit a unique constraint after the other commit.
          const previous = await this.receipts().findOne({ _id: receipt.keyHash, expiresAt: { $gt: now } })
          if (previous) {
            return { keyHash: previous._id, fingerprint: previous.fingerprint, user: publicUser(previous.user), expiresAt: previous.expiresAt }
          }
          throw duplicateEmail()
        }
        throw error
      } finally { await transaction.endSession() }
    })
  }
  findActiveByTokenHash(tokenHash: string, at: Date) {
    return this.available(async () => {
      const row = await this.sessions().findOne({ _id: tokenHash, revokedAt: null, expiresAt: { $gt: at } })
      return row ? { userId: row.userId, expiresAt: row.expiresAt.toISOString() } : null
    })
  }
  create(record: SessionWrite, previousTokenHash?: string) {
    return this.available(async () => {
      const transaction = this.client.startSession()
      try {
        await transaction.withTransaction(async () => {
          await this.sessions().insertOne({ _id: record.tokenHash, userId: record.userId, createdAt: record.createdAt, expiresAt: record.expiresAt, revokedAt: null }, { session: transaction })
          if (previousTokenHash) await this.sessions().updateOne({ _id: previousTokenHash, revokedAt: null }, { $set: { revokedAt: record.createdAt } }, { session: transaction })
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 })
      } finally { await transaction.endSession() }
    })
  }
  consume(key: string, now: Date, windowSeconds: number, maxAttempts: number) {
    return this.available(async () => {
      const windowMs = windowSeconds * 1000
      const bucket = Math.floor(now.getTime() / windowMs)
      const expiresAt = new Date((bucket + 1) * windowMs)
      const id = `${key}:${bucket}`
      const increment = () => this.limits().findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: 'after' })
      let row: LimitRow | null
      try { row = await increment() }
      catch (error) { if (!duplicateKey(error)) throw error; row = await increment() }
      if (!row || row.count > maxAttempts) throw tooManyAttempts(Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)))
    })
  }
  close() { return this.client.close() }
  revoke(tokenHash: string, at: Date) {
    return this.available(async () => { const result=await this.sessions().updateOne({ _id: tokenHash, revokedAt: null }, { $set: { revokedAt: at } }); return result.modifiedCount>0 })
  }
  updateProfile(userId: string, displayName: string, revision: number, receipt: RegistrationReceipt, at: Date): Promise<User> {
    return this.available(async () => {
      const transaction = this.client.startSession()
      try {
        const result = await transaction.withTransaction(async () => {
          const previous = await this.receipts().findOne({ _id: receipt.keyHash, expiresAt: { $gt: at } }, { session: transaction })
          if (previous) {
            if (previous.fingerprint !== receipt.fingerprint) throw receiptConflict()
            return publicUser(previous.user)
          }
          const row = await this.users().findOneAndUpdate({ _id: userId, revision }, { $set: { displayName, updatedAt: at.toISOString() }, $inc: { revision: 1 } }, { session: transaction, returnDocument: 'after' })
          if (!row) throw new IdentityError(412, 'REVISION_MISMATCH', 'Hồ sơ đã thay đổi. Vui lòng tải lại.')
          const user = publicUser(row)
          await this.receipts().deleteOne({ _id: receipt.keyHash, expiresAt: { $lte: at } }, { session: transaction })
          await this.receipts().insertOne({ _id: receipt.keyHash, fingerprint: receipt.fingerprint, user, expiresAt: receipt.expiresAt }, { session: transaction })
          return user
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 })
        if (!result) throw new IdentityUnavailableError()
        return result
      } catch (error) {
        if (duplicateKey(error)) {
          const previous = await this.receipts().findOne({ _id: receipt.keyHash, expiresAt: { $gt: at } })
          if (previous) { if (previous.fingerprint !== receipt.fingerprint) throw receiptConflict(); return publicUser(previous.user) }
        }
        throw error
      } finally { await transaction.endSession() }
    })
  }
}
