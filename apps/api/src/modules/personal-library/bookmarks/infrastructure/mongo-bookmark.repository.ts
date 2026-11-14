import { MongoClient, MongoServerError, type ClientSession } from 'mongodb'
import { randomUUID } from 'node:crypto'
import type { BookmarkRepository, BookmarkMutation } from '../ports/bookmark.repository'
import { BookmarkError, unavailable, type Bookmark } from '../domain/bookmark.entity'
import { revisionMismatch } from '../domain/bookmark.policy'
interface Row { _id: string; ownerId: string; documentId: string; saved: boolean; revision: number; updatedAt: string }
interface Receipt { _id: string; ownerId: string; fingerprint: string; result: Bookmark | null; expiresAt: Date }
const wire=(row: Row): Bookmark=>({id:row._id,documentId:row.documentId,saved:true,revision:row.revision,updatedAt:row.updatedAt})
const duplicate=(e: unknown)=>e instanceof MongoServerError&&e.code===11000
export class MongoBookmarkRepository implements BookmarkRepository {
  private readonly client: MongoClient
  private initialization: Promise<void> | undefined
  constructor(uri: string, private readonly database: string) {
    this.client=new MongoClient(uri,{maxPoolSize:5,serverSelectionTimeoutMS:2500,connectTimeoutMS:2500,waitQueueTimeoutMS:2500,socketTimeoutMS:10000})
  }
  private rows(){return this.client.db(this.database).collection<Row>('personal_bookmarks')}
  private receipts(){return this.client.db(this.database).collection<Receipt>('personal_bookmark_receipts')}
  async ready() {
    this.initialization??=(async()=>{
      await this.client.connect()
      const hello=await this.client.db(this.database).command({hello:1})
      if(!hello.setName&&hello.msg!=='isdbgrid')throw unavailable()
      await this.rows().createIndex({ownerId:1,documentId:1},{unique:true})
      await this.receipts().createIndex({expiresAt:1},{expireAfterSeconds:0})
    })().catch(()=>{this.initialization=undefined;throw unavailable()})
    await this.initialization
  }
  async scan(ownerId: string, after: string|null, limit: number) {
    try {
      await this.ready()
      return (await this.rows().find({ownerId,saved:true,...(after?{documentId:{$gt:after}}:{})}).sort({documentId:1}).limit(limit).toArray()).map(wire)
    }catch(error){if(error instanceof BookmarkError)throw error;throw unavailable()}
  }
  private replay(row: Receipt, input: BookmarkMutation) {
    if(row.ownerId!==input.ownerId||row.fingerprint!==input.fingerprint)throw new BookmarkError(409,'IDEMPOTENCY_CONFLICT','Idempotency-Key đã được dùng với yêu cầu khác.')
    return row.result
  }
  async mutate(input: BookmarkMutation): Promise<Bookmark|null> {
    try {
      await this.ready()
      // Retry unique-index races after transaction abort; state/preconditions are checked again.
      for(let attempt=0;attempt<3;attempt++) {
        const transaction=this.client.startSession()
        try {
          const result=await transaction.withTransaction(async()=>this.commit(input,transaction),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000})
          if(result===undefined)throw unavailable()
          return result
        }catch(error){if(!duplicate(error))throw error}
        finally{await transaction.endSession()}
      }
      throw unavailable()
    }catch(error){if(error instanceof BookmarkError)throw error;throw unavailable()}
  }
  private async commit(input: BookmarkMutation, session: ClientSession): Promise<Bookmark|null> {
    const previous=await this.receipts().findOne({_id:input.keyHash},{session})
    if(previous&&previous.expiresAt>input.now)return this.replay(previous,input)
    if(previous)await this.receipts().deleteOne({_id:previous._id},{session})
    const row=await this.rows().findOne({ownerId:input.ownerId,documentId:input.documentId},{session})
    if(input.method==='PUT'&&input.revision===null) {
      if(row?.saved)revisionMismatch()
    }else if(!row?.saved||row.revision!==input.revision) {
      if(!row)throw new BookmarkError(404,'BOOKMARK_NOT_FOUND','Bookmark không tồn tại.')
      revisionMismatch()
    }
    if(row&&row.revision>=Number.MAX_SAFE_INTEGER)throw new BookmarkError(409,'REVISION_EXHAUSTED','Không thể tăng revision.')
    const next: Row={_id:row?._id??randomUUID(),ownerId:input.ownerId,documentId:input.documentId,saved:input.method==='PUT',revision:(row?.revision??0)+1,updatedAt:input.now.toISOString()}
    if(row) {
      const changed=await this.rows().replaceOne({_id:row._id,ownerId:input.ownerId,revision:row.revision},next,{session})
      if(changed.modifiedCount!==1)revisionMismatch()
    }else await this.rows().insertOne(next,{session})
    const result=next.saved?wire(next):null
    await this.receipts().insertOne({_id:input.keyHash,ownerId:input.ownerId,fingerprint:input.fingerprint,result,expiresAt:input.receiptExpiresAt},{session})
    return result
  }
  /** Only the owner of this repository may dispose it; never close another module's pool. */
  close(){return this.client.close()}
}
