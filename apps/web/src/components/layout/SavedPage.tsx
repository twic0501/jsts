import { useId, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowUpRight, Bookmark, BookOpen, CalendarDays, FileText,
  Layers3, Monitor, RotateCcw, Search, Trash2, X,
} from 'lucide-react'
import { GROUPS, type Paper } from '@paper-galaxy/core'
import { NO_SAVED_FILTER, filterSaved, yearBounds, type SavedFilter, type SavedSort } from '../../filters'
import './saved-page.css'
import type { BookmarkStatus } from '../../features/auth/types/bookmark.types'

type Props = {
  /** Các bài đã lưu (đã tra cứu từ danh sách id). */
  papers: Paper[]
  /** Quay về Khám phá và chọn bài trong chế độ hiển thị hiện tại. */
  onOpen: (paper: Paper) => void
  onRemove: (paper: Paper) => void
  onBack: () => void
  isMockAccount: boolean
  bookmarkBusy: ReadonlySet<string>
  bookmarkStatus: BookmarkStatus
  bookmarkMessage: string
}

const LIMITS: (number | null)[] = [null, 6, 12, 24]

function pdfUrlOf(paper: Paper): string | null {
  if (paper.provenance) return paper.provenance.pdfUrl
  return paper.sourceUrl.startsWith('https://arxiv.org/abs/')
    ? 'https://arxiv.org/pdf/' + paper.id
    : null
}

/** Thư viện cá nhân dùng cùng dữ liệu và thao tác lưu với trang Khám phá. */
export default function SavedPage({ papers, onOpen, onRemove, onBack, isMockAccount, bookmarkBusy, bookmarkStatus, bookmarkMessage }: Props) {
  const [f, setF] = useState<SavedFilter>(NO_SAVED_FILTER)
  const searchId = useId()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsId = useId()
  const years = useMemo(() => yearBounds(papers), [papers])
  const list = useMemo(() => filterSaved(papers, f), [papers, f])
  const fieldCount = useMemo(() => new Set(papers.map((paper) => paper.group)).size, [papers])
  const yearOptions = useMemo(
    () => (years ? Array.from({ length: years[1] - years[0] + 1 }, (_, i) => years[1] - i) : []),
    [years]
  )
  const filtering = f.text.trim() !== '' || f.yearMin !== null || f.yearMax !== null ||
    f.limit !== null || f.sort !== NO_SAVED_FILTER.sort
  const unavailable = bookmarkStatus === 'unavailable'
  const heading = unavailable ? 'Bookmark tài khoản chưa sẵn sàng'
    : bookmarkStatus === 'loading' ? 'Đang kiểm tra thư viện'
    : bookmarkStatus === 'error' ? 'Chưa đọc được thư viện'
    : isMockAccount ? 'Thư viện demo của tài khoản hiện tại' : bookmarkStatus==='ready'?'Thư viện tài khoản':'Khám phá với chế độ khách'

  return (
    <section className="saved-page saved-library" aria-labelledby="saved-page-title">
      <div className="saved-inner">
        <button type="button" className="saved-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />Về trang khám phá
        </button>
        <header className="saved-head">
          <div className="saved-heading-copy">
            <span className="saved-kicker"><Bookmark size={13} aria-hidden="true" /> KỆ SÁCH CÁ NHÂN</span>
            <h1 id="saved-page-title">Bài đã lưu <span>{papers.length}</span></h1>
            <p>Giữ lại bài hay và tiếp tục khám phá những ý tưởng bạn quan tâm.</p>
          </div>
          <div className="saved-local-note">
            <Monitor size={18} aria-hidden="true" />
            <div role="status" aria-live="polite"><strong>{heading}</strong><span>{bookmarkMessage || (isMockAccount ? 'Chỉ lưu trong bộ nhớ phiên này. Tải lại trang sẽ mất dữ liệu demo.' : 'Bạn có thể khám phá không cần tài khoản. Bookmark trên thiết bị vẫn được giữ riêng.')}</span></div>
          </div>
        </header>
        {papers.length > 0 && (
          <>
            <div className="saved-stats" aria-label="Tổng quan kệ sách">
              <div><BookOpen size={18} aria-hidden="true" /><strong>{papers.length}</strong><span>bài báo đã lưu</span></div>
              <div><Layers3 size={18} aria-hidden="true" /><strong>{fieldCount}</strong><span>lĩnh vực khám phá</span></div>
              {years && <div><CalendarDays size={18} aria-hidden="true" /><strong>{years[0] === years[1] ? years[0] : `${years[0]}–${years[1]}`}</strong><span>năm xuất bản</span></div>}
            </div>
            <div className="saved-toolbar" role="search" aria-label="Tìm và lọc bài đã lưu">
              <div className="saved-search">
                <span className="saved-search-icon" aria-hidden="true"><Search size={18} /></span>
                <label htmlFor={searchId} className="saved-visually-hidden">Lọc theo tên bài hoặc tác giả</label>
                <input ref={searchInputRef} id={searchId} type="search" value={f.text}
                  onChange={(e) => setF((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="Tìm tên bài hoặc tác giả…" autoComplete="off" aria-controls={resultsId} />
                {f.text && <button type="button" aria-label="Xóa nội dung lọc" title="Xóa tìm kiếm" onClick={() => {
                  setF((prev) => ({ ...prev, text: '' }))
                  searchInputRef.current?.focus()
                }}><X size={16} aria-hidden="true" /></button>}
              </div>
              <div className="saved-filter-row">
                {yearOptions.length > 1 && (
                  <>
                    <label className="saved-select">
                      <span>Từ năm</span>
                      <select aria-label="Từ năm" value={f.yearMin ?? ''} onChange={(e) => {
                        const yearMin = e.target.value === '' ? null : Number(e.target.value)
                        setF((prev) => ({ ...prev, yearMin, yearMax: yearMin !== null && prev.yearMax !== null && prev.yearMax < yearMin ? yearMin : prev.yearMax }))
                      }}>
                        <option value="">Tất cả</option>
                        {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </label>
                    <label className="saved-select">
                      <span>Đến năm</span>
                      <select aria-label="Đến năm" value={f.yearMax ?? ''} onChange={(e) => {
                        const yearMax = e.target.value === '' ? null : Number(e.target.value)
                        setF((prev) => ({ ...prev, yearMax, yearMin: yearMax !== null && prev.yearMin !== null && prev.yearMin > yearMax ? yearMax : prev.yearMin }))
                      }}>
                        <option value="">Tất cả</option>
                        {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </label>
                  </>
                )}
                <label className="saved-select">
                  <span>Hiển thị</span>
                  <select value={f.limit ?? ''} aria-label="Số bài hiển thị tối đa" onChange={(e) => setF((prev) => ({ ...prev, limit: e.target.value === '' ? null : Number(e.target.value) }))}>
                    {LIMITS.map((limit) => <option key={limit ?? 'all'} value={limit ?? ''}>{limit === null ? 'Tất cả bài' : `${limit} bài`}</option>)}
                  </select>
                </label>
                <label className="saved-select saved-sort">
                  <span>Sắp xếp</span>
                  <select aria-label="Sắp xếp" value={f.sort} onChange={(e) => setF((prev) => ({ ...prev, sort: e.target.value as SavedSort }))}>
                    <option value="year-desc">Năm mới nhất</option><option value="year-asc">Năm cũ nhất</option><option value="title">Tên A → Z</option>
                  </select>
                </label>
                {filtering && <button type="button" className="saved-clear" onClick={() => setF(NO_SAVED_FILTER)}><RotateCcw size={14} aria-hidden="true" />Đặt lại</button>}
              </div>
            </div>
          </>
        )}
        <div id={resultsId}>
          {papers.length === 0 ? (
            <div className="saved-empty">
              <span className="saved-empty-art" aria-hidden="true"><Bookmark size={36} strokeWidth={1.3} /><span>✦</span></span>
              <h2>{bookmarkStatus === 'ready' || bookmarkStatus === 'guest' ? 'Một kệ sách cho những tò mò của bạn' : heading}</h2>
              <p>{bookmarkMessage || (isMockAccount || bookmarkStatus==='ready' ? 'Khám phá một chủ đề, mở bài báo bạn yêu thích và bấm “Lưu bài báo”.' : 'Bạn vẫn có thể tìm kiếm và đọc bài báo công khai. Bookmark tài khoản cần Document Service và mapping chính thức sẵn sàng.')}</p>
              <button type="button" onClick={onBack}><Search size={16} aria-hidden="true" />Khám phá bài báo<ArrowUpRight size={16} aria-hidden="true" /></button>
              <small>{isMockAccount ? 'Bookmark demo được giữ riêng theo tài khoản trong phiên này.' : 'Bookmark cũ trên thiết bị không tự chuyển thành dữ liệu tài khoản.'}</small>
            </div>
          ) : (
            <>
              <div className="saved-results-heading">
                <p className="saved-count" role="status" aria-live="polite" aria-atomic="true">Hiển thị <strong>{list.length}</strong> trong {papers.length} bài đã lưu</p>
                <span className="saved-results-hint">Một ý tưởng cũ, một góc nhìn mới.</span>
              </div>
              {list.length === 0 ? (
                <div className="saved-empty saved-no-match">
                  <span className="saved-empty-art" aria-hidden="true"><Search size={32} strokeWidth={1.3} /></span>
                  <h2>Chưa tìm thấy bài phù hợp</h2>
                  <p>Thử một tên bài hoặc tác giả khác, hoặc đặt lại bộ lọc để xem toàn bộ kệ sách.</p>
                  <button type="button" onClick={() => setF(NO_SAVED_FILTER)}><RotateCcw size={16} aria-hidden="true" />Xem tất cả bài đã lưu</button>
                </div>
              ) : (
                <div className="saved-grid">
                  {list.map((paper) => {
                    const pdf = pdfUrlOf(paper)
                    return (
                      <article className="saved-card" key={paper.id} data-paper-id={paper.id}>
                        <div className="saved-meta"><span><i style={{ background: GROUPS[paper.group].color }} aria-hidden="true" />{GROUPS[paper.group].label}</span><span>{paper.year}</span></div>
                        <h2><button type="button" onClick={() => onOpen(paper)}>{paper.title}</button></h2>
                        <p className="saved-authors" title={paper.authors.join(', ')}>{paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ` và ${paper.authors.length - 3} tác giả khác` : ''}</p>
                        <p className="saved-summary">{paper.summary}</p>
                        <div className="saved-actions">
                          <button type="button" className="primary" onClick={() => onOpen(paper)} aria-label={`Mở bài báo: ${paper.title}`}><BookOpen size={15} aria-hidden="true" />Mở bài báo<ArrowUpRight size={14} aria-hidden="true" /></button>
                          <a href={pdf ?? paper.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${pdf ? 'Mở PDF' : 'Mở trang gốc'}: ${paper.title} (tab mới)`}><FileText size={14} aria-hidden="true" />{pdf ? 'PDF' : 'Nguồn'}<ArrowUpRight size={12} aria-hidden="true" /></a>
                          <button type="button" className="danger" onClick={() => onRemove(paper)} disabled={bookmarkBusy.has(paper.id)} aria-busy={bookmarkBusy.has(paper.id)} aria-label={`Bỏ lưu ${paper.title}`} title="Bỏ lưu bài báo"><Trash2 size={15} aria-hidden="true" /><span className="saved-visually-hidden">Bỏ lưu</span></button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <p className="saved-storage-footnote"><Monitor size={13} aria-hidden="true" />{isMockAccount ? 'Bookmark demo không đồng bộ lên tài khoản thật và sẽ mất khi tải lại trang. Bookmark cũ trong IndexedDB được giữ riêng, không tự nhập vào thư viện demo.' : 'Bookmark trên thiết bị được giữ riêng trong IndexedDB, không tự đồng bộ hoặc gán cho tài khoản. Đăng xuất không xóa dữ liệu này.'}</p>
      </div>
    </section>
  )
}
