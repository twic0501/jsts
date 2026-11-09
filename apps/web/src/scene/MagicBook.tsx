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
  type ReadingState,
  type SpatialHover,
} from './create-book-scene'
import type { PageFocus } from './spatial-layout'
import { SIMILARITY_BANDS } from './ritual'
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
}: {
  theme: 'light' | 'dark'
  toggleTheme: () => void
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
      scene.current?.setPaused(false)
      scene.current?.startSearch()
    }
  }, [castId, papers])
  useEffect(() => {
    if (paper) {
      setPaused(false)
      scene.current?.setPaused(false)
    }
    scene.current?.select(paper)
  }, [paper, papers, castId])
  useEffect(() => {
    if (!searching && !paper && castId) scene.current?.empty()
  }, [searching, paper, castId, papers])
  useEffect(() => {
    scene.current?.setPaused(paused)
  }, [paused, papers])
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
  const isReading = reading.phase === 'reading',
    selectedIndex = visibleIds.indexOf(paper?.id ?? '')
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
    <div className="magic-viewport" data-theme={theme} ref={container}>
      <div className="scene-heading">
        <div>
          <span className="scene-eyebrow">
            <span className="scene-dot" /> YOUR LIVING UNIVERSE
          </span>
          <h2>Tri thức luôn kết nối.</h2>
        </div>
        <div className="scene-actions">
          <button
            className="scene-icon theme-toggle"
            title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {paper && (
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
        className="book-canvas"
        data-testid="magic-book"
        aria-label="Cuốn sách ma thuật 3D. Kéo chuột để xoay, cuộn để phóng to."
      />
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
              <i style={{ background: '#7cf5cd' }} />
              Cos ≥ {SIMILARITY_BANDS.high}
            </span>
            <span>
              <i style={{ background: '#8bc9ff' }} />
              {SIMILARITY_BANDS.medium}–{SIMILARITY_BANDS.high}
            </span>
            <span>
              <i style={{ background: '#d1a4ff' }} />
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
              disabled={!isReading || selectedIndex < 0 || selectedIndex >= visibleIds.length - 1}
              onClick={() => {
                const next = papers.find((p) => p.id === visibleIds[selectedIndex + 1])
                if (next) onSelect(next)
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
          {phaseLabels[reading.phase]}
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
        Vị trí từ PCA của vector thật · Đường nối theo cosine 384D · Kéo để xoay
      </div>
    </div>
  )
}
