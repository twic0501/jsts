import {
  BookOpen,
  Bookmark,
  Sparkles,
  HelpCircle,
  Layers,
  Orbit,
  WifiOff,
  Sun,
  Moon,
  History,
} from 'lucide-react'
import { Paper } from '@paper-galaxy/core'

interface HeaderProps {
  savedOnly: boolean
  setSavedOnly: (val: boolean) => void
  savedCount: number
  libraryOpen: boolean
  setLibraryOpen: (val: boolean) => void
  detailsOpen: boolean
  setDetailsOpen: (val: boolean) => void
  researchOpen: boolean
  setResearchOpen: (val: boolean) => void
  hasResearch: boolean
  isLocal: boolean
  source: string
  setHelp: (val: boolean) => void
  sidebar: boolean
  setSidebar: (val: boolean) => void
  selectPaper: (paper: Paper | null) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  historyOpen: boolean
  onHistory: () => void
}

export default function Header({
  savedOnly,
  setSavedOnly,
  savedCount,
  libraryOpen,
  setLibraryOpen,
  detailsOpen,
  setDetailsOpen,
  researchOpen,
  setResearchOpen,
  hasResearch,
  isLocal,
  source,
  setHelp,
  sidebar,
  setSidebar,
  selectPaper,
  theme,
  toggleTheme,
  historyOpen,
  onHistory,
}: HeaderProps) {
  return (
    <header className="w-full flex items-center justify-between px-6 py-3 my-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg transition-colors duration-300">
      <a
        className="flex items-center gap-2 text-slate-900 dark:text-white font-medium hover:opacity-80 transition-opacity"
        href="/"
        aria-label="Paper Magic trang chủ"
      >
        <span className="text-blue-600 dark:text-blue-400">
          <Orbit size={24} />
        </span>
        <span className="text-lg tracking-tight">
          paper<span className="font-light opacity-70">magic</span>
        </span>
        <span className="px-1.5 py-0.5 ml-1 text-[10px] font-bold tracking-wider text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40 rounded-md">
          LAB
        </span>
      </a>

      <nav
        className="hidden md:flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-full border border-slate-200 dark:border-slate-700/50"
        aria-label="Điều hướng"
      >
        <button
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all cursor-pointer ${
            !savedOnly
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          onClick={() => {
            setSavedOnly(false)
            setSidebar(false)
            setLibraryOpen(true)
          }}
        >
          <Sparkles size={15} />
          Khám phá
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all cursor-pointer ${
            savedOnly
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          onClick={() => {
            setSavedOnly(true)
            selectPaper(null)
            setLibraryOpen(true)
          }}
        >
          <Bookmark size={15} />
          Bài đã lưu
          <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs bg-slate-200 dark:bg-slate-800 rounded-full">
            {savedCount}
          </span>
        </button>
      </nav>

      <div className="flex items-center gap-3">
        <button type="button" onClick={onHistory} aria-expanded={historyOpen} aria-controls="search-history-panel"
          className="history-trigger">
          <History size={17} /><span>History</span>
        </button>
        <div className="hidden lg:flex items-center gap-1 mr-2 border-r border-slate-300 dark:border-slate-700 pr-3">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              libraryOpen
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            onClick={() => {
              setLibraryOpen(!libraryOpen)
              setDetailsOpen(false)
              setResearchOpen(false)
            }}
          >
            <Layers size={14} />
            Thư viện
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              detailsOpen
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            onClick={() => {
              setDetailsOpen(!detailsOpen)
              setLibraryOpen(false)
              setResearchOpen(false)
            }}
          >
            <BookOpen size={14} />
            Góc đọc
          </button>
          {hasResearch && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors cursor-pointer"
              onClick={() => {
                setResearchOpen(!researchOpen)
                setDetailsOpen(false)
                setLibraryOpen(false)
              }}
            >
              <Sparkles size={14} />
              <span>Dẫn chứng</span>
            </button>
          )}
        </div>

        {/* Nút bấm chuyển Đổi Theme Sáng / Tối */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer"
          aria-label="Đổi giao diện sáng tối"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} className="text-amber-500" />
              <span>Sáng</span>
            </>
          ) : (
            <>
              <Moon size={15} className="text-blue-500" />
              <span>Tối</span>
            </>
          )}
        </button>

        <span
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${
            isLocal
              ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
          }`}
        >
          {isLocal ? (
            <WifiOff size={12} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          {source === 'connecting'
            ? 'Đang kết nối'
            : isLocal
              ? 'Dữ liệu trong máy'
              : source === 'api-mongodb'
                ? 'MongoDB cục bộ'
                : 'API · dữ liệu cục bộ'}
        </span>
        <button
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          onClick={() => setHelp(true)}
          aria-label="Hướng dẫn"
        >
          <HelpCircle size={18} />
        </button>
        <button
          className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          onClick={() => setSidebar(!sidebar)}
          aria-label="Mở danh mục"
        >
          <Layers size={18} />
        </button>
        <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-md">
          PM
        </div>
      </div>
    </header>
  )
}
