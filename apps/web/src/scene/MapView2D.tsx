import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { GROUPS, type Paper } from '@paper-galaxy/core'
import { similarityStrength, similarityTone } from './ritual'
import {
  SPREAD,
  appearAt,
  linkStartAt,
  popCurve,
  spreadDuration,
  type Export2D,
} from './create-book-scene'
import { darken, layout2D, type Pt } from './galaxy-2d'

type Dir = 'in' | 'out' | 'idle'

type Props = {
  /** Dữ liệu lấy từ cảnh 3D (vị trí màn hình hiện tại, toạ độ PCA, điểm cosine, kế hoạch lan tỏa). */
  snap: Export2D | null
  /** in = đang chuyển 3D → 2D · out = đang chuyển 2D → 3D · idle = đang ở 2D. */
  dir: Dir
  onEnd: () => void
  papers: Paper[]
  selectedId: string | null
  onSelect: (paper: Paper) => void
  theme: 'light' | 'dark'
  searching: boolean
  castId: number
}

const DURATION = 780
type View = { k: number; x: number; y: number } // k = mức zoom, (x, y) = độ dời (pixel)
const IDENTITY: View = { k: 1, x: 0, y: 0 }
const K_MIN = 0.5
const K_MAX = 6
const SELECT_ZOOM = 1.8 // mức zoom tối thiểu khi chọn một bài
const LABEL_ZOOM = 2.2 // từ mức này trở lên, hiện tên của mọi bài
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const short = (text: string, n = 44) => (text.length > n ? text.slice(0, n - 1) + '…' : text)

export default function MapView2D({
  snap,
  dir,
  onEnd,
  papers,
  selectedId,
  onSelect,
  theme,
  searching,
  castId,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: snap?.width || 1000, h: snap?.height || 600 })
  const [tr, setTr] = useState(dir === 'idle' ? 1 : 0) // tiến độ chuyển cảnh 0 → 1
  const [rv, setRv] = useState(Infinity) // giây kể từ lúc bắt đầu hiệu ứng lan tỏa (Infinity = đã xong)
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null)
  const [view, setView] = useState<View>(IDENTITY)
  const [dragging, setDragging] = useState(false)
  const viewRef = useRef(view)
  viewRef.current = view
  const sizeRef = useRef(size)
  sizeRef.current = size
  const dirRef = useRef(dir)
  dirRef.current = dir
  const flyRaf = useRef(0)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const pinch = useRef<{
    d: number
    k: number
    cx: number
    cy: number
    vx: number
    vy: number
  } | null>(null)
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const plan = snap?.plan ?? []
  const planKey = plan.length > 1 ? `${castId}:${plan[0]?.id}:${plan.length}` : ''
  const planKeyRef = useRef(planKey)
  planKeyRef.current = planKey
  const lastKey = useRef(planKey) // khởi tạo bằng khoá hiện tại → không phát lại lan tỏa khi vừa chuyển sang 2D
  const planLength = useRef(plan.length)
  planLength.current = plan.length

  // theo dõi kích thước khung
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r && r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // hiệu ứng chuyển cảnh 3D ↔ 2D: các node trượt giữa vị trí trên màn hình 3D và vị trí trên bản đồ 2D
  useEffect(() => {
    if (dir === 'idle') {
      setTr(1)
      return
    }
    lastKey.current = planKeyRef.current
    if (reduced.current) {
      setTr(1)
      onEndRef.current()
      return
    }
    setTr(0)
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION)
      setTr(ease(p))
      if (p < 1) raf = requestAnimationFrame(step)
      else onEndRef.current()
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [dir])

  // hiệu ứng lan tỏa trong 2D khi có kết quả tìm kiếm mới
  useEffect(() => {
    if (dir !== 'idle' || searching || !planKey || lastKey.current === planKey) return
    lastKey.current = planKey
    if (reduced.current) {
      setRv(Infinity)
      return
    }
    // ở 2D không có đốm sáng bay từ quyển sách nên bỏ phần chờ đầu, bài số 1 hiện ra gần như ngay
    const lead = Math.max(0, SPREAD.rootAt - 0.3)
    const total = spreadDuration(planLength.current)
    const t0 = performance.now() - lead * 1000
    let raf = 0
    const step = (now: number) => {
      const T = (now - t0) / 1000
      if (T >= total) {
        setRv(Infinity)
        return
      }
      setRv(T)
      raf = requestAnimationFrame(step)
    }
    setRv(lead)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [planKey, dir, searching])

  /** Zoom quanh điểm (cx, cy) trên màn hình, giữ nguyên điểm đó đứng yên. */
  const zoomAt = (cx: number, cy: number, factor: number) => {
    cancelAnimationFrame(flyRaf.current)
    setHover(null)
    setView((v) => {
      const k = Math.max(K_MIN, Math.min(K_MAX, v.k * factor))
      const f = k / v.k
      return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f }
    })
  }
  /** Bay mượt tới một góc nhìn (pan + zoom cùng lúc). */
  const flyTo = (to: View, ms = 520) => {
    cancelAnimationFrame(flyRaf.current)
    setHover(null)
    if (reduced.current) {
      setView(to)
      return
    }
    const from = viewRef.current
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const e = ease(p)
      setView({
        k: Math.exp(lerp(Math.log(from.k), Math.log(to.k), e)),
        x: lerp(from.x, to.x, e),
        y: lerp(from.y, to.y, e),
      })
      if (p < 1) flyRaf.current = requestAnimationFrame(step)
    }
    flyRaf.current = requestAnimationFrame(step)
  }
  const stepZoom = (factor: number) => {
    const { w, h } = sizeRef.current
    const v = viewRef.current
    const k = Math.max(K_MIN, Math.min(K_MAX, v.k * factor))
    const f = k / v.k
    flyTo({ k, x: w / 2 - (w / 2 - v.x) * f, y: h / 2 - (h / 2 - v.y) * f }, 260)
  }

  // lăn chuột để zoom (phải gắn trực tiếp vào DOM với passive:false thì mới chặn được trang cuộn theo)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (dirRef.current !== 'idle') return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0016)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const local = (e: { clientX: number; clientY: number }) => {
    const r = rootRef.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (dir !== 'idle') return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as Element
    if (target.closest('.map2d-controls')) return
    cancelAnimationFrame(flyRaf.current)
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ]
      pinch.current = {
        d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        k: view.k,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        vx: view.x,
        vy: view.y,
      }
      pan.current = null
      setDragging(false)
    } else if (pointers.current.size === 1 && !target.closest('.n2d')) {
      pan.current = { x: p.x, y: p.y, vx: view.x, vy: view.y }
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ]
      const pc = pinch.current
      const k = Math.max(K_MIN, Math.min(K_MAX, pc.k * (Math.hypot(a.x - b.x, a.y - b.y) / pc.d)))
      const f = k / pc.k
      const ncx = (a.x + b.x) / 2
      const ncy = (a.y + b.y) / 2
      setHover(null)
      setView({ k, x: ncx - (pc.cx - pc.vx) * f, y: ncy - (pc.cy - pc.vy) * f })
    } else if (pan.current) {
      const dx = p.x - pan.current.x
      const dy = p.y - pan.current.y
      if (!dragging && Math.hypot(dx, dy) > 3) setDragging(true)
      setHover(null)
      setView({ k: viewRef.current.k, x: pan.current.vx + dx, y: pan.current.vy + dy })
    }
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      pan.current = null
      setDragging(false)
    }
  }
  const onDoubleClick = (e: React.MouseEvent) => {
    if (dir !== 'idle') return
    const target = e.target as Element
    if (target.closest('.n2d') || target.closest('.map2d-controls')) return
    const p = local(e)
    zoomAt(p.x, p.y, 1.8)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') stepZoom(1.35)
    else if (e.key === '-' || e.key === '_') stepZoom(1 / 1.35)
    else if (e.key === '0') flyTo(IDENTITY)
  }

  // khi bắt đầu chuyển 3D ↔ 2D: về góc nhìn gốc để các node trượt đúng vị trí
  useEffect(() => {
    if (dir !== 'idle') {
      cancelAnimationFrame(flyRaf.current)
      setView(IDENTITY)
    }
  }, [dir])

  const layout = useMemo(
    () => (snap ? layout2D(snap.nodes, snap.plan, size.w, size.h) : new Map<string, Pt>()),
    [snap, size.w, size.h]
  )
  useEffect(() => {
    if (dir !== 'idle' || !snap) return
    if (selectedId) {
      const p = layout.get(selectedId)
      if (!p) return
      const k = Math.max(viewRef.current.k, SELECT_ZOOM)
      flyTo({ k, x: size.w / 2 - p.x * k, y: size.h / 2 - p.y * k })
    } else {
      flyTo(IDENTITY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const paperById = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers])
  const nodeById = useMemo(() => new Map((snap?.nodes ?? []).map((n) => [n.id, n])), [snap])
  const planIdx = useMemo(() => new Map(plan.map((s, i) => [s.id, i])), [plan])
  const n = plan.length
  const light = theme === 'light'
  const zoomScale = dir === 'idle' ? Math.pow(view.k, 0.35) : 1 // node to lên nhẹ khi zoom, không phình quá

  const posOf = (id: string): Pt | null => {
    const to = layout.get(id)
    if (!to) return null
    if (dir === 'idle') return { x: to.x * view.k + view.x, y: to.y * view.k + view.y }
    const from = nodeById.get(id)?.screen ?? { x: size.w / 2, y: size.h / 2 }
    return dir === 'in'
      ? { x: lerp(from.x, to.x, tr), y: lerp(from.y, to.y, tr) }
      : { x: lerp(to.x, from.x, tr), y: lerp(to.y, from.y, tr) }
  }
  const appear = (id: string) => {
    if (dir !== 'idle') return 1
    if (searching) return 0
    if (rv === Infinity) return 1
    const i = planIdx.get(id)
    if (i === undefined) return 0.15
    return popCurve((rv - appearAt(i, n)) / SPREAD.popDur)
  }
  const linkProgress = (child: string) => {
    if (dir !== 'idle') return 1
    if (searching) return 0
    if (rv === Infinity) return 1
    const i = planIdx.get(child)
    if (i === undefined) return 1
    return clamp01((rv - linkStartAt(i, n)) / SPREAD.linkDur)
  }
  const colorOf = (id: string, score: number | null) => {
    const paper = paperById.get(id)
    const base =
      score !== null ? similarityTone(score).color : paper ? GROUPS[paper.group].color : '#a9cfff'
    return light ? darken(base) : base
  }

  const focus = new Set(snap?.focusIds ?? [])
  if (selectedId) focus.add(selectedId)
  const steady = dir === 'idle' && rv === Infinity && !searching

  const linkEls = (snap?.links ?? []).map((l, j) => {
    const a = posOf(l.a)
    const b = posOf(l.b)
    if (!a || !b) return null
    const p = linkProgress(l.b)
    if (p <= 0) return null
    const dx = b.x - a.x
    const dy = b.y - a.y
    // điểm điều khiển lệch ngang → đường cong mềm, cùng chiều xoáy cho cả mạng
    const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${((a.x + b.x) / 2 - dy * 0.18).toFixed(1)} ${((a.y + b.y) / 2 + dx * 0.18).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    const color = colorOf(l.b, nodeById.get(l.b)?.score ?? null)
    const direct = selectedId !== null && (l.a === selectedId || l.b === selectedId)
    const dim = selectedId ? (direct ? 1 : 0.14) : 1
    return (
      <g key={`${l.a}>${l.b}`} opacity={dim}>
        <path
          d={d}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
          fill="none"
          stroke={color}
          strokeOpacity={0.22 + 0.55 * similarityStrength(l.score)}
          strokeWidth={direct ? 2.4 : 1.2}
          strokeLinecap="round"
        />
        {steady && (
          <circle r={2.2} fill={color}>
            <animateMotion
              dur={`${3 + (j % 5) * 0.6}s`}
              begin={`${(j % 7) * 0.35}s`}
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        )}
      </g>
    )
  })

  const nodeEls = (snap?.nodes ?? [])
    .filter((nd) => nd.visible)
    .map((nd) => {
      const pos = posOf(nd.id)
      if (!pos) return null
      const paper = paperById.get(nd.id)
      const ap = appear(nd.id)
      const strength = nd.score !== null ? similarityStrength(nd.score) : 0.45
      const isRoot = nd.id === snap?.anchorId && plan.length > 0
      const isSel = nd.id === selectedId
      const R =
        (5 + 8 * strength) * (isRoot ? 1.5 : 1) * (isSel ? 1.25 : 1) * (0.5 + 0.5 * ap) * zoomScale
      const showLabel = isRoot || isSel || (dir === 'idle' && view.k >= LABEL_ZOOM)
      const color = colorOf(nd.id, nd.score)
      const dim = selectedId ? (focus.has(nd.id) ? 1 : 0.22) : 1
      const open = () => paper && onSelect(paper)
      return (
        <g
          key={nd.id}
          className="n2d"
          transform={`translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`}
          opacity={(0.12 + 0.88 * Math.min(1, ap)) * dim}
          role="button"
          tabIndex={0}
          aria-label={paper?.title ?? nd.id}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open()
            }
          }}
          onPointerEnter={() => setHover({ id: nd.id, x: pos.x, y: pos.y })}
          onPointerLeave={() => setHover((h) => (h?.id === nd.id ? null : h))}
        >
          <circle className="n2d-halo" r={R * 2.6} fill={color} opacity={0.16 + 0.2 * strength} />
          <circle
            r={R}
            fill={color}
            stroke={light ? '#ffffff' : 'rgba(255,255,255,.85)'}
            strokeWidth={1.2}
          />
          {(isRoot || isSel) && (
            <circle r={R + 6} fill="none" stroke={color} strokeWidth={1.6} opacity={0.8} />
          )}
          <circle r={R + 9} fill="transparent" />
          {showLabel && paper && (
            <text y={-(R + 13)} textAnchor="middle" className="n2d-label">
              {short(paper.title, isRoot || isSel ? 44 : 30)}
            </text>
          )}
        </g>
      )
    })

  const hp = hover ? paperById.get(hover.id) : undefined
  const hn = hover ? nodeById.get(hover.id) : undefined
  const opacity = dir === 'in' ? tr : dir === 'out' ? 1 - tr : 1

  return (
    <div
      ref={rootRef}
      className={`map2d${light ? ' is-light' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ opacity, pointerEvents: dir === 'idle' ? 'auto' : 'none' }}
      role="group"
      aria-label="Bản đồ 2D các bài báo. Lăn chuột để thu phóng, kéo để di chuyển."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    >
      <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
        <g>{linkEls}</g>
        <g>{nodeEls}</g>
      </svg>
      {dir === 'idle' && (
        <div className="map2d-controls" role="group" aria-label="Thu phóng bản đồ">
          <button
            type="button"
            aria-label="Phóng to"
            title="Phóng to (+)"
            onClick={() => stepZoom(1.35)}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Thu nhỏ"
            title="Thu nhỏ (−)"
            onClick={() => stepZoom(1 / 1.35)}
          >
            <Minus size={16} />
          </button>
          <span className="map2d-zoom" aria-live="off">
            {Math.round(view.k * 100)}%
          </span>
          <button
            type="button"
            aria-label="Đặt lại góc nhìn"
            title="Đặt lại góc nhìn (0)"
            onClick={() => flyTo(IDENTITY)}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      )}
      {hover && hp && (
        <div
          className="map2d-tip"
          style={{
            left: Math.max(8, Math.min(hover.x + 16, size.w - 320)),
            top: Math.max(8, hover.y - 14),
          }}
        >
          <span>
            {GROUPS[hp.group].label} · {hp.year}
          </span>
          <strong>{hp.title}</strong>
          <small>
            {hn && hn.score !== null
              ? `cos ${hn.score.toFixed(3)} · ${similarityTone(hn.score).label} · Bấm để xem thông tin`
              : 'Bấm để xem thông tin'}
          </small>
        </div>
      )}
    </div>
  )
}
