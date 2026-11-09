import { Check, X, Orbit, ArrowRight } from 'lucide-react'
import { ResearchReport, Paper } from '@paper-galaxy/core'
import ResearchPanel from '../../ResearchPanel' // Đảm bảo đường dẫn đúng

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
        <div className="toast glass" role="status">
          <Check size={16} />
          {notice}
          <button onClick={() => setNotice('')} aria-label="Đóng thông báo">
            <X size={14} />
          </button>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-dialog glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dialog-close icon-button"
              autoFocus
              aria-label="Đóng hướng dẫn"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="brand-mark">
              <Orbit size={27} />
            </span>
            <h2 id="help-title">Đi theo sự tò mò của bạn.</h2>
            <p>
              Nhập câu hỏi rồi tìm: chữ xoáy vào sách, sách khép lại và mở ra để đọc. Dùng mũi tên
              để lật trang, “Bài tiếp theo” để đổi bài và “Thoát” để trở về. Có thể kéo xoay, cuộn
              phóng to và chọn Trang trái/Trang phải để đọc lớn. Thư viện và Góc đọc mở thành các
              bảng kính nổi.
            </p>
            <div className="help-note">
              <strong>Phía sau phép màu</strong>
              <p>
                {totalPapers} bài thật từ arXiv. E5 tạo vector 384 chiều, tìm bằng cosine. Các đốm
                sáng quanh sách dùng tọa độ PCA thật. Rê xem tên, bấm để mở bài; đường nối là các
                bài gần nhất theo cosine384D. Màu là các dải điểm quy ước, không phải đánh giá chất
                lượng bài báo.
              </p>
            </div>
            <p>
              Hình khối dựng bằng TypeScript, ký tự và trang giấy vẽ bằng Canvas. Chuyển động dùng
              số phức, sin/cos và nội suy. Không dùng ảnh hoặc video tải sẵn. Model và thư viện cần
              cài cục bộ lần đầu; sau đó bản build hỗ trợ offline. Link arXiv cần Internet.
            </p>
            <button className="search-submit" onClick={() => setHelp(false)}>
              Bắt đầu khám phá
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </>
  )
}
