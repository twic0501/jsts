import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getBookmarkClient } from '../services/bookmark-client'
import { BookmarkClientError, type BookmarkStatus } from '../types/bookmark.types'
import type { AuthSession } from '../../auth/types/auth.types'
import { useAuth } from '../../auth/context/AuthProvider'

const EMPTY_IDS: string[] = []
interface WriteOperation { session: AuthSession; paperId: string; abort: AbortController }

/** One gate for all bookmark controls. No legacy IndexedDB reads or writes. */
export function useBookmarks(onNotice: (message: string) => void) {
  const auth = useAuth()
  const session = auth.state.status === 'authenticated' ? auth.state.session : null
  const [snapshot, setSnapshot] = useState<{ session: AuthSession | null; ids: string[] }>({ session: null, ids: EMPTY_IDS })
  const [revision, setRevision] = useState(0)
  const [load, setLoad] = useState<{ session: AuthSession | null; status: 'loading' | 'ready' | 'unavailable' | 'error'; message: string }>({ session: null, status: 'loading', message: '' })
  const writes = useRef(new Map<string, WriteOperation>())
  const epoch = useRef(0)
  const mounted = useRef(false)
  const { getCurrentSession } = auth
  const saved = session && snapshot.session === session ? snapshot.ids : EMPTY_IDS
  const busyIds = useMemo(() => new Set([...writes.current.values()]
    .filter(entry => entry.session === session).map(entry => entry.paperId)), [session, revision])

  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; writes.current.forEach(entry => entry.abort.abort()) }
  }, [])
  useLayoutEffect(() => {
    // Abort previous-account writes without discarding that account's stored bookmarks.
    writes.current.forEach(entry => { if (entry.session !== session) entry.abort.abort() })
  }, [session])
  useEffect(() => {
    const abort = new AbortController()
    const version = epoch.current
    if (session) {
      setLoad({ session, status: 'loading', message: session.source==='mock'?'Đang đọc bookmark demo…':'Đang đọc bookmark tài khoản…' })
      void getBookmarkClient().then(client => client.list(session, abort.signal)).then(ids => {
        if (!abort.signal.aborted && getCurrentSession() === session && epoch.current === version) {
          setSnapshot({ session, ids })
          setLoad({ session, status: 'ready', message: '' })
        }
      }).catch(failure => {
        if (!abort.signal.aborted && getCurrentSession() === session) {
          const message = failure instanceof BookmarkClientError ? failure.message : 'Chưa đọc được bookmark của phiên này.'
          setLoad({ session, status: failure instanceof BookmarkClientError && ['MAPPING_UNAVAILABLE','DEPENDENCY_UNAVAILABLE'].includes(failure.code)?'unavailable':'error', message }); onNotice(message)
          if(failure instanceof BookmarkClientError&&failure.code==='SESSION_EXPIRED')void auth.refreshSession()
        }
      })
    } else {
      setSnapshot({ session: null, ids: EMPTY_IDS })
      setLoad({ session: null, status: 'ready', message: '' })
      void getBookmarkClient().then(client=>{if(!getCurrentSession())client.reset?.()})
    }
    return () => abort.abort()
  }, [session, getCurrentSession, onNotice])

  async function write(owner: AuthSession, paperId: string, next: boolean, parentSignal?: AbortSignal) {
    const key = JSON.stringify([owner.user.id, paperId])
    if (!mounted.current || parentSignal?.aborted || getCurrentSession() !== owner || writes.current.has(key)) return
    const abort = new AbortController()
    const cancel = () => abort.abort()
    parentSignal?.addEventListener('abort', cancel, { once: true })
    const entry = { session: owner, paperId, abort }
    writes.current.set(key, entry)
    epoch.current++
    setRevision(value => value + 1)
    const isCurrent = () => mounted.current && !abort.signal.aborted && getCurrentSession() === owner
    try {
      const client = await getBookmarkClient()
      if (!isCurrent()) return
      // Seed existing account data before the first mutation, including login continuation.
      const previous = await client.list(owner, abort.signal)
      if (!isCurrent()) return
      setSnapshot(value => value.session === owner ? value : { session: owner, ids: previous })
      setLoad({ session: owner, status: 'ready', message: '' })
      if (next) await client.save(owner, paperId, abort.signal)
      else await client.remove(owner, paperId, abort.signal)
      if (!isCurrent()) return
      epoch.current++ // Ignore a list response started before this write completed.
      setSnapshot(value => {
        const ids = new Set(value.session === owner ? value.ids : previous)
        if (next) ids.add(paperId)
        else ids.delete(paperId)
        return { session: owner, ids: [...ids] }
      })
      setLoad({ session: owner, status: 'ready', message: '' })
      onNotice(owner.source==='mock'?(next ? 'Đã lưu bài vào thư viện demo. Dữ liệu sẽ mất khi tải lại trang.' : 'Đã bỏ lưu bài khỏi thư viện demo.'):(next?'Đã lưu bài vào tài khoản.':'Đã bỏ lưu bài khỏi tài khoản.'))
    } catch (failure) {
      if (isCurrent()) {
        const message = failure instanceof BookmarkClientError ? failure.message : 'Chưa cập nhật được bookmark demo. Bạn thử lại nhé.'
        setLoad({ session: owner, status: failure instanceof BookmarkClientError&&['MAPPING_UNAVAILABLE','DEPENDENCY_UNAVAILABLE'].includes(failure.code)?'unavailable':'error', message }); onNotice(message)
        if(failure instanceof BookmarkClientError&&failure.code==='SESSION_EXPIRED')void auth.refreshSession()
      }
    } finally {
      parentSignal?.removeEventListener('abort', cancel)
      if (writes.current.get(key) === entry) {
        writes.current.delete(key)
        if (mounted.current) setRevision(value => value + 1)
      }
    }
  }

  function setSaved(paperId: string, next: boolean) {
    if (auth.busy) return
    const owner = getCurrentSession()
    if (!owner) {
      if (!next) return
      const intent = { paperId, action: 'save' as const }
      auth.requestLogin({
        message: 'Đăng nhập để lưu bài viết này vào thư viện của bạn.',
        onAuthenticated: (authenticated, signal) => write(authenticated, intent.paperId, intent.action === 'save', signal),
      })
      return
    }
    void write(owner, paperId, next)
  }

  const status: BookmarkStatus = auth.state.status === 'loading' ? 'loading'
    : auth.state.status === 'error' ? 'error'
    : !session ? 'guest'
    : load.session === session ? load.status : 'loading'
  const message = status === 'error' && auth.state.status === 'error' ? 'Chưa xác minh được phiên tài khoản. Bookmark trên thiết bị vẫn được giữ nguyên.'
    : status === 'loading' ? 'Đang kiểm tra thư viện…'
    : load.session === session ? load.message : ''
  return { saved, busyIds, setSaved, status, message, isMockAccount: session?.source === 'mock' }
}
