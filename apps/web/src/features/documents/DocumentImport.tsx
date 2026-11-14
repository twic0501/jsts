import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FileUp } from 'lucide-react'
import { deleteDocument, importDocument, listDocuments, type ImportedDocument } from './library'
import './documents.css'

const PREVIEW_LIMIT = 64_000

export default function DocumentImport() {
  const [documents, setDocuments] = useState<ImportedDocument[]>([])
  const [selected, setSelected] = useState<ImportedDocument | null>(null)
  const [progress, setProgress] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const busy = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    listDocuments()
      .then((saved) => { if (active) setDocuments(saved) })
      .catch(() => { if (active) setError('Không mở được thư viện trên trình duyệt này.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || busy.current) return

    busy.current = true
    setError('')
    setStatus('')
    setProgress('Đang đọc và kiểm tra tệp…')
    try {
      const result = await importDocument(file, () => setProgress('Đang kiểm tra dung lượng và lưu…'))
      setDocuments((saved) => saved.some((item) => item.id === result.document.id)
        ? saved
        : [result.document, ...saved])
      setSelected(result.document)
      setStatus(result.duplicate
        ? 'Tài liệu này đã có trong thư viện. Bản đã nhập được mở bên dưới.'
        : 'Đã nhập tài liệu và lưu riêng tư.')
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'QuotaExceededError'
        ? 'Trình duyệt đã hết dung lượng. Hãy xóa tài liệu hoặc giải phóng bộ nhớ.'
        : cause instanceof Error && !(cause instanceof DOMException)
          ? cause.message
          : 'Không lưu được tài liệu trên trình duyệt này.')
    } finally {
      setProgress('')
      busy.current = false
    }
  }

  async function remove(document: ImportedDocument) {
    if (busy.current) return
    busy.current = true
    setProgress('Đang xóa tài liệu…')
    setError('')
    setStatus('')
    try {
      await deleteDocument(document.id)
      setDocuments((saved) => saved.filter((item) => item.id !== document.id))
      setSelected((current) => current?.id === document.id ? null : current)
      setStatus('Đã xóa tài liệu.')
    } catch {
      setError('Không xóa được tài liệu. Hãy thử lại.')
    } finally {
      setProgress('')
      busy.current = false
    }
  }

  return (
    <>
      <button className="scene-icon document-import-trigger" type="button"
        aria-label="Nhập tài liệu" title="Nhập tài liệu" aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}>
        <FileUp aria-hidden="true" size={17} />
      </button>
      <dialog ref={dialog} className="document-import" aria-labelledby="document-import-title">
      <button className="document-import-close" type="button" onClick={() => dialog.current?.close()}>
        Đóng
      </button>
      <h2 id="document-import-title"><FileUp aria-hidden="true" size={20} /> Nhập tài liệu</h2>
      <p id="document-import-limits">
        Tệp .txt hoặc .md (UTF-8), tối đa 5 MiB mỗi tệp và 20 MiB cho thư viện.
        Tài liệu chỉ lưu trên trình duyệt này.
      </p>
      <input
        type="file"
        aria-label="Chọn tài liệu"
        aria-describedby="document-import-limits"
        accept=".txt,.md"
        disabled={loading || Boolean(progress)}
        onChange={chooseFile}
      />
      <div role="status">{loading ? 'Đang mở thư viện…' : progress || status}</div>
      {error && <p className="document-import-error" role="alert">{error}</p>}
      {documents.length > 0 && (
        <ul aria-label="Tài liệu đã nhập">
          {documents.map((document) => (
            <li key={document.id}>
              <button type="button" onClick={() => setSelected(document)}>{document.name}</button>
              <span>Riêng tư</span>
              <button type="button" disabled={Boolean(progress)} onClick={() => void remove(document)}
                aria-label={`Xóa ${document.name}`}>Xóa</button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <article className="document-import-preview" aria-label="Nội dung tài liệu">
          <h3>{selected.name}</h3>
          <pre tabIndex={0}>{selected.text.slice(0, PREVIEW_LIMIT)}</pre>
          {selected.text.length > PREVIEW_LIMIT && <p>Đang xem 64.000 ký tự đầu của tài liệu.</p>}
        </article>
      )}
      </dialog>
    </>
  )
}
