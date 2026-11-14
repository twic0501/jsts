import { AuthClientError, type AuthClient, type AuthSession, type AuthUser } from '../types/auth.types'

type WireUser = AuthUser & { revision: number; updatedAt: string }
const invalid = () => new AuthClientError('UNAVAILABLE', 'Backend trả dữ liệu tài khoản chưa hợp lệ.')
function user(value: unknown): WireUser {
  if (!value || typeof value !== 'object') throw invalid()
  const v = value as Record<string, unknown>
  if (Object.keys(v).some(key=>!['id','email','displayName','role','revision','updatedAt'].includes(key)) || typeof v.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id) || typeof v.email !== 'string' || v.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) || typeof v.displayName !== 'string' || Array.from(v.displayName).length<1 || Array.from(v.displayName).length>100 || !['user','admin'].includes(String(v.role)) || !Number.isSafeInteger(v.revision) || Number(v.revision)<1 || typeof v.updatedAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(v.updatedAt) || !Number.isFinite(Date.parse(v.updatedAt))) throw invalid()
  return { id:v.id,email:v.email,displayName:v.displayName,role:v.role as 'user'|'admin',revision:Number(v.revision),updatedAt:v.updatedAt }
}
const safeUser = (v: WireUser): AuthUser => ({id:v.id,email:v.email,displayName:v.displayName,role:v.role})
/** Same-origin cookie adapter. CSRF, ETag and operation epochs live only in memory. */
export function createRealAuthClient(): AuthClient {
  let csrf = '', profile: WireUser | null = null, etag = '', epoch = 0
  async function request(path: string, options: RequestInit, signal?: AbortSignal, expectedStatus = 200) {
    let response: Response
    try { response = await fetch('/api/v4'+path,{...options, credentials:'include',cache:'no-store',redirect:'error',...(signal?{signal}:{})}) }
    catch (error) { if (signal?.aborted) throw error; throw new AuthClientError('UNAVAILABLE','Không kết nối được dịch vụ tài khoản. Vui lòng thử lại.') }
    if (!response.ok) {
      let code=''
      if (response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()==='application/json') {
        try { const value=await response.json() as {error?:{code?:unknown}}; if(typeof value?.error?.code==='string')code=value.error.code } catch { /* Safe status fallback only. */ }
      }
      if (response.status===401) { throw new AuthClientError('SESSION_EXPIRED','Phiên đăng nhập không còn hợp lệ.') }
      if (response.status===409 && code==='EMAIL_ALREADY_REGISTERED') throw new AuthClientError('EMAIL_EXISTS','Email đã tồn tại.')
      if (response.status===409 && code==='IDEMPOTENCY_CONFLICT') throw new AuthClientError('IDEMPOTENCY_CONFLICT','Yêu cầu bị xung đột với thao tác trước. Vui lòng kiểm tra lại.')
      if (response.status===409) throw new AuthClientError('CONFLICT','Yêu cầu bị xung đột. Vui lòng kiểm tra lại.')
      if (response.status===412 || response.status===428) throw new AuthClientError('CONFLICT','Hồ sơ đã thay đổi. Vui lòng tải lại hồ sơ trước khi sửa.')
      if (response.status===422) throw new AuthClientError('INVALID_INPUT','Kiểm tra email, mật khẩu và tên hiển thị theo yêu cầu.')
      if (response.status===403) throw new AuthClientError('FORBIDDEN','Yêu cầu bị từ chối. Vui lòng kiểm tra phiên hoặc cấu hình Origin/CSRF.')
      if (response.status===429) {
        const raw=response.headers.get('retry-after'), numeric=raw!==null&&/^\d+$/.test(raw)?Number(raw):NaN
        const seconds=Number.isSafeInteger(numeric)?numeric:raw?Math.ceil((Date.parse(raw)-Date.now())/1000):NaN
        const retry=Number.isFinite(seconds)&&seconds>=0?Math.min(seconds,86400):undefined
        throw new AuthClientError('RATE_LIMITED','Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',retry)
      }
      throw new AuthClientError('UNAVAILABLE','Dịch vụ tài khoản chưa sẵn sàng. Vui lòng thử lại.')
    }
    if (response.status !== expectedStatus) throw invalid()
    if (expectedStatus !== 204 && response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw invalid()
    return response
  }
  async function json(response: Response): Promise<unknown> {
    try { return await response.json() } catch { throw invalid() }
  }
  function sessionValue(value: unknown) {
    if (!value || typeof value!=='object') throw invalid()
    const v=value as Record<string,unknown>
    if (Object.keys(v).some(key=>!['user','csrfToken','expiresAt'].includes(key)) || typeof v.csrfToken!=='string' || v.csrfToken.length<20 || v.csrfToken.length>512) throw invalid()
    const next=v.user===null?null:user(v.user)
    if (next ? typeof v.expiresAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v.expiresAt)||!Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=Date.now() : v.expiresAt!==null) throw invalid()
    return {v,next}
  }
  function assertCurrent(version: number, signal?: AbortSignal) { if (version!==epoch || signal?.aborted) throw new DOMException('Cancelled','AbortError') }
  async function session(version: number, signal?: AbortSignal): Promise<AuthSession|null> {
    const response = await request('/sessions/current',{method:'GET'},signal)
    const value = await json(response)
    assertCurrent(version,signal)
    const {v,next}=sessionValue(value)
    if (profile?.id !== next?.id) etag=''
    csrf=v.csrfToken as string; profile=next
    return next?{source:'backend',user:safeUser(next),expiresAt:v.expiresAt as string}:null
  }
  const client: AuthClient = {
    mode:'backend', getSession(signal) { return session(epoch,signal) },
    async getMutationHeaders(expectedUserId,signal) {
      const verified=await session(epoch,signal)
      if(!verified||verified.user.id!==expectedUserId)throw new AuthClientError('SESSION_EXPIRED','Phiên tài khoản đã thay đổi.')
      return {'X-CSRF-Token':csrf}
    },
    async login(values,signal) {
      const version=++epoch
      await session(version,signal)
      let loggedIn: WireUser | null
      try { const response=await request('/sessions',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({email:values.email,password:values.password})},signal); loggedIn=sessionValue(await json(response)).next; if(!loggedIn)throw invalid() }
      catch(error) { if(error instanceof AuthClientError && error.code==='SESSION_EXPIRED') throw new AuthClientError('INVALID_CREDENTIALS','Email hoặc mật khẩu không chính xác'); throw error }
      assertCurrent(version,signal)
      const verified=await session(version,signal)
      if (!verified) throw new AuthClientError('UNAVAILABLE','Chưa xác minh được cookie phiên. Vui lòng dùng HTTPS và thử lại.')
      if (verified.user.id!==loggedIn.id) throw invalid()
      return verified
    },
    async register(values,signal) {
      if (!values.displayName || Array.from(values.displayName).length>100 || Array.from(values.password).length<12 || Array.from(values.password).length>256 || values.password!==values.confirmPassword) throw new AuthClientError('INVALID_INPUT','Cần tên hiển thị (1–100 ký tự) và mật khẩu (12–256 ký tự), xác nhận khớp.')
      const version=++epoch
      await session(version,signal)
      const response=await request('/users',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({email:values.email,password:values.password,displayName:values.displayName})},signal,201)
      user(await json(response))
      assertCurrent(version,signal)
      return null // Registration never grants authentication.
    },
    async logout(signal) {
      const version=++epoch
      await session(version,signal)
      await request('/sessions/current',{method:'DELETE',headers:{'X-CSRF-Token':csrf}},signal,204)
      assertCurrent(version,signal);profile=null;csrf='';etag=''
    },
    async getProfile(signal) {
      const version=epoch, expected=profile?.id
      const response=await request('/users/me',{method:'GET'},signal), next=user(await json(response))
      assertCurrent(version,signal)
      if(expected && expected!==next.id) throw new AuthClientError('SESSION_EXPIRED','Tài khoản đã thay đổi. Vui lòng kiểm tra lại phiên.')
      profile=next;etag=response.headers.get('etag')??''
      return safeUser(next)
    },
    async updateProfile(displayName,signal) {
      if (!displayName || Array.from(displayName).length>100) throw new AuthClientError('INVALID_INPUT','Tên hiển thị cần 1–100 ký tự.')
      const expected=profile?.id
      const version=++epoch
      const verified=await session(version,signal)
      if (!verified || (expected && expected!==verified.user.id)) throw new AuthClientError('SESSION_EXPIRED','Phiên tài khoản đã thay đổi.')
      // Preserve the revision the caller read; a stale edit must receive 412.
      if (!etag) await client.getProfile!(signal)
      if(!etag) throw invalid()
      const response=await request('/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':crypto.randomUUID(),'If-Match':etag},body:JSON.stringify({displayName})},signal)
      const next=user(await json(response));assertCurrent(version,signal)
      if(next.id!==verified.user.id) throw invalid()
      profile=next;etag=response.headers.get('etag')??'';return safeUser(next)
    },
  }
  return client
}
