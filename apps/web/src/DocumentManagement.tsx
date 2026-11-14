import { useEffect, useRef, useState } from 'react'
import { readingJson, ReadingRequestError, writeDocument } from './reading-states'

const subjectNames = { ai: 'AI', biology: 'Sinh học', medicine: 'Y học', physics: 'Vật lý' }
type Subject = keyof typeof subjectNames
export type ManagedDocument = {
  id: string; title: string; revision: number; activeVersionId: string | null
  subjects: Subject[]; primarySubject: Subject | null; canManage: boolean
}
type Job = { status: 'queued' | 'running' | 'succeeded' | 'failed'; stage: string; error: { message: string } | null }
const stages: Record<string, string> = {
  queued: 'Đang chờ xử lý', running: 'Đang xử lý', extracting: 'Đang trích văn bản',
  chunking: 'Đang chia đoạn', embedding: 'Đang tạo vector', indexing: 'Đang lập chỉ mục',
}
type Intent = { url: string; init: RequestInit }

export default function DocumentManagement({ owner, document, onRefresh, onDeleted }: {
  owner: string; document: ManagedDocument; onRefresh: (signal: AbortSignal) => Promise<void>; onDeleted: () => void
}) {
  const [title, setTitle] = useState(document.title)
  const [subjects, setSubjects] = useState(document.subjects)
  const [primary, setPrimary] = useState<Subject | null>(document.primarySubject)
  const [file, setFile] = useState<File | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const request = useRef<AbortController | null>(null)
  const documentUrl = '/api/v4/documents/' + encodeURIComponent(document.id)

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (!jobId) return
    const controller = new AbortController()
    let timer: number | undefined
    let delay = 750
    async function poll() {
      try {
        const result = await readingJson<Job>('/api/v4/jobs/' + encodeURIComponent(jobId!), controller.signal)
        if (controller.signal.aborted) return
        setJob(result)
        if (result.status === 'succeeded') {
          await onRefresh(controller.signal)
          return
        }
        if (result.status === 'failed') return
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof ReadingRequestError && [401, 403, 404].includes(error.status)) {
          setJob(null)
          setMessage('Không còn truy cập được tác vụ thay file.')
          return
        }
      }
      if (!controller.signal.aborted) {
        timer = window.setTimeout(() => void poll(), delay)
        delay = Math.min(delay * 2, 5000)
      }
    }
    void poll()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [jobId, onRefresh])

  async function send(next: Intent) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setIntent(next)
    setBusy(true)
    setMessage('')
    try {
      const response = await writeDocument(owner, next.url, next.init, controller.signal)
      if (controller.signal.aborted) return
      if (response.status === 204) {
        onDeleted()
        return
      }
      if (response.status === 201) {
        const created = await response.json() as { jobId: string }
        if (controller.signal.aborted) return
        setJob({ status: 'queued', stage: 'queued', error: null })
        setJobId(created.jobId)
        setFile(null)
      } else {
        setMessage('Đã lưu thông tin tài liệu.')
      }
      setIntent(null)
      await onRefresh(controller.signal).catch(() => {
        if (!controller.signal.aborted) setMessage('Đã nhận kết quả. Hãy mở lại tài liệu để tải trạng thái mới.')
      })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ReadingRequestError && (error.status === 412 || error.code === 'DOCUMENT_REVISION_MISMATCH')) {
        setIntent(null)
        setMessage('Tài liệu đã thay đổi. Kiểm tra thông tin mới trước khi gửi lại.')
        await onRefresh(controller.signal).catch(() => undefined)
      } else if (error instanceof ReadingRequestError && error.status < 500 && error.status !== 429) {
        setIntent(null)
        setMessage(error.status === 422 ? 'Kiểm tra tên, nhãn chính hoặc nội dung file.' : 'Yêu cầu bị từ chối. Kiểm tra phiên, quyền hoặc định dạng file.')
      } else {
        setMessage('Chưa nhận được kết quả. Gửi lại để dùng cùng yêu cầu.')
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function start(method: 'PATCH' | 'POST' | 'DELETE', body?: BodyInit) {
    const key = crypto.randomUUID()
    const headers = new Headers({ 'Idempotency-Key': key })
    if (method !== 'POST') headers.set('If-Match', `"${document.revision}"`)
    if (method === 'PATCH') headers.set('Content-Type', 'application/json')
    void send({ url: method === 'POST' ? documentUrl + '/versions' : documentUrl, init: { method, headers, ...(body !== undefined && { body }) } })
  }

  function toggleSubject(subject: Subject) {
    setSubjects(previous => previous.includes(subject) ? previous.filter(value => value !== subject) : [...previous, subject])
    if (subjects.includes(subject) && primary === subject) setPrimary(null)
  }

  const blocked = busy || intent !== null
  return <details>
    <summary>Quản lý tài liệu</summary>
    <form onSubmit={event => {
      event.preventDefault()
      start('PATCH', JSON.stringify({ title, subjects, primarySubject: primary }))
    }}>
      <fieldset disabled={blocked}>
        <legend>Thông tin tài liệu</legend>
        <label>Tên tài liệu <input required maxLength={1000} value={title} onChange={event => setTitle(event.target.value)} /></label>
        <fieldset><legend>Nhãn</legend>
          {Object.entries(subjectNames).map(([key, name]) => <label key={key}>
            <input type="checkbox" checked={subjects.includes(key as Subject)} onChange={() => toggleSubject(key as Subject)} /> {name}
          </label>)}
        </fieldset>
        <label>Nhãn chính <select value={primary ?? ''} onChange={event => setPrimary((event.target.value || null) as Subject | null)}>
          <option value="">Không chọn</option>
          {subjects.map(subject => <option key={subject} value={subject}>{subjectNames[subject]}</option>)}
        </select></label>
        <button type="submit">Lưu thông tin</button>
      </fieldset>
    </form>
    <div className="versioned-reader-actions">
      <label>File thay thế <input type="file" accept=".pdf,.txt,.md" disabled={blocked} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <button type="button" disabled={blocked || !file} onClick={() => {
        if (!file) return
        const form = new FormData()
        form.set('baseDocumentRevision', String(document.revision))
        form.set('clientVersionId', crypto.randomUUID())
        form.set('file', file)
        start('POST', form)
      }}>Thay file</button>
    </div>
    {job && <p role="status">{job.status === 'succeeded' ? 'Phiên bản mới đã sẵn sàng.'
      : job.status === 'failed' ? job.error?.message ?? 'Không thể thay file.'
      : stages[job.stage] ?? 'Đang xử lý'}</p>}
    <div className="versioned-reader-actions">
      {confirmDelete ? <>
        <span>Xóa tài liệu và tất cả phiên bản?</span>
        <button type="button" disabled={blocked} onClick={() => start('DELETE')}>Xác nhận xóa</button>
        <button type="button" onClick={() => setConfirmDelete(false)}>Hủy</button>
      </> : <button type="button" disabled={blocked} onClick={() => setConfirmDelete(true)}>Xóa tài liệu</button>}
    </div>
    {message && <p role="status">{message}</p>}
    {intent && !busy && <button type="button" onClick={() => void send(intent)}>Gửi lại yêu cầu</button>}
  </details>
}
