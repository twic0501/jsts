import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { BookOpen, Bookmark, Sparkles, Check, Orbit } from 'lucide-react'
import {
  GROUPS,
  SemanticIndex,
  validateSnapshot,
  corpusSchema,
  searchSchema,
  searchResultSchema,
  documentFallbackReport,
  type ResearchReport,
  type Corpus,
  type Group,
  type Paper,
  type SearchResult,
} from '@paper-galaxy/core'
import corpusFile from '../../../data/corpus.json'
import snapshotFile from '../../../data/semantic-snapshot.json'
import { embedQueryLocal } from './semantic/client'
import { loadCorpus, saveCorpus } from './storage'
import { useProtectedBookmarks } from './features/auth/context/useProtectedBookmarks'
import { SIMILARITY_BANDS } from './scene/ritual'
import { useNetworkQuality } from './useNetworkQuality'
import PaperDossier from './PaperDossier'
import TopNav, { type Page } from './components/layout/TopNav'
import FilterPanel from './components/layout/FilterPanel'
import SavedPage from './components/layout/SavedPage'
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  scoreBounds,
  yearBounds,
  type Filters,
} from './filters'
import Sidebar from './components/layout/Sidebar'
import SearchHero from './components/layout/SearchHero'
import ResultsPanel from './components/layout/ResultsPanel'
import Modals from './components/layout/Modals'
import './light-theme.css'

const MagicBook = lazy(() => import('./scene/MagicBook'))
const initialCorpus = corpusSchema.parse(corpusFile)
const snapshot = validateSnapshot(initialCorpus, snapshotFile)
type Source = 'connecting' | 'api-json' | 'api-mongodb' | 'local'

export default function App() {
  const [corpus, setCorpus] = useState<Corpus>(initialCorpus),
    [source, setSource] = useState<Source>('connecting')

  // Quản lý trạng thái Sáng / Tối
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('paper-magic-theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // Vẫn dùng giao diện theo hệ điều hành nếu trình duyệt chặn lưu trữ.
    }
    // Lần đầu vào trang: theo cài đặt của hệ điều hành
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.theme = theme // để CSS dùng :root[data-theme='light']
    root.style.colorScheme = theme // scrollbar, input... đổi theo theme
    root.style.backgroundColor = theme === 'dark' ? '#020617' : '#f6f7fd'
    try {
      localStorage.setItem('paper-magic-theme', theme)
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    []
  )

  const [searchEpoch, setSearchEpoch] = useState(0)
  // Trang đang xem (đồng bộ với #saved trên thanh địa chỉ để nút Back của trình duyệt dùng được) và bộ lọc
  const [page, setPage] = useState<Page>(() =>
    typeof window !== 'undefined' && window.location.hash === '#saved' ? 'saved' : 'explore'
  )
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [group, setGroup] = useState<Group | 'all'>('all'),
    [year] = useState('all')
  const [selected, setSelected] = useState<Paper | null>(null),
    [savedOnly, setSavedOnly] = useState(false),
    [searching, setSearching] = useState(false)
  const [result, setResult] = useState<SearchResult>(() =>
    new SemanticIndex(initialCorpus, snapshot).search({ query: '', topK: 50 })
  )
  const [completedQuery, setCompletedQuery] = useState('')
  const [research, setResearch] = useState<ResearchReport | null>(null),
    [researchOpen, setResearchOpen] = useState(false)
  const [offlineReady, setOfflineReady] = useState(
    () => document.documentElement.dataset.offlineReady === 'true'
  )
  useEffect(() => {
    const update = (event: Event) =>
      setOfflineReady(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener('paper-magic-offline-ready', update)
    return () => window.removeEventListener('paper-magic-offline-ready', update)
  }, [])
  const [castId, setCastId] = useState(0)
  const filterReplayTimer = useRef<number | undefined>(undefined)
  const cancelFilterReplay = useCallback(() => {
    window.clearTimeout(filterReplayTimer.current)
    filterReplayTimer.current = undefined
  }, [])
  useEffect(() => cancelFilterReplay, [cancelFilterReplay])
  const pendingOpen = useRef<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(() => window.matchMedia('(min-width: 1100px)').matches),
    [detailsOpen, setDetailsOpen] = useState(false)
  const [reading, setReading] = useState(false) // true = đang mở sách 3D để đọc từng trang
  const dossierPanelRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (dossierPanelRef.current) dossierPanelRef.current.scrollTop = 0
  }, [selected?.id])
  const visited = useRef<Set<string>>(new Set()) // các bài đã xem trong lượt khám phá này
  const selectPaper = useCallback((paper: Paper | null) => {
    cancelFilterReplay()
    pendingOpen.current = null
    setSelected(paper)
    if (paper) visited.current.add(paper.id)
    if (paper) {
      setLibraryOpen(false)
      setDetailsOpen(true) // bấm đốm sáng → mở bảng thông tin ở góc phải
    } else {
      setDetailsOpen(false)
      setReading(false)
    }
  }, [cancelFilterReplay])
  useEffect(() => {
    if (!selected) {
      setReading(false)
      visited.current.clear()
    }
  }, [selected])

  // Chế độ hiển thị: tự chuyển 2D khi mạng yếu / mất kết nối, hoặc người dùng tự chọn 3D / 2D
  const { quality: net } = useNetworkQuality()
  const [viewPref, setViewPref] = useState<'auto' | '3d' | '2d'>(() => {
    try {
      const saved = localStorage.getItem('paper-magic-view')
      return saved === '3d' || saved === '2d' ? saved : 'auto'
    } catch {
      return 'auto'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('paper-magic-view', viewPref)
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
  }, [viewPref])
  const viewMode: '3d' | '2d' = viewPref === 'auto' ? (net === 'good' ? '3d' : '2d') : viewPref
  useEffect(() => {
    if (viewMode === '2d' && reading) setReading(false) // sách 3D chỉ có ở chế độ 3D
  }, [viewMode, reading])
  const prevMode = useRef(viewMode)
  useEffect(() => {
    if (prevMode.current !== viewMode && viewPref === 'auto') {
      setNotice(
        viewMode === '2d'
          ? net === 'offline'
            ? 'Mất kết nối: đã chuyển sang bản đồ 2D để chạy nhẹ hơn.'
            : 'Mạng yếu: đã chuyển sang bản đồ 2D để chạy nhẹ hơn.'
          : 'Kết nối đã ổn định: quay lại không gian 3D.'
      )
    }
    prevMode.current = viewMode
  }, [viewMode, viewPref, net])

  useEffect(() => {
    const sync = () => setPage(window.location.hash === '#saved' ? 'saved' : 'explore')
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])
  const goPage = useCallback((next: Page) => {
    cancelFilterReplay()
    setPage(next)
    setFilterOpen(false)
    setLibraryOpen(false)
    setResearchOpen(false)
    if (next === 'saved') setDetailsOpen(false)
    const hash = next === 'saved' ? '#saved' : ''
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash || window.location.pathname + window.location.search)
    }
  }, [cancelFilterReplay])
  const [help, setHelp] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [notice, setNotice] = useState('')
  const { saved, busyIds: bookmarkBusy, setSaved: setAccountBookmark, isMockAccount, status: bookmarkStatus, message: bookmarkMessage } = useProtectedBookmarks(setNotice)
  const searchRef = useRef<HTMLInputElement>(null)
  const baseIndex = useMemo(() => new SemanticIndex(corpus, snapshot), [corpus])
  // Chỉ dùng bộ dữ liệu cục bộ (đã bỏ tìm kiếm trên mạng)
  const activeCorpus = corpus,
    activeSnapshot = snapshot
  const index = baseIndex
  useEffect(() => {
    const abort = new AbortController()
    let active = true
    ;(async () => {
      try {
        const response = await fetch('/api/v1/papers', { signal: abort.signal })
        if (!response.ok) throw new Error('API unavailable')
        const raw: unknown = await response.json()
        const data = corpusSchema.parse(raw)
        if (!active) return
        setCorpus(data)
        const storage = raw && typeof raw === 'object' && 'storage' in raw ? raw.storage : 'json'
        setSource(storage === 'mongodb' ? 'api-mongodb' : 'api-json')
        saveCorpus(data).catch(() =>
          setNotice('Không lưu được bản sao offline. Bộ dữ liệu đóng gói vẫn dùng được.')
        )
      } catch {
        if (abort.signal.aborted || !active) return
        try {
          const local = await loadCorpus()
          if (active) {
            setCorpus(local || initialCorpus)
            setSource('local')
          }
        } catch {
          if (active) setSource('local')
        }
      }
    })()
    return () => {
      active = false
      abort.abort()
    }
  }, [])
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (document.querySelector('[aria-modal="true"]')) return
        goPage('explore')
        requestAnimationFrame(() => searchRef.current?.focus())
      }
      if (e.key === 'Escape') {
        setHelp(false)
        setSidebar(false)
        setLibraryOpen(false)
        setDetailsOpen(false)
        setResearchOpen(false)
        setFilterOpen(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [goPage])
  useEffect(() => {
    const abort = new AbortController()
    let active = true
    const input = searchSchema.parse({
      query,
      topK: 50,
      ...(group !== 'all' ? { group } : {}),
      ...(year !== 'all' ? { yearFrom: Number(year) } : {}),
    })
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const local = async () => {
        try {
          const started = performance.now(),
            localIndex = baseIndex
          const vector = input.query ? await embedQueryLocal(input.query) : undefined
          if (!active) return
          const result = localIndex.search(input, vector)
          if (vector) result.queryPoint = localIndex.projectQuery(vector)
          result.durationMs = performance.now() - started
          setResult(result)
          setResearch(input.query ? documentFallbackReport(input.query, result) : null)
          setCompletedQuery(input.query)
        } catch (error) {
          if (active) {
            setNotice(error instanceof Error ? error.message : 'Không chạy được AI offline.')
            setResult({
              items: [],
              total: 0,
              durationMs: 0,
              method: 'semantic',
              datasetVersion: corpus.version,
            })
            setCompletedQuery(input.query)
          }
        } finally {
          if (active) setSearching(false)
        }
      }
      if (source === 'local' || source === 'connecting') {
        await local()
        return
      }
      try {
        const response = await fetch('/api/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: abort.signal,
        })
        if (!response.ok) throw new Error('Search unavailable')
        const raw: unknown = await response.json()
        const parsed = searchResultSchema.parse(raw)
        if (parsed.datasetVersion !== corpus.version) throw new Error('Dataset version mismatch')
        if (active) {
          const { queryPoint, ...rest } = parsed
          const apiResult = queryPoint ? { ...rest, queryPoint } : rest
          setResult(apiResult)
          setResearch(input.query ? documentFallbackReport(input.query, apiResult) : null)
          setCompletedQuery(input.query)
          setSearching(false)
        }
      } catch {
        if (!active || abort.signal.aborted) return
        setSource('local')
        await local()
      }
    }, 180)
    return () => {
      active = false
      abort.abort()
      window.clearTimeout(timer)
    }
  }, [query, group, year, baseIndex, source, corpus.version, searchEpoch])
  // Kết quả sau khi lọc: năm → ngưỡng cosine → số lượng. Cảnh 3D/2D và danh sách đều dùng đúng tập này.
  const hits = useMemo(
    () => applyFilters(result.items, filters, Boolean(query)),
    [result, filters, query]
  )
  // Account/modal updates must not send a new filter array to the scene.
  const visiblePaperIds = useMemo(() => hits.map(hit => hit.paper.id), [hits])
  const years = useMemo(() => yearBounds(activeCorpus.papers), [activeCorpus.papers])
  const scoreRange = useMemo(() => (query ? scoreBounds(result.items) : null), [query, result])
  const paperById = useMemo(
    () => new Map(activeCorpus.papers.map((p) => [p.id, p])),
    [activeCorpus.papers]
  )
  const savedPapers = useMemo(
    () => saved.map((id) => paperById.get(id)).filter((p): p is Paper => Boolean(p)),
    [saved, paperById]
  )
  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(GROUPS).map((g) => [g, activeCorpus.papers.filter((p) => p.group === g).length])
      ),
    [activeCorpus]
  )

  const neighbors = useMemo(() => (selected ? index.neighbors(selected, 5) : []), [selected, index])
  // "Bài tiếp theo" = bài gần nhất (cosine) trong "Theo dấu những kết nối" mà bạn chưa xem; tránh quay vòng A ↔ B
  const nextPaper = useMemo(() => {
    if (!selected) return null
    const fresh = neighbors.find((n) => !visited.current.has(n.paper.id))
    return (fresh ?? neighbors[0])?.paper ?? null
  }, [selected, neighbors])
  const visualScores = useMemo(
    () =>
      query
        ? completedQuery === query && !searching
          ? result.items.map((h) => ({ id: h.paper.id, score: h.score }))
          : []
        : selected
          ? index
              .neighbors(selected, activeCorpus.papers.length - 1)
              .map((h) => ({ id: h.paper.id, score: h.score }))
              .concat({ id: selected.id, score: 1 })
          : [],
    [selected, index, activeCorpus.papers.length, query, result, completedQuery, searching]
  )
  function search(value: string) {
    const parsed = searchSchema.safeParse({ query: value, topK: 50 })
    if (!parsed.success) {
      setNotice('Câu tìm kiếm tối đa 300 ký tự.')
      return
    }
    cancelFilterReplay()
    const next = parsed.data.query
    pendingOpen.current = next || null
    if (next) setCastId((id) => id + 1)
    setSelected(null)
    setSearching(true)
    setSearchEpoch((n) => n + 1)
    setDetailsOpen(false)
    setResearchOpen(false)
    setResearch(null)
    setQuery(next)
    setDraft(value)
    setSavedOnly(false)
    setNotice('')
    setFilters((f) => ({ ...f, minScore: null })) // dải cosine của câu mới khác câu cũ
    goPage('explore')
    setLibraryOpen(true)
  }
  /** Từ trang "Bài đã lưu": quay về không gian 3D và chọn đúng bài đó (bỏ câu tìm kiếm để bài nào cũng hiện). */
  function openFromSaved(paper: Paper) {
    search('')
    setFilters(NO_FILTERS)
    setGroup('all')
    selectPaper(paper)
  }
  function bookmark(paper: Paper) {
    setAccountBookmark(paper.id, !saved.includes(paper.id))
  }
  function chooseGroup(value: Group | 'all') {
    if (value === group) return
    cancelFilterReplay()
    pendingOpen.current = null
    setSearching(true)
    setGroup(value)
    setSelected(null)
    setReading(false)
    setDetailsOpen(false)
    setSidebar(false)
    setCastId((id) => id + 1)
  }
  function changeFilters(next: Filters) {
    if (
      next.yearMin === filters.yearMin && next.yearMax === filters.yearMax &&
      next.topK === filters.topK && next.minScore === filters.minScore
    ) return
    setFilters(next)
    cancelFilterReplay()
    // Filter locally right away; replay once after the user pauses dragging a slider.
    filterReplayTimer.current = window.setTimeout(() => {
      filterReplayTimer.current = undefined
      pendingOpen.current = null
      setSelected(null)
      setReading(false)
      setDetailsOpen(false)
      setCastId((id) => id + 1)
    }, 220)
  }
  const isLocal = source === 'local'

  return (
    <div
      className={`app-shell immersive ${libraryOpen ? 'library-open' : ''} ${detailsOpen && !reading ? 'details-open' : ''} ${selected && reading ? 'has-reader' : ''} ${page === 'saved' ? 'page-saved' : ''}`}
    >
      <div className="ambient-wash" aria-hidden="true" />

      <TopNav
        page={page}
        setPage={goPage}
        savedCount={saved.length}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        activeFilters={activeFilterCount(filters, Boolean(query))}
        libraryOpen={libraryOpen}
        setLibraryOpen={setLibraryOpen}
        detailsOpen={detailsOpen}
        setDetailsOpen={(open) => {
          setDetailsOpen(open)
          if (open) setReading(false)
        }}
        researchOpen={researchOpen}
        setResearchOpen={setResearchOpen}
        hasResearch={!!research}
        isLocal={isLocal}
        source={source}
        hasSelected={!!selected}
        theme={theme}
        toggleTheme={toggleTheme}
        setHelp={(open) => {
          setFilterOpen(false)
          setHelp(open)
        }}
      />
      {filterOpen && page === 'explore' && (
        <FilterPanel
          filters={filters}
          setFilters={changeFilters}
          years={years}
          scores={scoreRange}
          hasQuery={Boolean(query)}
          shown={hits.length}
          total={result.items.length}
          onClose={() => setFilterOpen(false)}
        />
      )}

      <Sidebar
        sidebar={sidebar}
        setSidebar={setSidebar}
        chooseGroup={chooseGroup}
        counts={counts}
        totalPapers={corpus.papers.length}
      />

      <main id="explore-content" inert={page === 'saved'}>
        <SearchHero
          draft={draft}
          setDraft={setDraft}
          searchRef={searchRef}
          search={search}
          offlineReady={offlineReady}
          searching={searching}
          query={query}
          savedOnly={savedOnly}
        />

        <div className="workspace-heading">
          <span>
            <span className="workspace-symbol">✧</span> Không gian khám phá
          </span>
          <span>
            {corpus.papers.length} bài báo <i /> 4 lĩnh vực <i /> AI trên máy
          </span>
        </div>

        <div className="explorer-grid">
          <div className="book-column">
            <Suspense
              fallback={
                <div className="magic-viewport scene-placeholder">
                  <Sparkles />
                  Đang chuẩn bị cuốn sách…
                </div>
              }
            >
              <MagicBook
                paper={selected}
                snapshot={activeSnapshot}
                papers={activeCorpus.papers}
                onSelect={selectPaper}
                visibleIds={visiblePaperIds}
                queryPoint={
                  !searching && completedQuery === query ? (result.queryPoint ?? null) : null
                }
                castId={castId}
                searching={searching}
                scores={visualScores}
                theme={theme}
                openBook={reading && !!selected}
                nextPaper={nextPaper}
                viewMode={viewMode}
                viewPref={viewPref}
                setViewPref={setViewPref}
                net={net}
                suspended={page === 'saved'}
              />
            </Suspense>
            <div className="under-scene">
              <span>
                <span className="tiny-orbit">◎</span> Không gian dựng bằng toán học
              </span>
              <span>Không ảnh dựng sẵn · Không video</span>
            </div>
          </div>

          <ResultsPanel
            result={result}
            completedQuery={completedQuery}
            savedOnly={savedOnly}
            query={query}
            hits={hits}
            searching={searching}
            group={group}
            chooseGroup={chooseGroup}
            onResetFilters={() => changeFilters(NO_FILTERS)}
            search={search}
            setSavedOnly={setSavedOnly}
            selected={selected}
            selectPaper={selectPaper}
            setNotice={setNotice}
            saved={saved}
            bookmarkBusy={bookmarkBusy}
            bookmark={bookmark}
            onClose={() => setLibraryOpen(false)}
          />
        </div>

        <div className="similarity-legend glass">
          <div>
            <span className="legend-icon">
              <Orbit size={19} />
            </span>
            <span>
              <strong>Màu của những kết nối</strong>
              <small>
                {query
                  ? 'So với câu tìm kiếm'
                  : selected
                    ? 'So với bài đang đọc'
                    : 'Màu xuất hiện khi tìm hoặc chọn một bài'}
              </small>
            </span>
          </div>
          <div className="legend-levels">
            <span>
              <i className="tone-very-high" /> Rất cao <small>≥ {SIMILARITY_BANDS.veryHigh}</small>
            </span>
            <span>
              <i className="tone-high" /> Cao{' '}
              <small>
                {SIMILARITY_BANDS.high}–{SIMILARITY_BANDS.veryHigh}
              </small>
            </span>
            <span>
              <i className="tone-medium" /> Vừa{' '}
              <small>
                {SIMILARITY_BANDS.medium}–{SIMILARITY_BANDS.high}
              </small>
            </span>
            <span>
              <i className="tone-low" /> Thấp <small>&lt; {SIMILARITY_BANDS.medium}</small>
            </span>
          </div>
          <p>
            Cosine từ vector 384D.
            <br />
            Không phải % độ chính xác.
          </p>
        </div>

        <section
          id="paper-details"
          ref={dossierPanelRef}
          className={`detail-panel glass ${selected ? 'has-selection' : ''}`}
          aria-label="Thông tin bài báo"
        >
          {selected ? (
            <PaperDossier
              paper={selected}
              saved={saved.includes(selected.id)}
              bookmarkBusy={bookmarkBusy.has(selected.id)}
              onSave={() => void bookmark(selected)}
              onSelect={selectPaper}
              neighbors={neighbors}
              onNotice={setNotice}
              score={query ? (visualScores.find((s) => s.id === selected.id)?.score ?? null) : null}
              {...(viewMode === '3d' ? { onOpenBook: () => {
                setDetailsOpen(false)
                setReading(true)
              } } : {})}
              onClose={() => selectPaper(null)}
            />
          ) : (
            <div className="detail-empty">
              <span className="detail-book-icon">
                <BookOpen size={26} />
              </span>
              <div>
                <h2>Những khám phá lớn bắt đầu bằng một câu hỏi nhỏ.</h2>
                <p>Tìm một chủ đề để đánh thức cuốn sách, hoặc mở một bài từ thư viện.</p>
              </div>
              <span className="detail-sparkle">✧</span>
            </div>
          )}
        </section>

        <footer className="page-footer">
          <a className="footer-brand" href="/">
            paper magic<span>Made for curious minds.</span>
          </a>
          <span>
            <Check size={12} /> Tìm kiếm AI cục bộ · Dữ liệu trên máy
          </span>
          <button onClick={() => setHelp(true)}>
            Một chút hướng dẫn
            <Bookmark size={12} />
          </button>
        </footer>
      </main>

      {page === 'saved' && (
        <SavedPage
          papers={savedPapers}
          isMockAccount={isMockAccount}
          bookmarkStatus={bookmarkStatus}
          bookmarkMessage={bookmarkMessage}
          bookmarkBusy={bookmarkBusy}
          onOpen={openFromSaved}
          onRemove={(paper) => setAccountBookmark(paper.id, false)}
          onBack={() => goPage('explore')}
        />
      )}

      <Modals
        researchOpen={researchOpen}
        research={research}
        papers={activeCorpus.papers}
        setResearchOpen={setResearchOpen}
        selectPaper={selectPaper}
        notice={notice}
        setNotice={setNotice}
        help={help}
        setHelp={setHelp}
        totalPapers={corpus.papers.length}
      />
    </div>
  )
}
