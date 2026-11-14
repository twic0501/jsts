import { createHmac } from 'node:crypto'
import { getIdentityModule } from '../../identity/identity.bootstrap'
import { readIdentityConfig } from '../../identity/identity.config'
import { assertAllowedOrigin } from '../../identity/presentation/identity.validation'
import { createBookmarkModule } from './bookmark.module'
import { MongoBookmarkRepository } from './infrastructure/mongo-bookmark.repository'
import { BookmarkCursor } from './application/bookmark.cursor'
import { unavailable } from './domain/bookmark.entity'
let module: ReturnType<typeof createBookmarkModule> | undefined
/** No Document schema or mapping is invented here. Wire the reviewed Document adapter before enabling. */
export function getBookmarkModule() {
  if(module)return module
  const authorization=getIdentityModule().authorization
  const origin=(request:Request)=>assertAllowedOrigin(request,readIdentityConfig(process.env))
  try {
    const config=readIdentityConfig(process.env)
    const integer=(name:string,max:number)=>{
      const raw=process.env[name]??'',value=Number(raw)
      if(!/^\d+$/.test(raw)||!Number.isSafeInteger(value)||value<1||value>max)throw unavailable()
      return value
    }
    const receiptTtlSeconds=integer('BOOKMARK_RECEIPT_TTL_SECONDS',604800),cursorTtlSeconds=integer('BOOKMARK_CURSOR_TTL_SECONDS',86400)
    const repository=new MongoBookmarkRepository(config.mongoUri,config.databaseName)
    return module=createBookmarkModule({authorization,origin,dependencies:{authorization,repository,
      documents:{async ready(){throw unavailable()},async readable(){throw unavailable()}},
      cursor:new BookmarkCursor(config.secret,cursorTtlSeconds),receiptTtlSeconds,now:()=>new Date(),
      fingerprint:(purpose,value)=>createHmac('sha256',config.secret).update(JSON.stringify([purpose,value])).digest('base64url'),
    }})
  }catch{return createBookmarkModule({authorization,origin})}
}
