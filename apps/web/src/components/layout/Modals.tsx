import { useEffect, useRef } from 'react'
import { Info, X, Orbit, ArrowRight } from 'lucide-react'
import type { ResearchReport, Paper } from '@paper-galaxy/core'
import ResearchPanel from '../../ResearchPanel'
import { useDialogFocus } from '../../hooks/useDialogFocus'

interface ModalsProps {
  researchOpen: boolean
  research: ResearchReport | null
  papers: Paper[]
  setResearchOpen: (val: boolean) => void
  selectPaper: (paper: Paper | null) => void
  notice: string
  setNotice: (val: string) => void
  help: boolean
  setHelp: (val: boolean) => void
  totalPapers: number
}

export default function Modals({
  researchOpen,
  research,
  papers,
  setResearchOpen,
  selectPaper,
  notice,
  setNotice,
  help,
  setHelp,
  totalPapers,
}: ModalsProps) {
  const helpRef = useRef<HTMLElement>(null)
  useDialogFocus(help, helpRef, () => setHelp(false), '[aria-label="Hướng dẫn"]')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 6500)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <>
      {researchOpen && research && (
        <ResearchPanel
          report={research}
          papers={papers}
          onSelect={(paper) => {
            setResearchOpen(false)
            selectPaper(paper)
          }}
          onClose={() => setResearchOpen(false)}
        />
      )}
      {notice && (
        <div className="toast glass" role="status" aria-atomic="true">
          <Info size={17} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">
            <X size={14} />
          </button>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            ref={helpRef}
            id="help-dialog"
            className="help-dialog glass"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dialog-close icon-button"
              aria-label="Đóng hướng dẫn"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="brand-mark" aria-hidden="true">
              <Orbit size={27} />
            </span>
            <h2 id="help-title">Đi theo sự tò mò của bạn.</h2>
            <p>
              Khám phá {totalPapers} bài nghiên cứu, tìm những kết nối mới và giữ lại bài bạn muốn đọc tiếp.
            </p>
            <ol className="help-steps">
              <li>
                <strong>Bắt đầu bằng một câu hỏi</strong>
                <p>Nhập chủ đề bạn quan tâm hoặc chọn một gợi ý, rồi bấm “Tìm trong sách”.</p>
              </li>
              <li>
                <strong>Chọn bài từ thư viện</strong>
                <p>Xem kết quả trong “Thư viện”, dùng “Bộ lọc” để thu hẹp, hoặc chọn một đốm sáng để mở thông tin bài.</p>
              </li>
              <li>
                <strong>Đọc theo cách của bạn</strong>
                <p>Trong “Góc đọc”, xem tóm tắt và nguồn gốc. Chọn “Mở trong sách 3D” để đọc trên trang sách; bạn cũng có thể chuyển sang bản đồ 2D.</p>
              </li>
              <li>
                <strong>Giữ lại một ý tưởng hay</strong>
                <p>Bấm biểu tượng đánh dấu để lưu. Các bài xuất hiện trong “Bài đã lưu” trên trình duyệt này.</p>
              </li>
            </ol>
            <div className="help-note">
              <strong>Một chút lưu ý khi khám phá</strong>
              <p>
                Màu sắc thể hiện mức gần nghĩa, không đánh giá chất lượng bài báo. Nội dung trong sách là thông tin và abstract; hãy mở nguồn hoặc PDF để đọc toàn văn.
              </p>
            </div>
            <p>
              Khi hiển thị “Sẵn sàng dùng offline”, bạn có thể tìm trong các bài đã tải mà không cần mạng. Mở nguồn và PDF vẫn cần kết nối Internet.
            </p>
            <button type="button" className="search-submit" onClick={() => setHelp(false)}>
              Bắt đầu khám phá
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </>
  )
}
