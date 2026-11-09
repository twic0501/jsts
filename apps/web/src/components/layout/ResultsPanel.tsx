import { BookOpen, ChevronDown, ArrowRight, ArrowUpRight, Bookmark } from 'lucide-react'
import { GROUPS, Group, Paper, SearchResult } from '@paper-galaxy/core'
import { similarityTone } from '../../scene/ritual'

interface ResultsPanelProps {
  result: SearchResult
  completedQuery: string
  savedOnly: boolean
  query: string
  hits: { paper: Paper; score: number }[]
  searching: boolean
  group: Group | 'all'
  chooseGroup: (val: Group | 'all') => void
  year: string
  setYear: (val: string) => void
  search: (val: string) => void
  setSavedOnly: (val: boolean) => void
  selected: Paper | null
  selectPaper: (paper: Paper | null) => void
  setNotice: (val: string) => void
  saved: string[]
  bookmark: (paper: Paper) => void
}

export default function ResultsPanel({
  result,
  completedQuery,
  savedOnly,
  query,
  hits,
  searching,
  group,
  chooseGroup,
  year,
  setYear,
  search,
  setSavedOnly,
  selected,
  selectPaper,
  setNotice,
  saved,
  bookmark,
}: ResultsPanelProps) {
  return (
    <section
      className="results-panel glass"
      aria-label="Kết quả tìm kiếm"
      data-search-method={result.method}
      data-completed-query={completedQuery}
    >
      <div className="results-heading">
        <div>
          <span className="section-kicker">YOUR NEXT DISCOVERY</span>
          <h2>
            {savedOnly ? 'Kệ sách của bạn' : query ? 'Những kết nối tìm thấy' : 'Thư viện ý tưởng'}
            <span>{hits.length}</span>
          </h2>
        </div>
        <BookOpen size={19} />
      </div>
      <p className="results-query">
        {searching
          ? 'Đang tìm những bài liên quan…'
          : query
            ? `Dành cho “${query}”`
            : 'Một bài báo. Một góc nhìn mới.'}
      </p>

      <div className="result-filters">
        <label className="select-wrapper">
          <select
            aria-label="Lọc lĩnh vực"
            value={group}
            onChange={(e) => chooseGroup(e.target.value as Group | 'all')}
          >
            <option value="all">Tất cả lĩnh vực</option>
            {(Object.keys(GROUPS) as Group[]).map((g) => (
              <option key={g} value={g}>
                {GROUPS[g].label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </label>
        <label className="select-wrapper">
          <select
            aria-label="Năm xuất bản"
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              selectPaper(null)
            }}
          >
            <option value="all">Mọi năm</option>
            <option value="2020">Từ 2020</option>
            <option value="2024">Từ 2024</option>
            <option value="2026">Từ 2026</option>
          </select>
          <ChevronDown size={12} />
        </label>
      </div>

      <div className="result-list" aria-live="polite" aria-busy={searching}>
        {hits.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={30} />
            <h3>{savedOnly ? 'Kệ sách còn trống' : 'Chưa tìm thấy bài phù hợp'}</h3>
            <p>
              {savedOnly
                ? 'Lưu một bài để quay lại đọc sau.'
                : 'Thử câu hỏi khác hoặc bỏ bớt bộ lọc.'}
            </p>
            <button
              onClick={() => {
                search('')
                chooseGroup('all')
                setYear('all')
                setSavedOnly(false)
              }}
            >
              Xem toàn bộ thư viện
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          hits.map(({ paper, score }, i) => {
            const tone = similarityTone(query ? score : null)
            return (
              <article
                className={`paper-card ${selected?.id === paper.id ? 'selected' : ''}`}
                key={paper.id}
                data-paper-id={paper.id}
              >
                <button
                  className="paper-select"
                  disabled={searching}
                  onClick={() => {
                    selectPaper(paper)
                    setNotice('')
                  }}
                  aria-pressed={selected?.id === paper.id}
                >
                  <div className="paper-meta">
                    <span className="paper-group">
                      <i style={{ background: GROUPS[paper.group].color }} />
                      {GROUPS[paper.group].label}
                    </span>
                    <span>{paper.year}</span>
                  </div>
                  <div className="card-source-line">
                    <span>{paper.provenance?.provider ?? 'arxiv'}</span>
                    <span
                      className={
                        paper.provenance?.abstractAvailable === false
                          ? 'coverage-limited'
                          : 'coverage-complete'
                      }
                    >
                      {paper.provenance?.abstractAvailable === false
                        ? 'Chỉ tiêu đề'
                        : 'Có abstract'}
                    </span>
                  </div>
                  <h3>{paper.title}</h3>
                  <p>{paper.summary}</p>
                  <div className="paper-foot">
                    {query ? (
                      <span className="similarity-score" title={tone.label}>
                        <i style={{ background: tone.color }} />
                        cos {score.toFixed(3)}
                      </span>
                    ) : (
                      <span>arXiv · {paper.id}</span>
                    )}
                    <span className="open-book-label">
                      {selected?.id === paper.id ? 'Đang đọc' : 'Mở sách'}
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                </button>
                <span className="paper-number">{String(i + 1).padStart(2, '0')}</span>
                <button
                  className={`save-card ${saved.includes(paper.id) ? 'saved' : ''}`}
                  aria-label={`${saved.includes(paper.id) ? 'Bỏ lưu' : 'Lưu'} ${paper.title}`}
                  onClick={() => void bookmark(paper)}
                >
                  <Bookmark size={15} fill={saved.includes(paper.id) ? 'currentColor' : 'none'} />
                </button>
              </article>
            )
          })
        )}
      </div>
      <div className="result-footer">
        <span className="live-dot" />
        Thư viện đã tải
        <span>{query ? `${result.durationMs.toFixed(1)} ms` : 'Lưu trữ trên máy'}</span>
      </div>
    </section>
  )
}
