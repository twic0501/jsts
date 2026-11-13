import { useEffect, useRef, useState } from 'react'
import {
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
} from 'lucide-react'
import { GROUPS, type Paper, type SemanticSnapshot, type Point3 } from '@paper-galaxy/core'
import {
  createBookScene,
  type BookSceneHandle,
  type Export2D,
  type ReadingState,
  type SpatialHover,
} from './create-book-scene'
import MapView2D from './MapView2D'
import type { PageFocus } from './spatial-layout'
import { SIMILARITY_BANDS, similarityTone } from './ritual'
const phaseLabels = {
  idle: 'Một câu hỏi mới đang chờ bạn.',
  waiting: 'Đang hiểu câu hỏi và tính độ tương đồng…',
  vortex: '01 · Chữ tìm về các node liên quan — thưa rồi nhanh dần',
  charging: '02 · Các node tích sáng trong ba nhịp',
  channeling: '03 · Truyền tri thức vào hố đen trên sách',
  sealing: 'Hố đen thu nhỏ và khép lại…',
  closing: 'Khép sách, giữ lại những kết nối…',
  settling: 'Cuốn sách hạ nhẹ xuống bục…',
  zooming: 'Đến gần trang tri thức…',
  opening: 'Mở sách để đọc…',
  reading: 'Kéo để khám phá · Chọn trái/phải để đọc lớn',
  'turn-framing': 'Lùi góc nhìn để lật trang…',
  turning: 'Lật sang một góc nhìn mới…',
  'exit-closing': 'Khép lại trang sách…',
  'exit-zoom': 'Lùi lại để giải phóng tri thức…',
  'exit-reopen': 'Mở sách trước khi giải phóng chữ…',
  'exit-release': 'Chữ trở về các node, rồi bay ra không gian',
  'exit-opening': 'Cuốn sách tiếp tục lơ lửng…',
}
export default function MagicBook({
  paper,
  snapshot,
  papers,
  onSelect,
  visibleIds,
  queryPoint,
  castId,
  searching,
  scores,
  theme,
  toggleTheme,
  openBook,
  nextPaper,
  viewMode,
  viewPref,
  setViewPref,
  net,
  suspended,
}: {
  viewMode: '3d' | '2d'
  viewPref: 'auto' | '3d' | '2d'
  setViewPref: (v: 'auto' | '3d' | '2d') => void
  net: 'good' | 'poor' | 'offline'
  suspended: boolean
  theme: 'light' | 'dark'
  toggleTheme: () => void
  openBook: boolean
  nextPaper: Paper | null
  paper: Paper | null
  snapshot: SemanticSnapshot
  papers: Paper[]
  onSelect: (paper: Paper | null) => void
  visibleIds: string[]
  queryPoint: Point3 | null
  castId: number
  searching: boolean
  scores: { id: string; score: number }[]
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<BookSceneHandle | null>(null),
    container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('loading'),
    [paused, setPaused] = useState(false),
    [focus, setFocus] = useState<PageFocus>('auto'),
    [hover, setHover] = useState<SpatialHover>(null)
  const [reading, setReading] = useState<ReadingState>({ phase: 'idle', spread: 0, spreads: 1 })
  const [snap2d, setSnap2d] = useState<Export2D | null>(null),
    [show2D, setShow2D] = useState(false),
    [dir2d, setDir2d] = useState<'in' | 'out' | 'idle'>('idle')
  const want2D = viewMode === '2d',
    prevWant = useRef(false),
    pause2D = useRef(false),
    reducedMotion = useRef(
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  pause2D.current = suspended || (want2D && dir2d === 'idle')
  useEffect(() => {
    if (!canvas.current) return
    try {
      scene.current = createBookScene(
        canvas.current,
        setStatus,
        snapshot,
        papers,
        onSelect,
        setReading,
        setHover
      )
    } catch (error) {
      console.error('Book scene initialization failed', error)
      setStatus('failed')
    }
    return () => {
      scene.current?.dispose()
      scene.current = null
    }
  }, [snapshot, papers, onSelect])
  useEffect(() => {
    if (castId) {
      setPaused(false)
      scene.current?.setPaused(pause2D.current)
      scene.current?.startSearch()
    }
  }, [castId, papers])
  useEffect(() => {
    if (paper && openBook) {
      setPaused(false)
      scene.current?.setPaused(false)
      scene.current?.select(paper)
    } else {
      scene.current?.select(null)
    }
    scene.current?.inspect(openBook ? null : paper)
  }, [paper, openBook, papers, castId])
  useEffect(() => {
    scene.current?.setPaused(paused || suspended || (want2D && dir2d === 'idle'))
  }, [paused, suspended, want2D, dir2d, papers])
  useEffect(() => {
    scene.current?.focusPage(focus)
  }, [focus, papers])
  useEffect(() => {
    scene.current?.filter(visibleIds)
  }, [visibleIds, papers])
  useEffect(() => {
    scene.current?.setQuery(queryPoint)
  }, [queryPoint, papers])
  useEffect(() => {
    scene.current?.setScores(scores)
  }, [scores, papers])
  useEffect(() => {
    ;(scene.current as unknown as { setTheme?: (t: 'light' | 'dark') => void } | null)?.setTheme?.(
      theme
    )
  }, [theme, papers, snapshot])
  const shown = useRef(0)
  useEffect(() => {
    if (searching || !castId || shown.current === castId) return
    shown.current = castId
    scene.current?.showResults()
  }, [searching, castId, scores, papers])
  useEffect(() => {
    if (prevWant.current === want2D) return
    prevWant.current = want2D
    setSnap2d(scene.current?.export2D() ?? null)
    if (want2D) {
      setShow2D(true)
      setDir2d(reducedMotion.current ? 'idle' : 'in')
      requestAnimationFrame(() => setSnap2d((prev) => prev ?? scene.current?.export2D() ?? null))
    } else if (reducedMotion.current) {
      setShow2D(false)
      setDir2d('idle')
    } else setDir2d('out')
  }, [want2D])
  useEffect(() => {
    if (!show2D || !want2D || dir2d !== 'idle') return
    const id = requestAnimationFrame(() => setSnap2d(scene.current?.export2D() ?? null))
    return () => cancelAnimationFrame(id)
  }, [show2D, want2D, dir2d, scores, visibleIds, paper, castId, searching, papers])
  function end2D() {
    if (dir2d === 'out') setShow2D(false)
    setDir2d('idle')
  }
  const isReading = reading.phase === 'reading'
  function close() {
    scene.current?.empty()
    onSelect(null)
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        scene.current?.empty()
        onSelect(null)
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (e.key === 'ArrowRight') scene.current?.turn(1)
      if (e.key === 'ArrowLeft') scene.current?.turn(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onSelect])
  return (
    <div className={`magic-viewport${want2D ? ' is-2d' : ''}`} data-theme={theme} ref={container}>
      <div className="scene-heading">
        <div>
          <span className="scene-eyebrow">
            <span className="scene-dot" /> YOUR LIVING UNIVERSE
          </span>
          <h2>Tri thức luôn kết nối.</h2>
        </div>
        <div className="scene-actions">
          <span className="view-switch" role="group" aria-label="Chế độ hiển thị">
            {(['auto', '3d', '2d'] as const).map((v) => (
              <button
                key={v}
                className={viewPref === v ? 'active' : ''}
                aria-pressed={viewPref === v}
                title={
                  v === 'auto'
                    ? 'Tự chuyển sang 2D khi mạng yếu hoặc mất kết nối'
                    : v === '3d'
                      ? 'Luôn dùng không gian 3D'
                      : 'Luôn dùng bản đồ 2D (nhẹ hơn)'
                }
                onClick={() => setViewPref(v)}
              >
                {v === 'auto' ? 'Tự động' : v.toUpperCase()}
              </button>
            ))}
          </span>
          {net !== 'good' && (
            <span className={`net-pill ${net}`} role="status">
              <i />
              {net === 'offline' ? 'Mất kết nối' : 'Mạng yếu'}
              {want2D ? ' · 2D' : ''}
            </span>
          )}
          <button
            className="scene-icon theme-toggle"
            title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {paper && openBook && (
            <button className="scene-icon exit-reader" onClick={close} aria-label="Thoát đọc sách">
              <X size={15} />
              Thoát
            </button>
          )}
          <button
            className="scene-icon"
            title="Toàn màn hình"
            aria-label="Toàn màn hình sách"
            onClick={() => {
              container.current
                ?.requestFullscreen()
                .catch(() => setStatus('fullscreen-unavailable'))
            }}
          >
            <Maximize2 size={17} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvas}
        className={`book-canvas${want2D ? ' is-2d' : ''}`}
        data-testid="magic-book"
        aria-label="Cuốn sách ma thuật 3D. Kéo chuột để xoay, cuộn để phóng to."
      />
      {show2D && (
        <MapView2D
          snap={snap2d}
          dir={dir2d}
          onEnd={end2D}
          papers={papers}
          selectedId={paper?.id ?? null}
          onSelect={onSelect}
          theme={theme}
          searching={searching}
          castId={castId}
        />
      )}
      {status === 'failed' && (
        <div className="scene-fallback">
          <Sparkles size={36} />
          <p>Thiết bị chưa hỗ trợ không gian 3D.</p>
          <small>Bạn vẫn có thể tìm và đọc bài báo bên dưới.</small>
        </div>
      )}
      {status === 'loading' && <div className="scene-loading">Đang mở không gian tri thức…</div>}
      <div className="spatial-caption">
        <strong>{visibleIds.length} bài báo trong cùng không gian</strong>
        <span>Rê vào đốm sáng để xem tên · Bấm để mở sách</span>
      </div>
      <div className="map-legend">
        {scores.length ? (
          <>
            <span>
              <i style={{ background: similarityTone(1).color }} />
              Cos ≥ {SIMILARITY_BANDS.veryHigh}
            </span>
            <span>
              <i style={{ background: similarityTone(SIMILARITY_BANDS.high).color }} />
              {SIMILARITY_BANDS.high}–{SIMILARITY_BANDS.veryHigh}
            </span>
            <span>
              <i style={{ background: similarityTone(SIMILARITY_BANDS.medium).color }} />
              {SIMILARITY_BANDS.medium}–{SIMILARITY_BANDS.high}
            </span>
            <span>
              <i style={{ background: similarityTone(0).color }} />
              &lt; {SIMILARITY_BANDS.medium}
            </span>
          </>
        ) : (
          Object.values(GROUPS).map((g) => (
            <span key={g.short}>
              <i style={{ background: g.color }} />
              {g.short}
            </span>
          ))
        )}
        {queryPoint && (
          <span>
            <i style={{ background: '#fff3ad' }} />
            Câu hỏi
          </span>
        )}
      </div>
      {hover && (
        <button
          className="spatial-tooltip"
          data-paper-id={hover.paper.id}
          onClick={() => onSelect(hover.paper)}
        >
          <span>
            {GROUPS[hover.paper.group].label} · {hover.paper.year}
          </span>
          <strong>{hover.paper.title}</strong>
          <small>
            {hover.score === null
              ? 'Bấm để mở bài báo trong sách'
              : `cos ${hover.score.toFixed(3)} · Bấm để mở sách`}
          </small>
        </button>
      )}
      {paper && (isReading || reading.phase === 'turning' || reading.phase === 'turn-framing') && (
        <>
          <div className="reader-page-focus">
            <button
              aria-label="Xem hai trang"
              className={focus === 'both' ? 'active' : ''}
              onClick={() => setFocus('both')}
            >
              Hai trang
            </button>
            <button
              aria-label="Phóng trang trái"
              className={focus === 'left' ? 'active' : ''}
              onClick={() => setFocus('left')}
            >
              Trang trái
            </button>
            <button
              aria-label="Phóng trang phải"
              className={focus === 'right' ? 'active' : ''}
              onClick={() => setFocus('right')}
            >
              Trang phải
            </button>
            <a
              className="reader-source"
              href={paper.sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Mở bài gốc"
            >
              {paper.provenance?.provider ?? 'arXiv'} ↗
            </a>
          </div>
          <div className="reader-navigation">
            <button
              aria-label="Trang trước"
              disabled={!isReading || reading.spread === 0}
              onClick={() => scene.current?.turn(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Trang {reading.spread * 2 + 1}–{reading.spread * 2 + 2}
              <small> / {reading.spreads * 2}</small>
            </span>
            <button
              aria-label="Trang sau"
              disabled={!isReading || reading.spread >= reading.spreads - 1}
              onClick={() => scene.current?.turn(1)}
            >
              <ChevronRight size={17} />
            </button>
            <span className="reader-divider" />
            <button
              className="next-paper"
              title={nextPaper ? `Tiếp theo: ${nextPaper.title}` : undefined}
              disabled={!isReading || !nextPaper}
              onClick={() => {
                if (nextPaper) onSelect(nextPaper)
              }}
            >
              Bài tiếp theo
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
      <div className="scene-bottom">
        <span className="scene-hint" role="status">
          {!paper && scores.length > 0 && reading.phase === 'idle'
            ? 'Bấm vào một đốm sáng để xem thông tin bài báo'
            : paper && !openBook && reading.phase === 'idle'
              ? 'Bấm đốm sáng khác để so sánh · Esc để bỏ chọn'
              : phaseLabels[reading.phase]}
        </span>
        <div className="scene-controls">
          <button aria-label="Phóng to" title="Phóng to" onClick={() => scene.current?.zoom(-1)}>
            <Plus size={16} />
          </button>
          <button aria-label="Thu nhỏ" title="Thu nhỏ" onClick={() => scene.current?.zoom(1)}>
            <Minus size={16} />
          </button>
          <span />
          <button
            aria-label={paused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động'}
            title={paused ? 'Tiếp tục' : 'Tạm dừng'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            aria-label="Đặt lại góc nhìn"
            title="Đặt lại góc nhìn"
            onClick={() => scene.current?.reset()}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="scene-guide">
        {scores.length
          ? 'Hướng theo PCA của vector thật · Càng gần tâm càng giống câu hỏi (cosine) · Kéo để xoay'
          : 'Vị trí từ PCA của vector thật · Đường nối theo cosine 384D · Kéo để xoay'}
      </div>
    </div>
  )
}
