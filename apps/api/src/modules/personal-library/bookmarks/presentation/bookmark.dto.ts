import { z } from 'zod'
import { BookmarkError } from '../domain/bookmark.entity'
import { readIdentityJson } from '../../../identity/presentation/identity.validation'
export const uuid = z.uuid()
export function documentId(value: string) {
  const result=uuid.safeParse(value)
  if(!result.success)throw new BookmarkError(422,'VALIDATION_ERROR','documentId phải là UUID hợp lệ.')
  return result.data.toLowerCase()
}
export function queryOf(request: Request) {
  const params=new URL(request.url).searchParams
  if([...params.keys()].some(key=>!['limit','cursor'].includes(key)||params.getAll(key).length!==1))throw new BookmarkError(422,'VALIDATION_ERROR','Query không hợp lệ.')
  const raw=params.get('limit')??'20',cursor=params.get('cursor')
  if(!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>200||!Number.isSafeInteger(Number(raw))||cursor!==null&&(!cursor||cursor.length>4096))throw new BookmarkError(422,'VALIDATION_ERROR','limit/cursor không hợp lệ.')
  return {limit:Number(raw),...(cursor===null?{}:{cursor})}
}
export async function mutationOf(request: Request,id: string,method:'PUT'|'DELETE') {
  const parsed=documentId(id),key=uuid.safeParse(request.headers.get('idempotency-key'))
  if(!key.success)throw new BookmarkError(422,'IDEMPOTENCY_KEY_REQUIRED','Cần Idempotency-Key UUID.')
  const match=request.headers.get('if-match'),none=request.headers.get('if-none-match')
  let revision:number|null=null
  if(match===null&&none===null)throw new BookmarkError(428,'PRECONDITION_REQUIRED','Cần precondition của bookmark.')
  if(match!==null&&none!==null||none!==null&&(none!=='*'||method==='DELETE'))throw new BookmarkError(422,'INVALID_PRECONDITION','Precondition không hợp lệ.')
  if(match!==null){
    if(!/^"[1-9]\d*"$/.test(match)||!Number.isSafeInteger(Number(match.slice(1,-1))))throw new BookmarkError(422,'INVALID_ETAG','If-Match phải là strong revision ETag.')
    revision=Number(match.slice(1,-1))
  }
  if(method==='PUT') {
    if(!z.object({saved:z.literal(true)}).strict().safeParse(await readIdentityJson(request)).success)throw new BookmarkError(422,'VALIDATION_ERROR','Body chỉ nhận saved:true.')
  }else if(request.body!==null){
    // Next/HTTP may provide a non-null empty stream (Content-Length:0).
    const reader=request.body.getReader()
    try{while(true){const part=await reader.read();if(part.done)break;if(part.value.byteLength){await reader.cancel();throw new BookmarkError(422,'VALIDATION_ERROR','DELETE không nhận body.')}}}
    finally{reader.releaseLock()}
  }
  return {documentId:parsed,key:key.data.toLowerCase(),revision}
}
