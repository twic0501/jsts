import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import AuthModal from '../components/AuthModal'
import { getAuthClient, mockAuthEnabled } from '../services/auth-client'
import { createAuthEvents } from '../services/auth-events'
import { AuthClientError, type AuthActionResult, type AuthClient, type AuthCredentials, type AuthRegistration, type AuthSession, type AuthState } from '../types/auth.types'

interface AuthenticationRequest {
  message: string
  onAuthenticated: (session: AuthSession, signal: AbortSignal) => Promise<void>
}

interface AuthContextValue {
  state: AuthState
  isMock: boolean
  busy: boolean
  notice: string
  dismissNotice: () => void
  openLogin: () => void
  requestLogin: (request: AuthenticationRequest) => void
  getCurrentSession: () => AuthSession | null
  login: (values: AuthCredentials) => Promise<AuthActionResult>
  register: (values: AuthRegistration) => Promise<AuthActionResult>
  logout: () => Promise<AuthActionResult>
  getProfile: () => Promise<AuthActionResult>
  updateProfile: (displayName: string) => Promise<AuthActionResult>
  refreshSession: () => Promise<AuthActionResult>
}
const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null })
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [purpose, setPurpose] = useState('')
  const operation = useRef<AbortController | null>(null)
  const bootstrap = useRef<AbortController | null>(null)
  const currentSession = useRef<AuthSession | null>(null)
  const pending = useRef<AuthenticationRequest | null>(null)
  const dialogOpen = useRef(false)
  const events = useRef<ReturnType<typeof createAuthEvents> | null>(null)
  const refreshPending = useRef(false)
  const refreshAction = useRef<() => void>(()=>{})
  const getCurrentSession = useCallback(() => currentSession.current, [])
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    bootstrap.current=abort
    void getAuthClient().then((client) => client.getSession(abort.signal)).then((session) => {
      if (!abort.signal.aborted) {
        currentSession.current = session
        setState(session ? { status: 'authenticated', session } : { status: 'guest', session: null })
      }
    }).catch(() => {
      if (!abort.signal.aborted) { setState({ status: 'error', session: null }); setNotice('Không kiểm tra được phiên đăng nhập. Bạn vẫn có thể khám phá công khai.') }
    })
    return () => { mounted.current = false; abort.abort(); operation.current?.abort(); pending.current = null }
  }, [])

  function close() {
    pending.current = null
    dialogOpen.current = false
    operation.current?.abort()
    operation.current = null
    setBusy(false)
    setOpen(false)
    setError('')
  }
  function openLogin() {
    if (dialogOpen.current || operation.current) return
    pending.current = null
    dialogOpen.current = true
    setPurpose('')
    setError('')
    setNotice('')
    setOpen(true)
  }
  function requestLogin(request: AuthenticationRequest) {
    // First intent wins. The native modal prevents further background clicks.
    if (dialogOpen.current || operation.current) return
    pending.current = request
    dialogOpen.current = true
    setPurpose(request.message)
    setError('')
    setNotice('')
    setOpen(true)
  }
  async function finishAuthentication(session: AuthSession, signal: AbortSignal, message: string) {
    if (signal.aborted || !mounted.current) return
    currentSession.current = session
    setState({ status: 'authenticated', session })
    dialogOpen.current = false
    setOpen(false)
    setNotice(message)
    // Consume before awaiting; StrictMode and rerenders cannot replay this callback.
    const intent = pending.current
    pending.current = null
    if (intent && !signal.aborted) {
      try { await intent.onAuthenticated(session, signal) }
      catch { if(!signal.aborted && mounted.current)setNotice('Đã đăng nhập. Thao tác đang chờ chưa hoàn tất; vui lòng thử lại.') }
    }
  }
  async function run(action: (client: AuthClient, signal: AbortSignal) => Promise<void>): Promise<AuthActionResult> {
    if(!mounted.current)return {ok:false,code:'CANCELLED'}
    if (operation.current) return {ok:false,code:'BUSY'}
    const abort = new AbortController()
    operation.current = abort
    bootstrap.current?.abort()
    setBusy(true)
    setError('')
    try {
      const client = await getAuthClient()
      if (!abort.signal.aborted) await action(client, abort.signal)
      return abort.signal.aborted ? {ok:false,code:'CANCELLED'} : {ok:true}
    } catch (failure) {
      if (!abort.signal.aborted && mounted.current) {
        if (!(failure instanceof AuthClientError) || failure.code==='SESSION_EXPIRED'||failure.code==='UNAVAILABLE') {
          currentSession.current=null;pending.current=null
          setState({status:failure instanceof AuthClientError && failure.code==='SESSION_EXPIRED'?'guest':'error',session:null})
        }
        const message = failure instanceof AuthClientError ? failure.message : 'Chưa thực hiện được thao tác tài khoản. Bạn thử lại nhé.'
        setError(message)
        setNotice(message)
      }
      return abort.signal.aborted ? {ok:false,code:'CANCELLED'} : failure instanceof AuthClientError
        ? {ok:false,code:failure.code,...(failure.retryAfterSeconds===undefined?{}:{retryAfterSeconds:failure.retryAfterSeconds})}
        : {ok:false,code:'UNAVAILABLE'}
    } finally {
      if (operation.current === abort) {
        operation.current = null
        if (mounted.current) setBusy(false)
        if (mounted.current && refreshPending.current) { refreshPending.current=false; queueMicrotask(()=>refreshAction.current()) }
      }
    }
  }
  const login = (values: AuthCredentials) => run(async (client, signal) => {
    const session = await client.login(values, signal)
    if(currentSession.current?.user.id && currentSession.current.user.id!==session.user.id) pending.current=null
    await finishAuthentication(session, signal, session.source==='mock' ? `${session.user.displayName}: Đã đăng nhập demo. Đây không phải phiên đăng nhập Backend.` : `Đã đăng nhập: ${session.user.displayName}.`)
    if(!signal.aborted && session.source==='backend')events.current?.publish()
  })
  const register = (values: AuthRegistration) => run(async (client, signal) => {
    const session = await client.register(values, signal)
    if (!session) {
      if (signal.aborted || !mounted.current) return
      setNotice('Đã tạo tài khoản. Vui lòng chuyển sang Đăng nhập; đăng ký không tự tạo phiên.')
      pending.current=null;dialogOpen.current=false;setOpen(false)
      return
    }
    await finishAuthentication(session, signal, 'Đã tạo và đăng nhập tài khoản demo. Tài khoản chỉ tồn tại trong phiên mô phỏng này.')
  })
  const logout = () => run(async (client, signal) => {
    pending.current = null
    await client.logout(signal)
    if (signal.aborted || !mounted.current) return
    currentSession.current = null
    setState({ status: 'guest', session: null })
    if(!mockAuthEnabled)events.current?.publish()
    setNotice(mockAuthEnabled?'Đã đăng xuất demo. Bookmark demo được giữ riêng trong phiên này; bookmark cũ trên thiết bị không thay đổi.':'Đã đăng xuất. Backend đã xác nhận thu hồi phiên; bookmark trên thiết bị vẫn được giữ nguyên.')
  })
  const refreshSession = () => run(async(client,signal)=>{
    const session=await client.getSession(signal)
    if(signal.aborted||!mounted.current)return
    if(currentSession.current?.user.id!==session?.user.id)pending.current=null
    currentSession.current=session;setState(session?{status:'authenticated',session}:{status:'guest',session:null})
  })
  const profileAction = (displayName?:string) => run(async(client,signal)=>{
    const previous=currentSession.current
    if(!previous || !client.getProfile || !client.updateProfile) throw new AuthClientError('UNAVAILABLE','Hồ sơ thật chưa khả dụng trong chế độ này.')
    const user=displayName===undefined?await client.getProfile(signal):await client.updateProfile(displayName,signal)
    if(signal.aborted||!mounted.current)return
    if(previous.user.id!==user.id)throw new AuthClientError('SESSION_EXPIRED','Tài khoản đã thay đổi.')
    const session={...previous,user};currentSession.current=session;setState({status:'authenticated',session})
    if(displayName!==undefined && session.source==='backend')events.current?.publish()
  })
  refreshAction.current=()=>{void refreshSession()}
  useEffect(()=>{
    if(mockAuthEnabled)return
    const bus=createAuthEvents(()=>{
      if(!mounted.current)return
      pending.current=null;bootstrap.current?.abort();operation.current?.abort();operation.current=null
      currentSession.current=null;setBusy(false);setState({status:'loading',session:null})
      dialogOpen.current=false;setOpen(false);setError('')
      refreshAction.current()
    })
    events.current=bus
    return()=>{bus.close();events.current=null}
  },[])
  useEffect(()=>{
    const refresh=()=>{ if(!operation.current) void refreshSession(); else refreshPending.current=true }
    const visible=()=>{if(document.visibilityState==='visible')refresh()}
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible)
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}
  },[])
  useEffect(()=>{
    if(state.status!=='authenticated'||!state.session.expiresAt)return
    let timer:number
    const check=()=>{if(operation.current){timer=window.setTimeout(check,500);return} void refreshSession()}
    timer=window.setTimeout(check,Math.min(2_147_483_647,Math.max(0,Date.parse(state.session.expiresAt)-Date.now()+50)))
    return()=>window.clearTimeout(timer)
  },[state])

  return (
    <AuthContext.Provider value={{ state, isMock: mockAuthEnabled, busy, notice, dismissNotice: () => setNotice(''), openLogin, requestLogin, getCurrentSession, login, register, logout, refreshSession, getProfile:()=>profileAction(), updateProfile:name=>profileAction(name) }}>
      {children}
      <AuthModal isOpen={open} realAuth={!mockAuthEnabled} onClose={close} onLogin={async values=>{await login(values)}} onRegister={async values=>{await register(values)}}
        onModeChange={() => setError('')}
        isLoading={busy || state.status === 'loading'} error={error}
        message={`${purpose ? `${purpose} ` : ''}${mockAuthEnabled ? 'Chế độ demo: tài khoản và bookmark chỉ tồn tại trong bộ nhớ, mất khi tải lại trang. Không tạo tài khoản thật hoặc cấp quyền Backend.' : 'Tài khoản được xác minh bởi Backend. Bạn vẫn có thể khám phá công khai khi chưa đăng nhập. Lưu bài vào tài khoản cần Document và mapping chính thức sẵn sàng.'}`} />
    </AuthContext.Provider>
  )
}
