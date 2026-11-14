/**
 * Logic lọc thuần (không phụ thuộc React) cho kết quả tìm kiếm và trang "Bài đã lưu".
 * Bộ lọc chỉ ẩn/hiện bài, không bao giờ sửa điểm cosine của bài nào.
 */

/** Giới hạn số bài trong danh sách kết quả và các node hiển thị. */
export const MAX_VISIBLE_PAPERS = 100

export type Filters = {
  yearMin: number | null
  yearMax: number | null
  /** Số bài tối đa được hiển thị (lấy các bài có cosine cao nhất). */
  topK: number
  /** Chỉ giữ các bài có cosine >= ngưỡng này (chỉ có tác dụng khi đang có câu tìm kiếm). */
  minScore: number | null
}

export const NO_FILTERS: Filters = { yearMin: null, yearMax: null, topK: MAX_VISIBLE_PAPERS, minScore: null }

export type ScoredHit<P> = { paper: P; score: number }

/** Thứ tự áp dụng: năm → ngưỡng cosine → số lượng (top-K). */
export function applyFilters<P extends { year: number }>(
  items: ScoredHit<P>[],
  f: Filters,
  hasQuery: boolean
): ScoredHit<P>[] {
  let out = items
  if (f.yearMin !== null) out = out.filter((h) => h.paper.year >= f.yearMin!)
  if (f.yearMax !== null) out = out.filter((h) => h.paper.year <= f.yearMax!)
  if (hasQuery && f.minScore !== null) out = out.filter((h) => h.score >= f.minScore!)
  // Luôn xếp theo cosine trước khi cắt, kể cả khi nguồn chưa xếp sẵn.
  const ranked = hasQuery ? [...out].sort((a, b) => b.score - a.score) : out
  return ranked.slice(0, Math.min(f.topK, MAX_VISIBLE_PAPERS))
}

/** Số bộ lọc đang bật (để hiện số trên nút "Bộ lọc"). */
export function activeFilterCount(f: Filters, hasQuery = true): number {
  let n = 0
  if (f.yearMin !== null || f.yearMax !== null) n++
  if (f.topK < MAX_VISIBLE_PAPERS) n++
  if (hasQuery && f.minScore !== null) n++
  return n
}

export function yearBounds(papers: { year: number }[]): [number, number] | null {
  if (papers.length === 0) return null
  let lo = Infinity
  let hi = -Infinity
  for (const p of papers) {
    if (p.year < lo) lo = p.year
    if (p.year > hi) hi = p.year
  }
  return [lo, hi]
}

export function scoreBounds(items: { score: number }[]): [number, number] | null {
  const scores = items.map((i) => i.score).filter((s) => Number.isFinite(s))
  if (scores.length === 0) return null
  return [Math.min(...scores), Math.max(...scores)]
}

// ---------------- Trang "Bài đã lưu" ----------------

export type SavedSort = 'year-desc' | 'year-asc' | 'title'
export type SavedFilter = {
  text: string
  yearMin: number | null
  yearMax: number | null
  sort: SavedSort
  /** Số bài tối đa hiển thị; null = tất cả. */
  limit: number | null
}
export const NO_SAVED_FILTER: SavedFilter = {
  text: '',
  yearMin: null,
  yearMax: null,
  sort: 'year-desc',
  limit: null,
}

/** Bỏ dấu tiếng Việt và chữ hoa để tìm cho dễ ("nguyen" khớp "Nguyễn"). */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function filterSaved<P extends { title: string; authors: string[]; year: number }>(
  papers: P[],
  f: SavedFilter
): P[] {
  const needle = fold(f.text.trim())
  let out = papers.filter((p) => {
    if (f.yearMin !== null && p.year < f.yearMin) return false
    if (f.yearMax !== null && p.year > f.yearMax) return false
    if (needle && !fold(p.title + ' ' + p.authors.join(' ')).includes(needle)) return false
    return true
  })
  out = [...out].sort((a, b) => {
    if (f.sort === 'title') return a.title.localeCompare(b.title)
    const d = f.sort === 'year-desc' ? b.year - a.year : a.year - b.year
    return d !== 0 ? d : a.title.localeCompare(b.title)
  })
  return f.limit !== null ? out.slice(0, f.limit) : out
}
