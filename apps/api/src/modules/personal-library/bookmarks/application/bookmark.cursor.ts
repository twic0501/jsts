import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { BookmarkError } from '../domain/bookmark.entity'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Authenticated encryption hides skipped/inaccessible IDs as well as binding user/limit/sort. */
export class BookmarkCursor {
  private readonly key: Buffer
  constructor(secret: Buffer, private readonly ttlSeconds: number) {
    this.key=createHmac('sha256',secret).update('fr14:bookmark-cursor:v1').digest()
  }
  encode(user: string, limit: number, after: string, now: Date) {
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv)
    const body=Buffer.concat([cipher.update(JSON.stringify({v:1,user,limit,after,expires:now.getTime()+this.ttlSeconds*1000})),cipher.final()])
    return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url')
  }
  decode(value: string, user: string, limit: number, now: Date): string {
    try {
      if (!/^[A-Za-z0-9_-]{40,4096}$/.test(value)) throw new Error()
      const bytes=Buffer.from(value,'base64url')
      if(bytes.toString('base64url')!==value)throw new Error()
      const decipher=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12))
      decipher.setAuthTag(bytes.subarray(12,28))
      const data: unknown=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'))
      if (!data||typeof data!=='object')throw new Error()
      const v=data as Record<string,unknown>
      if(v.v!==1||v.user!==user||v.limit!==limit||typeof v.after!=='string'||!uuid.test(v.after)||typeof v.expires!=='number'||!Number.isSafeInteger(v.expires))throw new Error()
      if(v.expires<=now.getTime())throw new BookmarkError(410,'CURSOR_EXPIRED','Cursor đã hết hạn. Vui lòng tải lại danh sách.')
      return v.after
    }catch(error){if(error instanceof BookmarkError)throw error;throw new BookmarkError(422,'INVALID_CURSOR','Cursor không hợp lệ cho tài khoản hoặc bộ lọc hiện tại.')}
  }
}
