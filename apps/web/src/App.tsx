import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react'
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
import { loadBookmarks, loadCorpus, saveCorpus, setBookmark } from './storage'
import { SIMILARITY_BANDS } from './scene/ritual'
import PaperDossier from './PaperDossier'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import SearchHero from './components/layout/SearchHero'
import ResultsPanel from './components/layout/ResultsPanel'
import Modals from './components/layout/Modals'
import { useAuth } from './features/auth/context/AuthProvider'
import VersionedReader from './VersionedReader'
import './light-theme.css'

const MagicBook = lazy(() => import('./scene/MagicBook'))
const initialCorpus = corpusSchema.parse(corpusFile)
const snapshot = validateSnapshot(initialCorpus, snapshotFile)
type Source = 'connecting' | 'api-json' | 'api-mongodb' | 'local'

export default function App() {
  const auth = useAuth()
  const [versionedReaderOpen, setVersionedReaderOpen] = useState(false)
  const [corpus, setCorpus] = useState<Corpus>(initialCorpus),
    [source, setSource] = useState<Source>('connecting')

  // Quản lý trạng thái Sáng / Tối
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('paper-magic-theme')
    if (stored === 'light' || stored === 'dark') return stored
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
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [group, setGroup] = useState<Group | 'all'>('all'),
    [year, setYear] = useState('all')
  const [selected, setSelected] = useState<Paper | null>(null),
    [saved, setSaved] = useState<string[]>([]),
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
  const pendingOpen = useRef<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false)
  const [reading, setReading] = useState(false) // true = đang mở sách 3D để đọc từng trang
  const selectPaper = useCallback((paper: Paper | null) => {
    pendingOpen.current = null
    setSelected(paper)
    if (paper) {
      setLibraryOpen(false)
      setDetailsOpen(true) // bấm đốm sáng → mở bảng thông tin ở góc phải
    } else {
      setDetailsOpen(false)
      setReading(false)
    }
  }, [])
  useEffect(() => {
    if (!selected) setReading(false)
  }, [selected])
  const [help, setHelp] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [notice, setNotice] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const baseIndex = useMemo(() => new SemanticIndex(corpus, snapshot), [corpus])
  // Chỉ dùng bộ dữ liệu cục bộ (đã bỏ tìm kiếm trên mạng)
  const activeCorpus = corpus,
    activeSnapshot = snapshot
  const index = baseIndex
  useEffect(() => {
    const abort = new AbortController()
    let active = true
    loadBookmarks()
      .then((ids) => {
        if (active) setSaved(ids)
      })
      .catch(() => {
        if (active) setNotice('Không đọc được bài đã lưu. Kiểm tra quyền lưu trữ trình duyệt.')
      })
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
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setHelp(false)
        setSidebar(false)
        setLibraryOpen(false)
        setDetailsOpen(false)
        setResearchOpen(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
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
  const hits =
    savedOnly && !query
      ? activeCorpus.papers
          .filter(
            (paper) =>
              saved.includes(paper.id) &&
              (group === 'all' || paper.group === group) &&
              (year === 'all' || paper.year >= Number(year))
          )
          .map((paper) => ({ paper, score: 0 }))
      : savedOnly
        ? result.items.filter((hit) => saved.includes(hit.paper.id))
        : result.items
  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(GROUPS).map((g) => [g, activeCorpus.papers.filter((p) => p.group === g).length])
      ),
    [activeCorpus]
  )

  const neighbors = useMemo(() => (selected ? index.neighbors(selected, 5) : []), [selected, index])
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
    const next = parsed.data.query
    pendingOpen.current = next || null
    if (next) setCastId((id) => id + 1)
    setSelected(null)
    setSearching(true)
    setSearchEpoch((n) => n + 1)
    setLibraryOpen(false)
    setDetailsOpen(false)
    setResearchOpen(false)
    setResearch(null)
    setQuery(next)
    setDraft(value)
    setSavedOnly(false)
    setNotice('')
  }
  async function bookmark(paper: Paper) {
    const next = !saved.includes(paper.id)
    try {
      await setBookmark(paper.id, next)
      setSaved((ids) => (next ? [...ids, paper.id] : ids.filter((id) => id !== paper.id)))
      setNotice(next ? 'Đã cất bài vào kệ sách của bạn.' : 'Đã bỏ bài khỏi kệ sách.')
    } catch {
      setNotice('Chưa lưu được. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.')
    }
  }
  function chooseGroup(value: Group | 'all') {
    pendingOpen.current = null
    setGroup(value)
    setSelected(null)
    setDetailsOpen(false)
    setSidebar(false)
  }
  const isLocal = source === 'local'

  return (
    <div
      className={`app-shell immersive ${libraryOpen ? 'library-open' : ''} ${detailsOpen && !reading ? 'details-open' : ''} ${selected && reading ? 'has-reader' : ''}`}
    >
      <div className="ambient-wash" aria-hidden="true" />

      {/* Đưa Header ra bên ngoài, nằm trên cùng với z-index cao để hiển thị rõ ràng */}
      <div className="versioned-reader-header-layer sticky top-0 z-50 w-full px-4 pt-2">
        <Header
          savedOnly={savedOnly}
          setSavedOnly={setSavedOnly}
          savedCount={saved.length}
          libraryOpen={libraryOpen}
          setLibraryOpen={setLibraryOpen}
          detailsOpen={detailsOpen}
          setDetailsOpen={setDetailsOpen}
          researchOpen={researchOpen}
          setResearchOpen={setResearchOpen}
          hasResearch={!!research}
          isLocal={isLocal}
          source={source}
          setHelp={setHelp}
          sidebar={sidebar}
          setSidebar={setSidebar}
          selectPaper={selectPaper}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenReader={() => setVersionedReaderOpen(true)}
          accountName={auth.state.session?.user.displayName ?? null}
          accountBusy={auth.busy || auth.state.status === 'loading'}
          onAccountAction={() => auth.state.session ? void auth.logout() : auth.openLogin()}
        />
      </div>
      {versionedReaderOpen && <VersionedReader onClose={() => setVersionedReaderOpen(false)} />}
      {auth.notice && (
        <div className="versioned-account-status" role="status">
          <span>{auth.notice}</span>
          <button type="button" onClick={auth.dismissNotice} aria-label="Đóng thông báo tài khoản">×</button>
        </div>
      )}

      <Sidebar
        sidebar={sidebar}
        setSidebar={setSidebar}
        chooseGroup={chooseGroup}
        counts={counts}
        totalPapers={corpus.papers.length}
      />

      <main>
        <SearchHero
          draft={draft}
          setDraft={setDraft}
          searchRef={searchRef}
          search={search}
          offlineReady={offlineReady}
          searching={searching}
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
                visibleIds={hits.map((h) => h.paper.id)}
                queryPoint={
                  !searching && completedQuery === query ? (result.queryPoint ?? null) : null
                }
                castId={castId}
                searching={searching}
                scores={visualScores}
                theme={theme}
                toggleTheme={toggleTheme}
                openBook={reading && !!selected}
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
            year={year}
            setYear={setYear}
            search={search}
            setSavedOnly={setSavedOnly}
            selected={selected}
            selectPaper={selectPaper}
            setNotice={setNotice}
            saved={saved}
            bookmark={bookmark}
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
          className={`detail-panel glass ${selected ? 'has-selection' : ''}`}
          aria-label="Thông tin bài báo"
        >
          {selected ? (
            <PaperDossier
              paper={selected}
              saved={saved.includes(selected.id)}
              onSave={() => void bookmark(selected)}
              onSelect={selectPaper}
              neighbors={neighbors}
              onNotice={setNotice}
              score={query ? (visualScores.find((s) => s.id === selected.id)?.score ?? null) : null}
              onOpenBook={() => setReading(true)}
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
