/**
 * Bố cục bản đồ 2D (hàm thuần, không phụ thuộc React hay Three.js).
 * Cùng ý tưởng với bố cục thiên hà 3D: bài giống nhất ở tâm, các bài khác nằm trên các vòng quanh tâm,
 * vòng càng xa khi điểm cosine thật càng thấp; hướng của mỗi bài lấy từ toạ độ PCA.
 */
export type P3 = { x: number; y: number; z: number }
export type LayoutNode = { id: string; home: P3; score: number | null; visible: boolean }
export type Pt = { x: number; y: number }

export function layout2D(
  nodes: LayoutNode[],
  plan: { id: string }[],
  width: number,
  height: number
): Map<string, Pt> {
  const out = new Map<string, Pt>()
  const w = Math.max(200, width)
  const h = Math.max(200, height)
  // vùng vẽ: lệch xuống một chút để tránh thanh tìm kiếm ở phía trên
  const cx = w / 2
  const cy = h * 0.58
  const rx = Math.max(60, Math.min(w * 0.42, w / 2 - 70))
  const ry = Math.max(60, h * 0.33)

  const visible = nodes.filter((n) => n.visible)
  if (visible.length === 0) return out

  // 1) Mọi node theo mặt phẳng PCA (x, z), thu cho vừa khung
  const xs = visible.map((n) => n.home.x)
  const zs = visible.map((n) => n.home.z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const scale = Math.min(
    (2 * rx) / Math.max(1e-6, maxX - minX),
    (2 * ry) / Math.max(1e-6, maxZ - minZ)
  )
  const midX = (minX + maxX) / 2
  const midZ = (minZ + maxZ) / 2
  for (const n of visible) {
    out.set(n.id, { x: cx + (n.home.x - midX) * scale, y: cy + (n.home.z - midZ) * scale })
  }

  // 2) Có kết quả tìm kiếm: bố cục thiên hà theo điểm cosine
  const byId = new Map(visible.map((n) => [n.id, n]))
  const planNodes = plan.map((p) => byId.get(p.id)).filter((n): n is LayoutNode => Boolean(n))
  if (planNodes.length < 2) return out
  const root = planNodes[0]!
  if (root.score === null) return out

  let sx = 0
  let sz = 0
  for (const n of planNodes) {
    sx += n.home.x
    sz += n.home.z
  }
  const mx = sx / planNodes.length
  const mz = sz / planNodes.length
  const top = root.score
  const others = planNodes.slice(1)
  const low = Math.min(...others.map((n) => n.score ?? top))
  const span = Math.max(1e-6, top - low)

  const radius: number[] = [0]
  const pos: Pt[] = [{ x: cx, y: cy }]
  others.forEach((n, k) => {
    const dx = n.home.x - mx
    const dz = n.home.z - mz
    const angle = Math.hypot(dx, dz) < 1e-6 ? (k + 1) * 2.399963 : Math.atan2(dz, dx)
    const t = Math.max(0, Math.min(1, (top - (n.score ?? low)) / span))
    const r = 0.2 + Math.pow(t, 0.85) * 0.8
    radius.push(r)
    pos.push({ x: cx + Math.cos(angle) * r * rx, y: cy + Math.sin(angle) * r * ry })
  })

  // 3) Đẩy các node đang chồng nhau ra xa, giữ nguyên vòng (bán kính) của từng node
  const gap = Math.max(24, Math.min(w, h) * 0.05)
  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i]!
        const b = pos[j]!
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.hypot(dx, dy)
        if (dist >= gap) continue
        if (dist < 1e-4) {
          dx = Math.cos(i + j)
          dy = Math.sin(i + j)
          dist = 1
        }
        const push = (gap - Math.hypot(a.x - b.x, a.y - b.y)) / 2
        const ux = dx / dist
        const uy = dy / dist
        if (i === 0) {
          b.x -= ux * push * 2 // bài số 1 đứng yên ở tâm
          b.y -= uy * push * 2
        } else {
          a.x += ux * push
          a.y += uy * push
          b.x -= ux * push
          b.y -= uy * push
        }
      }
    }
    for (let i = 1; i < pos.length; i++) {
      const p = pos[i]!
      const phi = Math.atan2((p.y - cy) / ry, (p.x - cx) / rx)
      p.x = cx + Math.cos(phi) * radius[i]! * rx
      p.y = cy + Math.sin(phi) * radius[i]! * ry
    }
  }

  planNodes.forEach((n, i) => out.set(n.id, { x: pos[i]!.x, y: pos[i]!.y }))
  return out
}

/** Ở nền sáng: hạ độ sáng của màu neon để dễ nhìn. */
export function darken(hex: string, maxLightness = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  let r = ((n >> 16) & 255) / 255
  let g = ((n >> 8) & 255) / 255
  let b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let hue = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue /= 6
  }
  const nl = Math.min(l, maxLightness)
  if (nl === l) return '#' + m[1]!.toLowerCase()
  const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s
  const p = 2 * nl - q
  const f = (t0: number) => {
    let t = t0
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  r = f(hue + 1 / 3)
  g = f(hue)
  b = f(hue - 1 / 3)
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}
