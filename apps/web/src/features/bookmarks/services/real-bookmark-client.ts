import { AuthClientError, type AuthClient, type AuthSession } from '../../auth/types/auth.types'
import { BookmarkClientError, type BookmarkClient, type DocumentMapping, type WireBookmark } from '../types/bookmark.types'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const invalid=()=>new BookmarkClientError('Backend trả dữ liệu bookmark chưa hợp lệ.','INVALID_RESPONSE')
function bookmark(value:unknown):WireBookmark {
  if(!value||typeof value!=='object')throw invalid()
  const v=value as Record<string,unknown>
  if(Object.keys(v).some(k=>!['id','documentId','saved','revision','updatedAt'].includes(k))||typeof v.id!=='string'||!uuid.test(v.id)||typeof v.documentId!=='string'||!uuid.test(v.documentId)||v.saved!==true||!Number.isSafeInteger(v.revision)||Number(v.revision)<1||typeof v.updatedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v.updatedAt)||!Number.isFinite(Date.parse(v.updatedAt)))throw invalid()
  return {id:v.id,documentId:v.documentId,saved:true,revision:Number(v.revision),updatedAt:v.updatedAt}
}
interface Operation {key:string;revision:number|null;documentId:string;method:'PUT'|'DELETE'}
export function createRealBookmarkClient(auth:AuthClient,mapping:DocumentMapping,timeoutMs=15000):BookmarkClient {
  let owner='',generation=0,cacheEpoch=0,primed=false
  const records=new Map<string,WireBookmark>(),pending=new Map<string,Operation>(),writes=new Map<string,Promise<void>>()
  function reset(){owner='';generation++;cacheEpoch++;primed=false;records.clear();pending.clear();writes.clear()}
  function begin(session:AuthSession){
    if(session.source!=='backend'||auth.mode!=='backend')throw new BookmarkClientError('Cần phiên Backend thật.','SESSION_EXPIRED')
    if(owner!==session.user.id){reset();owner=session.user.id}
    return generation
  }
  function current(version:number,signal?:AbortSignal){if(version!==generation||signal?.aborted)throw new DOMException('Cancelled','AbortError')}
  async function verify(session:AuthSession,version:number,signal?:AbortSignal){
    let verified:AuthSession|null
    try{verified=await auth.getSession(signal)}catch(error){if(error instanceof AuthClientError&&error.code==='SESSION_EXPIRED')throw new BookmarkClientError('Phiên đăng nhập đã hết hạn.','SESSION_EXPIRED');throw error}
    current(version,signal)
    if(verified?.source!=='backend'||verified.user.id!==session.user.id)throw new BookmarkClientError('Phiên tài khoản đã thay đổi.','SESSION_EXPIRED')
  }
  async function request(url:string,init:RequestInit,status:number,signal?:AbortSignal):Promise<{response:Response;value:unknown}> {
    const abort=new AbortController(),cancel=()=>abort.abort()
    signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)abort.abort()
    const timer=setTimeout(()=>abort.abort(),timeoutMs)
    try {
      const response=await fetch('/api/v4/users/me/bookmarks'+url,{...init,credentials:'include',cache:'no-store',redirect:'error',signal:abort.signal})
      const json=response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()==='application/json'
      if(!response.ok){
        if(response.status===401)throw new BookmarkClientError('Phiên đăng nhập đã hết hạn.','SESSION_EXPIRED')
        if(response.status===403)throw new BookmarkClientError('Không có quyền hoặc kiểm tra Origin/CSRF bị từ chối.','FORBIDDEN')
        if(response.status===409)throw new BookmarkClientError('Yêu cầu bookmark bị xung đột.','CONFLICT')
        if(response.status===412||response.status===428)throw new BookmarkClientError('Bookmark đã thay đổi. Vui lòng tải lại.','STALE_REVISION')
        if(response.status===429){const raw=response.headers.get('retry-after'),seconds=raw&&/^\d+$/.test(raw)?Number(raw):NaN;throw new BookmarkClientError('Có quá nhiều yêu cầu bookmark. Vui lòng thử lại sau.','RATE_LIMITED',Number.isSafeInteger(seconds)?Math.min(seconds,86400):undefined)}
        if(response.status===404||response.status===422)throw new BookmarkClientError('Tài liệu, mapping hoặc yêu cầu bookmark không hợp lệ.','INVALID_INPUT')
        if(response.status===503)throw new BookmarkClientError('Dịch vụ bookmark hoặc Document Service chưa sẵn sàng.','DEPENDENCY_UNAVAILABLE')
        throw new BookmarkClientError('Dịch vụ bookmark hoặc Document Service chưa sẵn sàng.')
      }
      if(response.status!==status||status!==204&&!json)throw invalid()
      let value:unknown=null
      if(status!==204){try{value=await response.json()}catch{throw invalid()}}
      return {response,value}
    }catch(error){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');if(error instanceof BookmarkClientError)throw error;throw new BookmarkClientError('Không kết nối được dịch vụ bookmark hoặc request đã hết thời gian chờ.')}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
  }
  async function list(session:AuthSession,signal?:AbortSignal):Promise<string[]> {
    const version=begin(session),readEpoch=cacheEpoch
    await mapping.ready();current(version,signal);await verify(session,version,signal)
    const next=new Map<string,WireBookmark>(),ids:string[]=[],seen=new Set<string>()
    let cursor:string|null=null
    for(let page=0;page<100;page++){
      const {value}=await request('?limit=200'+(cursor?'&cursor='+encodeURIComponent(cursor):''),{method:'GET'},200,signal)
      current(version,signal)
      if(!value||typeof value!=='object')throw invalid()
      const v=value as Record<string,unknown>
      if(Object.keys(v).some(k=>!['items','nextCursor'].includes(k))||!Array.isArray(v.items)||v.items.length>200||v.nextCursor!==null&&(typeof v.nextCursor!=='string'||!v.nextCursor||v.nextCursor.length>4096))throw invalid()
      for(const item of v.items){
        const row=bookmark(item)
        if(next.has(row.documentId))throw invalid()
        const paper=await mapping.toPaperId(row.documentId)
        if(!paper||ids.includes(paper))throw new BookmarkClientError('Chưa có mapping/metadata đầy đủ cho bài đã lưu.','MAPPING_UNAVAILABLE')
        next.set(row.documentId,row);ids.push(paper)
      }
      cursor=v.nextCursor as string|null
      if(cursor===null){await verify(session,version,signal);current(version,signal);if(readEpoch===cacheEpoch){records.clear();next.forEach((r,id)=>records.set(id,r));primed=true}return ids}
      if(seen.has(cursor))throw invalid();seen.add(cursor)
    }
    throw new BookmarkClientError('Danh sách bookmark vượt giới hạn tải an toàn; cần đọc theo trang.')
  }
  async function mutate(session:AuthSession,paperId:string,method:'PUT'|'DELETE',signal?:AbortSignal){
    const version=begin(session)
    cacheEpoch++
    await mapping.ready()
    const id=await mapping.toDocumentId(paperId)
    current(version,signal)
    if(!id||!uuid.test(id))throw new BookmarkClientError('Bài báo chưa có documentId chính thức.','MAPPING_UNAVAILABLE')
    if(!primed)await list(session,signal)
    current(version,signal)
    const slot=method+':'+id,existing=records.get(id)
    let operation=pending.get(slot)
    if(!operation){
      if(method==='PUT'&&existing||method==='DELETE'&&!existing)return
      operation={key:crypto.randomUUID(),revision:existing?.revision??null,documentId:id,method};pending.set(slot,operation)
    }
    try {
      await verify(session,version,signal)
      if(!auth.getMutationHeaders)throw new BookmarkClientError('Authentication chưa hỗ trợ CSRF cho request này.')
      const proof=await auth.getMutationHeaders(session.user.id,signal)
      current(version,signal)
      const precondition=operation.revision===null?{'If-None-Match':'*'}:{'If-Match':`"${operation.revision}"`}
      const {response,value}=await request('/'+encodeURIComponent(id),{method,headers:{...proof,...precondition,'Idempotency-Key':operation.key,...(method==='PUT'?{'Content-Type':'application/json'}:{})},...(method==='PUT'?{body:JSON.stringify({saved:true})}:{})},method==='PUT'?200:204,signal)
      current(version,signal)
      const row=method==='PUT'?bookmark(value):null
      if(row&&(row.documentId!==id||response.headers.get('etag')!==`"${row.revision}"`))throw invalid()
      await verify(session,version,signal);current(version,signal)
      cacheEpoch++;if(row)records.set(id,row);else records.delete(id)
      pending.delete(slot)
    }catch(error){
      if(error instanceof BookmarkClientError&&!['UNAVAILABLE','DEPENDENCY_UNAVAILABLE','INVALID_RESPONSE','RATE_LIMITED'].includes(error.code))pending.delete(slot)
      if(error instanceof AuthClientError&&error.code==='SESSION_EXPIRED')throw new BookmarkClientError('Phiên tài khoản đã thay đổi.','SESSION_EXPIRED')
      throw error
    }
  }
  function write(session:AuthSession,paper:string,method:'PUT'|'DELETE',signal?:AbortSignal){
    const key=session.user.id+':'+paper,existing=writes.get(key)
    if(existing)return existing
    const task=mutate(session,paper,method,signal).finally(()=>{if(writes.get(key)===task)writes.delete(key)})
    writes.set(key,task);return task
  }
  return {mode:'backend',list,save:(s,p,a)=>write(s,p,'PUT',a),remove:(s,p,a)=>write(s,p,'DELETE',a),reset}
}
