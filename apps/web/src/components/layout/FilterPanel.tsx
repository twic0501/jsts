import { useRef } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { MAX_VISIBLE_PAPERS, NO_FILTERS, activeFilterCount, type Filters } from '../../filters'
import { SIMILARITY_BANDS, similarityTone } from '../../scene/ritual'
import { useDialogFocus } from '../../hooks/useDialogFocus'

type Props = {
  filters: Filters
  setFilters: (f: Filters) => void
  /** [năm nhỏ nhất, năm lớn nhất] của toàn bộ thư viện. */
  years: [number, number] | null
  /** [cosine nhỏ nhất, lớn nhất] của kết quả tìm kiếm hiện tại (null khi chưa tìm). */
  scores: [number, number] | null
  hasQuery: boolean
  /** Số bài đang hiển thị / tổng số bài của kết quả. */
  shown: number
  total: number
  onClose: () => void
}

const TOP_K = [5, 10, 15, 20, 30]
const floor3 = (v: number) => Math.floor(v * 1000) / 1000
const ceil3 = (v: number) => Math.ceil(v * 1000) / 1000

/** Bảng lọc nổi: lọc theo năm, theo số lượng bài và theo độ tương đồng (cosine). */
export default function FilterPanel({ filters, setFilters, years, scores, hasQuery, shown, total, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogFocus(true, dialogRef, onClose, '[aria-controls="result-filter-dialog"]')

  const [yLo, yHi] = years ?? [0, 0]
  const from = filters.yearMin ?? yLo
  const to = filters.yearMax ?? yHi
  const canScore = hasQuery && scores !== null
  const sLo = scores ? floor3(scores[0]) : 0
  const sHi = scores ? ceil3(scores[1]) : 1
  const scoreValue = Math.min(sHi, Math.max(sLo, filters.minScore ?? sLo))
  const active = activeFilterCount(filters, hasQuery)

  const setFrom = (v: number) => {
    const next = Math.min(v, to)
    setFilters({ ...filters, yearMin: next <= yLo ? null : next })
  }
  const setTo = (v: number) => {
    const next = Math.max(v, from)
    setFilters({ ...filters, yearMax: next >= yHi ? null : next })
  }

  return (
    <>
      <div className="filter-backdrop" onClick={onClose} aria-hidden="true" />
      <section ref={dialogRef} id="result-filter-dialog" className="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filter-title" tabIndex={-1}>
        <header>
          <h2 id="filter-title">Bộ lọc</h2>
          <button type="button" className="filter-close" aria-label="Đóng bộ lọc" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="filter-block">
          <div className="filter-title">
            <span>Năm xuất bản</span>
            <strong>{years ? (from === to ? `${from}` : `${from} – ${to}`) : '—'}</strong>
          </div>
          {years && yLo < yHi ? (
            <>
              <label className="filter-slider">
                <span>Từ năm</span>
                <input type="range" min={yLo} max={yHi} step={1} value={from} aria-label="Từ năm" onChange={(e) => setFrom(Number(e.target.value))} />
              </label>
              <label className="filter-slider">
                <span>Đến năm</span>
                <input type="range" min={yLo} max={yHi} step={1} value={to} aria-label="Đến năm" onChange={(e) => setTo(Number(e.target.value))} />
              </label>
              <div className="filter-chips" role="group" aria-label="Khoảng năm xuất bản">
                <button type="button" className={filters.yearMin === null && filters.yearMax === null ? 'on' : ''} aria-pressed={filters.yearMin === null && filters.yearMax === null} onClick={() => setFilters({ ...filters, yearMin: null, yearMax: null })}>
                  Tất cả
                </button>
                <button type="button" className={filters.yearMin === Math.max(yLo, yHi - 4) && filters.yearMax === null ? 'on' : ''} aria-pressed={filters.yearMin === Math.max(yLo, yHi - 4) && filters.yearMax === null} onClick={() => setFilters({ ...filters, yearMin: Math.max(yLo, yHi - 4), yearMax: null })}>
                  5 năm gần nhất
                </button>
              </div>
            </>
          ) : (
            <p className="filter-hint">Thư viện chỉ có một năm xuất bản.</p>
          )}
        </div>

        <div className="filter-block">
          <div className="filter-title">
            <span>Số lượng bài hiển thị</span>
            <strong>Tối đa {filters.topK} bài</strong>
          </div>
          <div className="filter-chips" role="group" aria-label="Số lượng bài">
            {TOP_K.map((k) => (
              <button key={k} type="button" className={filters.topK === k ? 'on' : ''} aria-pressed={filters.topK === k} onClick={() => setFilters({ ...filters, topK: k })}>
                {k}
              </button>
            ))}
            <button type="button" className={filters.topK === MAX_VISIBLE_PAPERS ? 'on' : ''} aria-pressed={filters.topK === MAX_VISIBLE_PAPERS} onClick={() => setFilters({ ...filters, topK: MAX_VISIBLE_PAPERS })}>
              Tối đa {MAX_VISIBLE_PAPERS} bài
            </button>
          </div>
          <p className="filter-hint">
            {hasQuery
              ? `Chỉ hiển thị tối đa ${MAX_VISIBLE_PAPERS} bài có cosine cao nhất trong kết quả nhận được.`
              : `Hiển thị tối đa ${MAX_VISIBLE_PAPERS} bài để không gian khám phá chạy nhẹ hơn.`}
          </p>
        </div>

        <div className={`filter-block${canScore ? '' : ' disabled'}`}>
          <div className="filter-title">
            <span>Độ tương đồng tối thiểu</span>
            <strong>{canScore ? (filters.minScore === null ? 'Không giới hạn' : `cos ≥ ${scoreValue.toFixed(3)}`) : '—'}</strong>
          </div>
          {canScore && scores ? (
            <>
              <label className="filter-slider">
                <span>Cosine</span>
                <input
                  type="range"
                  min={sLo}
                  max={sHi}
                  step={0.001}
                  value={scoreValue}
                  aria-label="Độ tương đồng tối thiểu (cosine)"
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setFilters({ ...filters, minScore: v <= sLo + 0.0005 ? null : v })
                  }}
                />
              </label>
              <div className="filter-scale">
                <span>{sLo.toFixed(3)}</span>
                <span>{sHi.toFixed(3)}</span>
              </div>
              <div className="filter-chips" role="group" aria-label="Mức tương đồng nhanh">
                <button type="button" className={filters.minScore === null ? 'on' : ''} aria-pressed={filters.minScore === null} onClick={() => setFilters({ ...filters, minScore: null })}>
                  Tất cả
                </button>
                {(
                  [
                    ['Vừa', SIMILARITY_BANDS.medium],
                    ['Cao', SIMILARITY_BANDS.high],
                    ['Rất cao', SIMILARITY_BANDS.veryHigh],
                  ] as const
                ).map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={value > sHi}
                    className={filters.minScore === value ? 'on' : ''}
                    aria-pressed={filters.minScore === value}
                    title={`Chỉ giữ các bài có cosine ≥ ${value}`}
                    onClick={() => setFilters({ ...filters, minScore: Math.max(sLo, value) })}
                  >
                    <i style={{ background: similarityTone(value).color }} />
                    ≥ {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="filter-hint">Nhập câu tìm kiếm để lọc theo độ tương đồng.</p>
          )}
        </div>

        <footer>
          <span>
            Đang hiển thị <strong>{shown}</strong> / {total} bài
          </span>
          <button type="button" className="filter-reset" disabled={active === 0} onClick={() => setFilters(NO_FILTERS)}>
            <RotateCcw size={13} />
            Đặt lại
          </button>
        </footer>
      </section>
    </>
  )
}
