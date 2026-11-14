import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { BookOpen, Bookmark, Sparkles, Check, Orbit } from "lucide-react";
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
} from "@paper-galaxy/core";
import corpusFile from "../../../data/corpus.json";
import snapshotFile from "../../../data/semantic-snapshot.json";
import { embedQueryLocal } from "./semantic/client";
import { loadBookmarks, loadCorpus, saveCorpus, setBookmark } from "./storage";
import { SIMILARITY_BANDS } from "./scene/ritual";
import PaperDossier from "./PaperDossier";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import SearchHero from "./components/layout/SearchHero";

import OfflinePaperPicker from "./offline/OfflinePaperPicker";
import { searchSavedOfflinePapers } from "./offline/search-saved";
import { OFFLINE_PAPERS_CHANGED, getSavedOfflinePapers } from "./offline/papers-store";
import { registerOfflineServiceWorker } from "./offline/registerServiceWorker";
import {
  OFFLINE_DATASET_CHANGED,
  loadOfflineDataset,
} from "./offline/store";
import ResultsPanel from "./components/layout/ResultsPanel";
import Modals from "./components/layout/Modals";
import "./light-theme.css";

const MagicBook = lazy(() => import("./scene/MagicBook"));

const initialCorpus = corpusSchema.parse(corpusFile);
const snapshot = validateSnapshot(initialCorpus, snapshotFile);

type Source = "connecting" | "api-json" | "api-mongodb" | "local";
type ViewPreference = "auto" | "2d" | "3d";
type NetworkStatus = "good" | "poor" | "offline";

export default function App() {
  useEffect(() => {
    void registerOfflineServiceWorker();
  }, []);
  const [corpus, setCorpus] = useState<Corpus>(initialCorpus);
  const [installedSnapshot, setInstalledSnapshot] = useState(snapshot);
  const [source, setSource] = useState<Source>("connecting");

  // Theme: quản lý giao diện sáng và tối
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("paper-magic-theme");
    if (stored === "light" || stored === "dark") return stored;

    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === "dark" ? "#020617" : "#f6f7fd";

    try {
      localStorage.setItem("paper-magic-theme", theme);
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  // Cấu hình chế độ hiển thị sách 2D / 3D
  const [viewPref, setViewPref] = useState<ViewPreference>("auto");

  // Trạng thái kết nối mạng
  const [net, setNet] = useState<NetworkStatus>(() =>
    navigator.onLine ? "good" : "offline",
  );

  // Nguoi dung co the chu dong tim kiem offline khi van co mang.
  const [manualOfflineMode, setManualOfflineMode] = useState(false);

  // Mat mang luon bat buoc su dung du lieu da luu.
  const offlineMode =
    manualOfflineMode || net === "offline" || !navigator.onLine;

  // Tự động chọn chế độ hiển thị dựa trên kết nối mạng
  const viewMode: "2d" | "3d" =
    viewPref === "auto" ? (!offlineMode && net === "good" ? "3d" : "2d") : viewPref;

  // Tạm dừng hoạt động 3D khi người dùng chuyển tab
  const [suspended, setSuspended] = useState(
    () => document.visibilityState === "hidden",
  );

  useEffect(() => {
    const handleOnline = () => setNet("good");
    const handleOffline = () => setNet("offline");

    const handleVisibilityChange = () => {
      setSuspended(document.visibilityState === "hidden");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Search state
  const [searchEpoch, setSearchEpoch] = useState(0);
  const [offlineMapIds, setOfflineMapIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let revision = 0;

    const synchronizeSavedPapers = async () => {
      const currentRevision = ++revision;

      try {
        const records = await getSavedOfflinePapers();

        if (!active || currentRevision !== revision) return;

        setOfflineMapIds(records.map((record) => record.id));
      } catch (error) {
        console.error(
          "[Paper Galaxy] Cannot read saved offline papers:",
          error,
        );

        if (active && currentRevision === revision) {
          setOfflineMapIds([]);
        }
      }
    };

    const onChanged = () => {
      void synchronizeSavedPapers();
    };

    void synchronizeSavedPapers();

    window.addEventListener(OFFLINE_PAPERS_CHANGED, onChanged);
    window.addEventListener("focus", onChanged);

    return () => {
      active = false;
      revision++;

      window.removeEventListener(OFFLINE_PAPERS_CHANGED, onChanged);
      window.removeEventListener("focus", onChanged);
    };
  }, []);

  useEffect(() => {
    const handleSavedPapersChanged = () => {
      setSearchEpoch((value) => value + 1);
    };

    window.addEventListener(
      OFFLINE_PAPERS_CHANGED,
      handleSavedPapersChanged,
    );

    return () => {
      window.removeEventListener(
        OFFLINE_PAPERS_CHANGED,
        handleSavedPapersChanged,
      );
    };
  }, []);

  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group | "all">("all");
  const [year, setYear] = useState("all");

  const [selected, setSelected] = useState<Paper | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [searching, setSearching] = useState(false);

  const [result, setResult] = useState<SearchResult>(() =>
    new SemanticIndex(initialCorpus, snapshot).search({
      query: "",
      topK: 50,
    }),
  );

  const [completedQuery, setCompletedQuery] = useState("");

  const [research, setResearch] = useState<ResearchReport | null>(null);
  const [researchOpen, setResearchOpen] = useState(false);

  // Trạng thái offline-ready
  const [offlineReady, setOfflineReady] = useState(
    () => document.documentElement.dataset.offlineReady === "true",
  );

  useEffect(() => {
    const update = (event: Event) => {
      setOfflineReady(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener("paper-magic-offline-ready", update);

    return () => {
      window.removeEventListener("paper-magic-offline-ready", update);
    };
  }, []);

  const [castId, setCastId] = useState(0);
  const pendingOpen = useRef<string | null>(null);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reading, setReading] = useState(false);

  const selectPaper = useCallback((paper: Paper | null) => {
    pendingOpen.current = null;
    setSelected(paper);

    if (paper) {
      setLibraryOpen(false);
      setDetailsOpen(true);
    } else {
      setDetailsOpen(false);
      setReading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setReading(false);
    }
  }, [selected]);

  const [help, setHelp] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [notice, setNotice] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  // Khởi tạo semantic index
  const baseIndex = useMemo(
    () => new SemanticIndex(corpus, installedSnapshot),
    [corpus, installedSnapshot],
  );

  const activeCorpus = corpus;
  const activeSnapshot = installedSnapshot;
  const index = baseIndex;

  // Đồng bộ nguồn dữ liệu với IndexedDB và API.
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    let revision = 0;

    loadBookmarks()
      .then((ids) => {
        if (active) setSaved(ids);
      })
      .catch(() => {
        if (active) {
          setNotice(
            "Không đọc được bài đã lưu. Kiểm tra quyền lưu trữ trình duyệt.",
          );
        }
      });

    const applyDataset = (
      nextCorpus: Corpus,
      nextSnapshot: typeof snapshot,
      nextSource: Source,
    ) => {
      if (!active) return;

      // React cập nhật corpus, snapshot và nguồn dữ liệu cùng đợt.
      setInstalledSnapshot(nextSnapshot);
      setCorpus(nextCorpus);
      setSource(nextSource);
    };

    const synchronizeDataset = async (allowApi: boolean) => {
      const currentRevision = ++revision;

      const isCurrent = () =>
        active && currentRevision === revision;

      try {
        // 1. Ưu tiên bộ dữ liệu đã cài vào IndexedDB.
        const stored = await loadOfflineDataset();

        if (!isCurrent()) return;

        if (stored) {
          try {
            const offlineCorpus = corpusSchema.parse(stored.corpus);
            const offlineSnapshot = validateSnapshot(
              offlineCorpus,
              stored.snapshot,
            );

            applyDataset(
              offlineCorpus,
              offlineSnapshot,
              "local",
            );

            return;
          } catch (error) {
            console.warn(
              "[Paper Galaxy] Invalid offline dataset:",
              error,
            );

            setNotice(
              "Bộ dữ liệu offline chưa hợp lệ. Đang dùng nguồn dự phòng.",
            );
          }
        }

        // 2. Chỉ gọi API lúc khởi động khi không có bộ offline hợp lệ.
        if (allowApi && navigator.onLine) {
          try {
            const response = await fetch("/api/v1/papers", {
              signal: abort.signal,
            });

            if (!response.ok) {
              throw new Error("API unavailable");
            }

            const raw: unknown = await response.json();
            const apiCorpus = corpusSchema.parse(raw);

            // Không sử dụng corpus không tương thích snapshot.
            const apiSnapshot = validateSnapshot(
              apiCorpus,
              snapshotFile,
            );

            if (!isCurrent()) return;

            const storage =
              raw && typeof raw === "object" && "storage" in raw
                ? raw.storage
                : "json";

            applyDataset(
              apiCorpus,
              apiSnapshot,
              storage === "mongodb" ? "api-mongodb" : "api-json",
            );

            void saveCorpus(apiCorpus).catch(() => {
              if (isCurrent()) {
                setNotice("Không lưu được bản sao dữ liệu API.");
              }
            });

            return;
          } catch (error) {
            if (!isCurrent()) return;

            console.warn(
              "[Paper Galaxy] API dataset unavailable:",
              error,
            );
          }
        }

        // 3. Thử dữ liệu cục bộ đã lưu theo cơ chế cũ.
        try {
          const cached = await loadCorpus();

          if (!isCurrent()) return;

          const fallbackCorpus = cached
            ? corpusSchema.parse(cached)
            : initialCorpus;

          const fallbackSnapshot = validateSnapshot(
            fallbackCorpus,
            snapshotFile,
          );

          applyDataset(
            fallbackCorpus,
            fallbackSnapshot,
            "local",
          );
        } catch {
          if (!isCurrent()) return;

          // 4. Nguồn dự phòng cuối cùng: dữ liệu đóng gói.
          applyDataset(initialCorpus, snapshot, "local");
        }
      } catch (error) {
        if (!isCurrent()) return;

        console.error(
          "[Paper Galaxy] Offline storage unavailable:",
          error,
        );

        applyDataset(initialCorpus, snapshot, "local");
      }
    };

    const handleOfflineChange = () => {
      // Mỗi thay đổi làm vô hiệu hóa lần tải dữ liệu cũ.
      void synchronizeDataset(false);
    };

    window.addEventListener(
      OFFLINE_DATASET_CHANGED,
      handleOfflineChange,
    );

    void synchronizeDataset(true);

    return () => {
      active = false;
      revision++;
      abort.abort();

      window.removeEventListener(
        OFFLINE_DATASET_CHANGED,
        handleOfflineChange,
      );
    };
  }, []);
  // Phím tắt bàn phím
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }

      if (e.key === "Escape") {
        setHelp(false);
        setSidebar(false);
        setLibraryOpen(false);
        setDetailsOpen(false);
        setResearchOpen(false);
      }
    };

    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  // Xử lý tìm kiếm
  useEffect(() => {
    const abort = new AbortController();
    let active = true;

    const input = searchSchema.parse({
      query,
      topK: 50,
      ...(group !== "all" ? { group } : {}),
      ...(year !== "all" ? { yearFrom: Number(year) } : {}),
    });

    setSearching(true);

    const timer = window.setTimeout(async () => {
      const local = async () => {
        try {
          const started = performance.now();
          const localIndex = baseIndex;

          let vector: number[] | undefined;

          if (input.query) {
            try {
              vector = await embedQueryLocal(input.query);
            } catch (error) {
              console.warn(
                "[Paper Galaxy] Offline embedding unavailable:",
                error
              );

              if (active) {
                setNotice(
                  "Model AI offline chưa khả dụng. Đang thử tìm kiếm không dùng embedding.",
                );
              }
            }
          }

          if (!active) return;

        

          const savedSearch = offlineMode
            ? await searchSavedOfflinePapers(
                input,
                corpus.version,
                vector,
              )
            : null;

          if (!active) return;

          const localResult = savedSearch
            ? savedSearch.result
            : localIndex.search(input, vector);

          if (vector && (!savedSearch || savedSearch.usedSemantic)) {
            localResult.queryPoint = localIndex.projectQuery(vector);
          }

          if (
            offlineMode &&
            savedSearch?.savedCount === 0
          ) {
            setNotice(
              "Chưa có bài báo nào được lưu để tìm kiếm offline.",
            );
          }

          localResult.durationMs = performance.now() - started;

          setResult(localResult);

          setResearch(
            input.query
              ? documentFallbackReport(input.query, localResult)
              : null,
          );

          setCompletedQuery(input.query);
        } catch (error) {
          if (active) {
            setNotice(
              error instanceof Error
                ? error.message
                : "Không chạy được AI offline.",
            );

            setResult({
              items: [],
              total: 0,
              durationMs: 0,
              method: "semantic",
              datasetVersion: corpus.version,
            });

            setCompletedQuery(input.query);
          }
        } finally {
          if (active) {
            setSearching(false);
          }
        }
      };

      if (
        offlineMode ||
        source === "local" ||
        source === "connecting"
      ) {
        await local();
        return;
      }

      try {
        const response = await fetch("/api/v1/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
          signal: abort.signal,
        });

        if (!response.ok) {
          throw new Error("Search unavailable");
        }

        const raw: unknown = await response.json();
        const parsed = searchResultSchema.parse(raw);

        if (parsed.datasetVersion !== corpus.version) {
          throw new Error("Dataset version mismatch");
        }

        if (active) {
          const { queryPoint, ...rest } = parsed;

          const apiResult = queryPoint ? { ...rest, queryPoint } : rest;

          setResult(apiResult);

          setResearch(
            input.query ? documentFallbackReport(input.query, apiResult) : null,
          );

          setCompletedQuery(input.query);
          setSearching(false);
        }
      } catch {
        if (!active || abort.signal.aborted) return;

        setSource("local");
        await local();
      }
    }, 180);

    return () => {
      active = false;
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [query, group, year, baseIndex, source, corpus.version, searchEpoch, net]);

  // Danh sách kết quả tìm kiếm
  const hits =
    savedOnly && !query
      ? activeCorpus.papers
          .filter(
            (paper) =>
              saved.includes(paper.id) &&
              (group === "all" || paper.group === group) &&
              (year === "all" || paper.year >= Number(year)),
          )
          .map((paper) => ({
            paper,
            score: 0,
          }))
      : savedOnly
        ? result.items.filter((hit) => saved.includes(hit.paper.id))
        : result.items;

  // Bài báo tiếp theo trong danh sách kết quả hiện tại
  const nextPaper = useMemo(() => {
    if (!selected) return null;

    const currentIndex = hits.findIndex((hit) => hit.paper.id === selected.id);

    if (currentIndex < 0) return null;

    return hits[currentIndex + 1]?.paper ?? null;
  }, [selected, hits]);

  // Thống kê số lượng bài báo theo lĩnh vực
  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(GROUPS).map((g) => [
          g,
          activeCorpus.papers.filter((p) => p.group === g).length,
        ]),
      ),
    [activeCorpus],
  );

  // Các bài báo tương tự
  const neighbors = useMemo(
    () => (selected ? index.neighbors(selected, 5) : []),
    [selected, index],
  );

  // Điểm số hiển thị trên không gian 3D
  const visualScores = useMemo(
    () =>
      query
        ? completedQuery === query && !searching
          ? result.items.map((h) => ({
              id: h.paper.id,
              score: h.score,
            }))
          : []
        : selected
          ? index
              .neighbors(selected, activeCorpus.papers.length - 1)
              .map((h) => ({
                id: h.paper.id,
                score: h.score,
              }))
              .concat({
                id: selected.id,
                score: 1,
              })
          : [],
    [
      selected,
      index,
      activeCorpus.papers.length,
      query,
      result,
      completedQuery,
      searching,
    ],
  );

  // Hàm tìm kiếm
  function search(value: string) {
    const parsed = searchSchema.safeParse({
      query: value,
      topK: 50,
    });

    if (!parsed.success) {
      setNotice("Câu tìm kiếm tối đa 300 ký tự.");
      return;
    }

    const next = parsed.data.query;

    pendingOpen.current = next || null;

    if (next) {
      setCastId((id) => id + 1);
    }

    setSelected(null);
    setSearching(true);
    setSearchEpoch((n) => n + 1);
    setLibraryOpen(false);
    setDetailsOpen(false);
    setResearchOpen(false);
    setResearch(null);
    setQuery(next);
    setDraft(value);
    setSavedOnly(false);
    setNotice("");
  }

  // Lưu hoặc bỏ lưu bài báo
  async function bookmark(paper: Paper) {
    const next = !saved.includes(paper.id);

    try {
      await setBookmark(paper.id, next);

      setSaved((ids) =>
        next ? [...ids, paper.id] : ids.filter((id) => id !== paper.id),
      );

      setNotice(
        next ? "Đã cất bài vào kệ sách của bạn." : "Đã bỏ bài khỏi kệ sách.",
      );
    } catch {
      setNotice(
        "Chưa lưu được. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.",
      );
    }
  }

  // Chọn lĩnh vực
  function chooseGroup(value: Group | "all") {
    pendingOpen.current = null;
    setGroup(value);
    setSelected(null);
    setDetailsOpen(false);
    setSidebar(false);
  }

  const isLocal = source === "local";

  // Kết quả phù hợp với truy vấn.
  const searchResultIds = hits.map((hit) => hit.paper.id);

  // Tập bài được phép xuất hiện trên bản đồ.
  // Offline: toàn bộ bài đã tải.
  // Online: giữ cơ chế lọc theo kết quả như trước.


  const mapVisibleIds = offlineMode
    ? offlineMapIds
    : searchResultIds;

  return (
    <div
      className={`app-shell immersive ${libraryOpen ? "library-open" : ""} ${
        detailsOpen && !reading ? "details-open" : ""
      } ${selected && reading ? "has-reader" : ""}`}
    >
      <div className="ambient-wash" aria-hidden="true" />

      {/* Header */}
      <div className="sticky top-0 z-50 w-full px-4 pt-2">
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
        />
      </div>

      <Sidebar
        sidebar={sidebar}
        setSidebar={setSidebar}
        chooseGroup={chooseGroup}
        counts={counts}
        totalPapers={offlineMode ? offlineMapIds.length : corpus.papers.length}
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

        
        <OfflinePaperPicker
          papers={(offlineMode
  ? result.items.filter((hit) =>
      offlineMapIds.includes(hit.paper.id),
    )
  : result.items
).map((hit) => hit.paper)}
          offline={offlineMode}
          onOpen={selectPaper}
          onToggleOffline={() => {
            if (net === "offline" || !navigator.onLine) return;

            setManualOfflineMode((previous) => !previous);

            // Huy ket qua cu, chay lai tim kiem theo nguon moi.
            setSearchEpoch((previous) => previous + 1);
            setSelected(null);
            setResearch(null);
            setNotice("");
          }}
        />
        <div className="workspace-heading">
          <span>
            <span className="workspace-symbol">✧</span> Không gian khám phá
          </span>

          <span>
            {offlineMode ? offlineMapIds.length : corpus.papers.length} bài báo <i /> 4 lĩnh vực <i /> AI trên máy
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
                visibleIds={mapVisibleIds}
                queryPoint={
                  !searching && completedQuery === query
                    ? (result.queryPoint ?? null)
                    : null
                }
                castId={castId}
                searching={searching}
                scores={visualScores}
                theme={theme}
                toggleTheme={toggleTheme}
                openBook={reading && !!selected}
                nextPaper={nextPaper}
                viewMode={viewMode}
                viewPref={viewPref}
                setViewPref={setViewPref}
                net={net}
                suspended={suspended}
              />
            </Suspense>

            <div className="under-scene">
              <span>
                <span className="tiny-orbit">◎</span> Không gian dựng bằng toán
                học
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

        {/* Chú giải mức độ tương đồng */}
        <div className="similarity-legend glass">
          <div>
            <span className="legend-icon">
              <Orbit size={19} />
            </span>

            <span>
              <strong>Màu của những kết nối</strong>

              <small>
                {query
                  ? "So với câu tìm kiếm"
                  : selected
                    ? "So với bài đang đọc"
                    : "Màu xuất hiện khi tìm hoặc chọn một bài"}
              </small>
            </span>
          </div>

          <div className="legend-levels">
            <span>
              <i className="tone-very-high" /> Rất cao{" "}
              <small>≥ {SIMILARITY_BANDS.veryHigh}</small>
            </span>

            <span>
              <i className="tone-high" /> Cao{" "}
              <small>
                {SIMILARITY_BANDS.high}–{SIMILARITY_BANDS.veryHigh}
              </small>
            </span>

            <span>
              <i className="tone-medium" /> Vừa{" "}
              <small>
                {SIMILARITY_BANDS.medium}–{SIMILARITY_BANDS.high}
              </small>
            </span>

            <span>
              <i className="tone-low" /> Thấp{" "}
              <small>&lt; {SIMILARITY_BANDS.medium}</small>
            </span>
          </div>

          <p>
            Cosine từ vector 384D.
            <br />
            Không phải % độ chính xác.
          </p>
        </div>

        {/* Chi tiết bài báo */}
        <section
          className={`detail-panel glass ${selected ? "has-selection" : ""}`}
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
              score={
                query
                  ? (visualScores.find((s) => s.id === selected.id)?.score ??
                    null)
                  : null
              }
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

                <p>
                  Tìm một chủ đề để đánh thức cuốn sách, hoặc mở một bài từ thư
                  viện.
                </p>
              </div>

              <span className="detail-sparkle">✧</span>
            </div>
          )}
        </section>

        {/* Footer */}
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
        totalPapers={offlineMode ? offlineMapIds.length : corpus.papers.length}
      />
    </div>
  );
}










