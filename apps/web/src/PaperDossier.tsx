import type { CSSProperties } from 'react'
import {
  BookOpen,
  Bookmark,
  ArrowUpRight,
  ChevronDown,
  Copy,
  FileText,
  Link2,
  X,
} from 'lucide-react'
import { GROUPS, type Paper, type SearchHit } from '@paper-galaxy/core'
import { similarityTone } from './scene/ritual'
export function paperSource(paper: Paper) {
  return paper.provenance?.provider === 'openalex' ? 'OpenAlex' : 'arXiv'
}
export function paperCitation(paper: Paper) {
  return `${paper.authors.join(', ')} (${paper.year}). ${paper.title}. ${paper.sourceUrl}`
}
export default function PaperDossier({
  paper,
  saved,
  onSave,
  onSelect,
  neighbors,
  onNotice,
  score,
  onOpenBook,
  onClose,
}: {
  paper: Paper
  saved: boolean
  onSave: () => void
  onSelect: (paper: Paper) => void
  neighbors: SearchHit[]
  onNotice: (message: string) => void
  score?: number | null
  onOpenBook?: () => void
  onClose?: () => void
}) {
  const hasAbstract = paper.provenance?.abstractAvailable !== false,
    words = hasAbstract ? paper.abstract.trim().split(/\s+/).length : 0,
    source = paperSource(paper),
    pdfUrl =
      paper.provenance?.pdfUrl ??
      (paper.sourceUrl.startsWith('https://arxiv.org/abs/')
        ? 'https://arxiv.org/pdf/' + paper.id
        : null)
  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(paperCitation(paper))
      onNotice('Đã sao chép trích dẫn: tác giả, năm, tên bài và link nguồn.')
    } catch {
      onNotice('Trình duyệt chưa cho phép sao chép. Bạn có thể mở link nguồn bên dưới.')
    }
  }
  return (
    <div className="research-dossier">
      <div className="detail-heading">
        <span className="detail-label">
          <BookOpen size={14} /> RESEARCH DOSSIER
        </span>
        <span className="detail-actions">
          {onOpenBook && (
            <button className="detail-save" onClick={onOpenBook}>
              <BookOpen size={14} />
              Mở trong sách 3D
            </button>
          )}
          <button className={`detail-save ${saved ? 'saved' : ''}`} onClick={onSave}>
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Đã lưu' : 'Lưu bài báo'}
          </button>
          {onClose && (
            <button className="detail-save" onClick={onClose} aria-label="Đóng bảng thông tin">
              <X size={14} />
            </button>
          )}
        </span>
      </div>
      <div
        className="dossier-cover"
        style={{ '--field-color': GROUPS[paper.group].color } as CSSProperties}
      >
        <span className="dossier-category">
          <i />
          {GROUPS[paper.group].label}
        </span>
        <span className="dossier-year">{paper.year}</span>
        <span className="dossier-cover-label">MỘT NGHIÊN CỨU. MỘT GÓC NHÌN.</span>
        <h2>{paper.title}</h2>
        <p className="dossier-authors">
          {paper.authors.slice(0, 4).join(' · ')}
          {paper.authors.length > 4 ? ` · và ${paper.authors.length - 4} tác giả khác` : ''}
        </p>
        <div className="dossier-cover-foot">
          <span>{source}</span>
          <span>{paper.id}</span>
        </div>
      </div>
      <div className="dossier-facts">
        {score != null && Number.isFinite(score) && (
          <div>
            <span>ĐỘ TƯƠNG ĐỒNG VỚI CÂU HỎI</span>
            <strong>
              <i
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  marginRight: 7,
                  background: similarityTone(score).color,
                }}
              />
              cos {score.toFixed(3)} · {similarityTone(score).label}
            </strong>
          </div>
        )}
        <div>
          <span>ĐANG XEM</span>
          <strong>Hồ sơ & tóm tắt</strong>
        </div>
        <div>
          <span>DỮ LIỆU NGUỒN</span>
          <strong>{hasAbstract ? `${words} từ abstract` : 'Chỉ có tiêu đề'}</strong>
        </div>
      </div>
      <div className="dossier-explainer">
        <FileText size={16} />
        <p>
          Các trang trong sách được chia từ metadata và abstract.{' '}
          <strong>Đây chưa phải toàn bộ bài báo.</strong> Số trang thay đổi theo nội dung.
        </p>
      </div>
      <section className="dossier-note">
        <span className="dossier-section-number">01</span>
        <div>
          <h3>{paper.provenance ? 'Nhìn nhanh vào nội dung' : 'Ghi chú để bắt đầu'}</h3>
          <p className="detail-summary">{paper.summary}</p>
          <small>
            {paper.provenance
              ? hasAbstract
                ? 'Trích từ abstract của nguồn; không phải kết luận do AI tạo.'
                : 'Nguồn chưa cung cấp abstract; đây là thông báo về dữ liệu.'
              : 'Ghi chú tiếng Việt của bộ dữ liệu; xem abstract gốc để đối chiếu.'}
          </small>
        </div>
      </section>
      <details className="dossier-abstract">
        <summary>
          <span>
            <span className="dossier-section-number">02</span>Đọc tóm tắt gốc
          </span>
          <ChevronDown size={15} />
        </summary>
        {hasAbstract ? (
          <p className="abstract">{paper.abstract}</p>
        ) : (
          <p className="abstract">
            Nguồn chưa cung cấp abstract. Điểm tìm kiếm bài này được tính từ tiêu đề; mở bài gốc để
            đọc thêm.
          </p>
        )}
      </details>
      <section className="dossier-fulltext" aria-label="Đọc bài đầy đủ">
        <span className="dossier-section-number">03</span>
        <div>
          <h3>Đi tiếp đến toàn văn</h3>
          <p>
            {pdfUrl
              ? 'Nguồn có liên kết PDF. Mở tài liệu gốc để đọc đầy đủ các trang, hình và công thức.'
              : 'Mở trang nguồn để kiểm tra toàn văn, các hình và công thức. Một số bài cần quyền truy cập của nhà xuất bản.'}
          </p>
          <div className="dossier-source-actions">
            {pdfUrl && (
              <a className="dossier-pdf" href={pdfUrl} target="_blank" rel="noreferrer">
                <FileText size={14} />
                Đọc PDF đầy đủ
                <ArrowUpRight size={13} />
              </a>
            )}
            <a href={paper.sourceUrl} target="_blank" rel="noreferrer">
              <Link2 size={14} />
              Trang bài gốc
              <ArrowUpRight size={13} />
            </a>
          </div>
          <small>Mở ở tab mới · Cần Internet · Chưa hiển thị PDF trong cuốn sách</small>
        </div>
      </section>
      <button className="copy-citation" onClick={() => void copyCitation()}>
        <Copy size={14} />
        <span>
          Sao chép trích dẫn<small>Tác giả · Năm · Tên bài · Nguồn</small>
        </span>
        <ArrowUpRight size={13} />
      </button>
      {neighbors.length > 0 && (
        <section className="dossier-related">
          <div>
            <span className="dossier-section-number">04</span>
            <h3>Theo dấu những kết nối</h3>
          </div>
          <p>Những bài gần với bài đang đọc, theo cosine của vector 384 chiều.</p>
          <div className="related">
            {neighbors.map((hit) => (
              <button key={hit.paper.id} onClick={() => onSelect(hit.paper)}>
                <i style={{ background: similarityTone(hit.score).color }} />
                <span>
                  {hit.paper.title}
                  <small>
                    {GROUPS[hit.paper.group].label} · {hit.paper.year}
                  </small>
                </span>
                <small>cos {hit.score.toFixed(3)}</small>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
