/**
 * Kế hoạch "lan tỏa tri thức": bài giống câu hỏi nhất xuất hiện đầu tiên, rồi các đường nối
 * được vẽ dần sang những bài tiếp theo. Toàn bộ là hàm thuần (không đụng tới Three.js) để
 * kiểm tra được bằng test.
 */
export type SpreadStep = { id: string; parent: string | null; score: number }

/** Thời gian (giây) của hiệu ứng. Chỉnh ở đây để đổi nhịp lan tỏa. */
export const SPREAD = {
  rootAt: 1.1, // bài số 1 hiện ra sau khi đốm sáng bay từ sách tới nơi
  linkDur: 0.7, // thời gian một đường nối được vẽ xong
  popDur: 0.55, // thời gian một đốm sáng nở ra
  minStep: 0.06, // khoảng cách tối thiểu giữa hai bài liên tiếp
  maxStep: 0.22, // khoảng cách tối đa
  budget: 4.2, // tổng thời gian lan tỏa mong muốn (giây)
} as const

export function spreadStep(n: number) {
  return Math.max(SPREAD.minStep, Math.min(SPREAD.maxStep, SPREAD.budget / Math.max(1, n - 1)))
}

/** Lúc đường nối dẫn tới bài thứ i bắt đầu được vẽ (i >= 1). */
export function linkStartAt(i: number, n: number) {
  return SPREAD.rootAt + (i - 1) * spreadStep(n)
}

/** Lúc bài thứ i bắt đầu hiện ra (đường nối vừa chạm tới). */
export function appearAt(i: number, n: number) {
  return i === 0 ? SPREAD.rootAt : linkStartAt(i, n) + SPREAD.linkDur * 0.85
}

/** Tổng thời gian của cả đợt lan tỏa. */
export function spreadDuration(n: number) {
  return appearAt(Math.max(0, n - 1), n) + SPREAD.popDur + 0.4
}

/** 0 → 1 với một chút "nảy" ở cuối (đỉnh khoảng 1.1). */
export function popCurve(x: number) {
  if (!Number.isFinite(x) || x <= 0) return 0
  if (x >= 1) return 1
  return 1 - Math.pow(1 - x, 3) + Math.sin(x * Math.PI) * 0.12
}

/**
 * Lan tỏa kiểu Prim: bắt đầu từ bài điểm cao nhất, mỗi bước thêm bài "gần" nhất với tập đã
 * chạm tới (cosine thật giữa hai bài), ưu tiên bài có điểm cao với câu hỏi.
 *
 * @param rows    láng giềng cosine của từng bài
 * @param scores  điểm của từng bài so với câu hỏi (hoặc bài đang chọn)
 * @param visible các bài đang hiển thị (sau khi lọc)
 * @param limit   số bài tối đa tham gia lan tỏa
 */
export function planSpread(
  rows: { id: string; neighbors: { id: string; score: number }[] }[],
  scores: ReadonlyMap<string, number>,
  visible: ReadonlySet<string>,
  limit = 60
): SpreadStep[] {
  const candidates = [...scores]
    .filter(([id, s]) => visible.has(id) && Number.isFinite(s))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
  if (candidates.length === 0) return []

  const ids = new Set(candidates.map(([id]) => id))
  const score = new Map(candidates)
  const sim = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!ids.has(row.id)) continue
    const m = new Map<string, number>()
    for (const nb of row.neighbors)
      if (ids.has(nb.id) && Number.isFinite(nb.score)) m.set(nb.id, nb.score)
    sim.set(row.id, m)
  }

  const root = candidates[0]![0]
  const steps: SpreadStep[] = [{ id: root, parent: null, score: score.get(root)! }]
  const reached = [root]
  const left = new Set(ids)
  left.delete(root)

  while (left.size) {
    let best: { id: string; parent: string; link: number; priority: number } | null = null
    for (const u of left) {
      let parent: string | null = null
      let link = -Infinity
      for (const v of reached) {
        const s = sim.get(u)?.get(v) ?? sim.get(v)?.get(u)
        if (s !== undefined && s > link) {
          link = s
          parent = v
        }
      }
      if (parent === null) continue
      const priority = link + 0.5 * score.get(u)!
      if (!best || priority > best.priority || (priority === best.priority && u < best.id)) {
        best = { id: u, parent, link, priority }
      }
    }
    if (!best) {
      // không có số đo cosine giữa bài này và tập đã chạm tới: nối thẳng vào bài số 1
      const u = [...left].sort()[0]!
      best = { id: u, parent: root, link: score.get(u)!, priority: 0 }
    }
    steps.push({ id: best.id, parent: best.parent, score: best.link })
    reached.push(best.id)
    left.delete(best.id)
  }
  return steps
}
