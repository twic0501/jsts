import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './features/auth/context/AuthProvider'
import DocumentManagement, { type ManagedDocument } from './DocumentManagement'
import {
  discardPendingReadingState, loadPendingReadingState, queueReadingState, readCurrentReadingState,
  readDocument, readingJson, ReadingRequestError, retryReadingState, type PendingReadingState, type ReadingAnchor,
} from './reading-states'
import './versioned-reader.css'

type DocumentSummary = { id: string; title: string; activeVersionId: string | null }
type Chunk = { id: string; text: string; page: number | null; ordinal: number; versionId: string }
type Page<T> = { items: T[]; nextCursor: string | null }
type Saved = Awaited<ReturnType<typeof readCurrentReadingState>>
type Draft = { pending: PendingReadingState; conflict?: { current: Saved } }
type Position = { versionId: string; chunks: Chunk[]; index: number }
type View = { document: ManagedDocument; saved: Saved; position: Position | null; oldUnavailable: boolean }
const documentsPath = '/api/v4/documents'

function versionPath(documentId: string, versionId: string) {
  return `${documentsPath}/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}`
}

async function loadPosition(documentId: string, anchor: ReadingAnchor, signal: AbortSignal): Promise<Position> {
  const path = versionPath(documentId, anchor.versionId)
  const chunks: Chunk[] = []
  let cursor: string | null = null
  do {
    const params = new URLSearchParams({ limit: '200' })
    if (cursor) params.set('cursor', cursor)
    const page: Page<Chunk> = await readingJson(`${path}/chunks?${params}`, signal)
    chunks.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)
  let index = anchor.chunkId ? chunks.findIndex(chunk => chunk.id === anchor.chunkId) : -1
  if (index < 0 && anchor.page != null) index = chunks.findIndex(chunk => chunk.page === anchor.page)
  if (index < 0) index = Math.round(anchor.progress * Math.max(0, chunks.length - 1))
  return { versionId: anchor.versionId, chunks, index }
}

function describePosition(anchor: ReadingAnchor) {
  return anchor.page == null ? `${Math.round(anchor.progress * 100)}% tiến độ` : `trang ${anchor.page}`
}

function ReaderDocument({ documentId, ownerId, onClose }: { documentId: string; ownerId: string | null; onClose: () => void }) {
  const { openLogin, getCurrentSession } = useAuth()
  const [view, setView] = useState<View | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const lifetime = useRef<AbortController | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    const request = new AbortController()
    lifetime.current = request
    async function open() {
      const saved = ownerId ? await readCurrentReadingState(documentId, request.signal) : null
      const document = await readDocument<ManagedDocument>(`${documentsPath}/${documentId}`, request.signal)
      const pending = ownerId ? await loadPendingReadingState(ownerId, documentId) : undefined
      const versionId = saved?.state.versionId ?? document.activeVersionId
      let position: Position | null = null
      let oldUnavailable = false
      if (versionId) {
        try {
          position = await loadPosition(documentId, saved?.state ?? { versionId, progress: 0 }, request.signal)
        } catch (error) {
          if (!(saved && error instanceof ReadingRequestError && error.code === 'DOCUMENT_VERSION_NOT_FOUND')) throw error
          oldUnavailable = true
        }
      }
      if (request.signal.aborted) return
      setView({ document, saved, position, oldUnavailable })
      if (pending) setDraft({ pending })
    }
    void open().catch(error => {
      if (!request.signal.aborted) {
        setStatus(error instanceof ReadingRequestError && error.status === 404 ? 'Tài liệu không còn khả dụng.' : 'Không mở được tài liệu. Hãy thử lại.')
      }
    })
    return () => request.abort()
  }, [documentId, ownerId])

  const run = useCallback(async (action: (signal: AbortSignal) => Promise<void>) => {
    const signal = lifetime.current?.signal
    if (!signal || signal.aborted || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setStatus('')
    try { await action(signal) }
    catch (error) {
      if (!signal.aborted) {
        setStatus(error instanceof ReadingRequestError && error.status === 401
          ? 'Phiên đã thay đổi. Hãy đăng nhập lại để đồng bộ.'
          : 'Chưa hoàn tất thao tác. Hãy thử lại.')
      }
    } finally {
      inFlight.current = false
      if (!signal.aborted) setBusy(false)
    }
  }, [])

  const send = useCallback(async (signal: AbortSignal) => {
    if (!ownerId || getCurrentSession()?.user.id !== ownerId) return
    const result = await retryReadingState(ownerId, documentId, signal)
    if (signal.aborted) return
    if (result.status === 'saved') {
      setDraft(null)
      try {
        const saved = await readCurrentReadingState(documentId, signal)
        if (signal.aborted) return
        // Keep the old base when another device has moved on. The next write must surface that conflict.
        if (saved?.state.revision === result.state.revision) {
          setView(current => current ? { ...current, saved } : current)
          setStatus('Đã lưu vị trí đọc.')
        } else {
          setStatus('Đã lưu vị trí. Mốc trên máy chủ đã thay đổi, hãy mở lại tài liệu để xem.')
        }
      } catch {
        if (!signal.aborted) setStatus('Đã lưu vị trí. Chưa tải được mốc mới từ máy chủ.')
      }
    } else if (result.status === 'conflict' || result.status === 'expired') {
      setDraft({ pending: result.pending, conflict: { current: result.current } })
      setStatus(result.status === 'conflict' ? 'Thiết bị khác đã lưu vị trí mới.' : 'Mốc đang chờ đã quá thời hạn gửi lại.')
    } else if (result.status === 'pending') {
      setDraft({ pending: result.pending })
      setStatus('Vị trí đang chờ đồng bộ.')
    } else {
      setDraft(null)
    }
  }, [ownerId, documentId, getCurrentSession])

  useEffect(() => {
    if (!draft || draft.conflict) return
    const reconnect = () => { void run(send) }
    window.addEventListener('online', reconnect)
    return () => window.removeEventListener('online', reconnect)
  }, [draft, run, send])

  function save() {
    if (!ownerId) { openLogin(); return }
    const position = view?.position
    const chunk = position?.chunks[position.index]
    if (!view || !position || !chunk) return
    void run(async signal => {
      const progress = position.chunks.length <= 1 ? 0 : position.index / (position.chunks.length - 1)
      const pending = await queueReadingState(ownerId, documentId,
        { versionId: position.versionId, chunkId: chunk.id, page: chunk.page, progress }, view.saved?.etag ?? null)
      if (signal.aborted) return
      setDraft({ pending })
      await send(signal)
    })
  }

  function resolve(useMine: boolean) {
    const conflict = draft?.conflict
    if (!draft || !conflict || !ownerId) return
    const { pending } = draft
    void run(async signal => {
      if (useMine) {
        const next = await queueReadingState(ownerId, documentId, pending.anchor, conflict.current?.etag ?? null, pending.key)
        if (signal.aborted) return
        setDraft({ pending: next })
        await send(signal)
      } else {
        const position = conflict.current ? await loadPosition(documentId, conflict.current.state, signal) : null
        await discardPendingReadingState(pending)
        if (signal.aborted) return
        setDraft(null)
        setView(current => current ? { ...current, saved: conflict.current, position: position ?? current.position } : current)
      }
    })
  }

  function move(delta: number) {
    setView(current => {
      const position = current?.position
      if (!current || !position) return current
      const index = Math.max(0, Math.min(position.index + delta, position.chunks.length - 1))
      return { ...current, position: { ...position, index } }
    })
  }

  function openActive() {
    if (!view) return
    void run(async signal => {
      const document = await readDocument<ManagedDocument>(`${documentsPath}/${documentId}`, signal)
      const versionId = document.activeVersionId
      if (!versionId) { setStatus('Chưa có phiên bản sẵn sàng để đọc.'); return }
      const position = await loadPosition(documentId, { versionId, progress: 0 }, signal)
      if (!signal.aborted) setView({ ...view, document, position, oldUnavailable: false })
    })
  }

  const refreshDocument = useCallback(async (signal: AbortSignal) => {
    try {
      const document = await readDocument<ManagedDocument>(`${documentsPath}/${documentId}`, signal)
      if (!signal.aborted) setView(current => current && { ...current, document })
    } catch (error) {
      if (!signal.aborted && error instanceof ReadingRequestError && error.status === 404) {
        setView(null)
        setStatus('Tài liệu không còn khả dụng.')
      }
      throw error
    }
  }, [documentId])

  const position = view?.position
  const chunk = position?.chunks[position.index]
  const historical = position && position.versionId !== view.document.activeVersionId
  return <>
    <header className="versioned-reader-header">
      <button type="button" onClick={onClose}>Về thư viện</button>
      <h2>{view?.document.title ?? 'Đọc tài liệu'}</h2>
    </header>
    {ownerId && view?.document.canManage && <DocumentManagement owner={ownerId} document={view.document}
      onRefresh={refreshDocument} onDeleted={onClose} />}
    {historical && <p>Bạn đang đọc phiên bản đã lưu.</p>}
    {view?.oldUnavailable && <p>Phiên bản đã lưu không còn khả dụng.</p>}
    {(historical || view?.oldUnavailable) && <button type="button" disabled={busy} onClick={openActive}>Đọc bản hiện hành từ đầu</button>}
    {!view && !status && <p role="status">Đang mở tài liệu…</p>}
    {view && !position && !view.oldUnavailable && <p>Chưa có phiên bản sẵn sàng để đọc.</p>}
    {position && chunk && <article aria-label="Nội dung phiên bản">
      <p>{chunk.page == null ? `Đoạn ${position.index + 1}/${position.chunks.length}` : `Trang ${chunk.page}`}</p>
      <p className="versioned-reader-text">{chunk.text}</p>
      <div className="versioned-reader-actions">
        <button type="button" onClick={() => move(-1)} disabled={position.index === 0}>Đoạn trước</button>
        <button type="button" onClick={() => move(1)} disabled={position.index >= position.chunks.length - 1}>Đoạn tiếp</button>
        <button type="button" disabled={busy || draft !== null} onClick={save}>{ownerId ? 'Lưu vị trí' : 'Đăng nhập để lưu vị trí'}</button>
      </div>
    </article>}
    {position && !chunk && <p>Phiên bản này chưa có đoạn văn bản để đọc.</p>}
    {position && <a className="versioned-reader-source" href={versionPath(documentId, position.versionId) + '/source'} target="_blank" rel="noreferrer">File nguồn của phiên bản</a>}
    {status && <p role="status">{status}</p>}
    {draft && !draft.conflict && <div className="versioned-reader-actions">
      <button type="button" disabled={busy} onClick={() => void run(send)}>Gửi lại vị trí</button>
    </div>}
    {draft?.conflict && <section aria-label="Xung đột vị trí đọc">
      <p>Vị trí trên thiết bị này ở {describePosition(draft.pending.anchor)}. {draft.conflict.current
        ? `Vị trí trên máy chủ ở ${describePosition(draft.conflict.current.state)}.`
        : 'Máy chủ chưa có vị trí đọc.'}</p>
      <div className="versioned-reader-actions">
        <button type="button" disabled={busy} onClick={() => resolve(false)}>Dùng vị trí máy chủ</button>
        <button type="button" disabled={busy} onClick={() => resolve(true)}>Lưu vị trí thiết bị này</button>
      </div>
    </section>}
  </>
}

export default function VersionedReader({ onClose }: { onClose: () => void }) {
  const { state } = useAuth()
  const ownerId = state.status === 'authenticated' ? state.session.user.id : null
  const dialog = useRef<HTMLDialogElement>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<Page<DocumentSummary> | null>(null)
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const collectionLoad = useRef<AbortController | null>(null)
  const catalogOwner = useRef<string | null>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    if (documentId) return
    const request = new AbortController()
    collectionLoad.current = request
    catalogOwner.current = ownerId
    setCatalog(null)
    setError('')
    setLoadingMore(false)
    void readingJson<Page<DocumentSummary>>(documentsPath, request.signal)
      .then(page => { if (!request.signal.aborted) setCatalog(page) })
      .catch(() => { if (!request.signal.aborted) setError('Không tải được kho tài liệu.') })
    return () => {
      request.abort()
      collectionLoad.current = null
    }
  }, [ownerId, documentId])

  async function nextPage() {
    const cursor = catalog?.nextCursor
    const signal = collectionLoad.current?.signal
    if (!cursor || !signal || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await readingJson<Page<DocumentSummary>>(`${documentsPath}?cursor=${encodeURIComponent(cursor)}`, signal)
      if (!signal.aborted) setCatalog(previous => previous?.nextCursor === cursor
        ? { items: [...previous.items, ...page.items], nextCursor: page.nextCursor }
        : previous)
    } catch {
      if (!signal.aborted) setError('Không tải được trang tiếp theo.')
    } finally {
      if (!signal.aborted) setLoadingMore(false)
    }
  }

  const visibleCatalog = catalogOwner.current === ownerId ? catalog : null
  return <dialog ref={dialog} className="versioned-reader" aria-label="Tài liệu và vị trí đọc"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="versioned-reader-body">
      <button type="button" className="versioned-reader-close" onClick={onClose}>Đóng</button>
      {documentId
        ? <ReaderDocument key={`${ownerId ?? 'guest'}:${documentId}`} ownerId={ownerId} documentId={documentId} onClose={() => setDocumentId(null)} />
        : <>
            <h2>Thư viện tài liệu</h2>
            {error && <p role="status">{error}</p>}
            {visibleCatalog ? (
              visibleCatalog.items.length ? <ul>{visibleCatalog.items.map(document => <li key={document.id}>
                <button type="button" onClick={() => setDocumentId(document.id)}>{document.title}</button>
              </li>)}</ul> : <p>Chưa có tài liệu để đọc.</p>
            ) : !error && <p role="status">Đang tải tài liệu…</p>}
            {visibleCatalog?.nextCursor && <button type="button" disabled={loadingMore} onClick={() => void nextPage()}>Tải thêm</button>}
          </>}
    </div>
  </dialog>
}
