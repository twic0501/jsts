import { describe, expect, it } from 'vitest'
import { MAX_VISIBLE_PAPERS, NO_FILTERS, activeFilterCount, applyFilters } from '../apps/web/src/filters'

const hits = Array.from({ length: 250 }, (_, i) => ({
  paper: { id: i, year: i % 2 === 0 ? 2024 : 2020 },
  score: i / 250,
}))

describe('Giới hạn hiển thị kết quả trên frontend', () => {
  it('mặc định chỉ giữ 100 bài có cosine cao nhất, không sửa nguồn hoặc điểm', () => {
    const original = structuredClone(hits)
    const result = applyFilters(hits, NO_FILTERS, true)
    expect(result).toHaveLength(100)
    expect(result.map(hit => hit.paper.id)).toEqual(Array.from({ length: 100 }, (_, i) => 249 - i))
    expect(hits).toEqual(original)
  })

  it.each([5, 10, 15, 20, 30])('giữ lựa chọn tối đa %i bài theo cosine', topK => {
    const result = applyFilters(hits, { ...NO_FILTERS, topK }, true)
    expect(result).toHaveLength(topK)
    expect(result[0]?.paper.id).toBe(249)
    expect(result.at(-1)?.paper.id).toBe(250 - topK)
  })

  it('áp dụng năm và ngưỡng cosine trước khi lấy top K', () => {
    const result = applyFilters(hits, { ...NO_FILTERS, yearMin: 2024, minScore: 0.9, topK: 5 }, true)
    expect(result.map(hit => hit.paper.id)).toEqual([248, 246, 244, 242, 240])
  })

  it('không vượt trần 100 kể cả khi truyền số lượng lớn hơn', () => {
    expect(applyFilters(hits, { ...NO_FILTERS, topK: 1000 }, true)).toHaveLength(MAX_VISIBLE_PAPERS)
  })

  it('chưa tìm kiếm vẫn giới hạn 100 và giữ thứ tự thư viện', () => {
    expect(applyFilters(hits, NO_FILTERS, false)).toEqual(hits.slice(0, 100))
  })

  it('không tạo bài giả khi thư viện nhỏ hơn giới hạn', () => {
    expect(applyFilters(hits.slice(0, 30), NO_FILTERS, true)).toHaveLength(30)
  })

  it('đặt lại về 100 là trạng thái mặc định, chọn ít hơn mới tính là bộ lọc', () => {
    expect(NO_FILTERS.topK).toBe(100)
    expect(activeFilterCount(NO_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...NO_FILTERS, topK: 5 })).toBe(1)
  })
})
