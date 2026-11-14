import { BookOpen, Bookmark, HelpCircle, Layers, LogIn, LogOut, Moon, Orbit, SlidersHorizontal, Sparkles, Sun, WifiOff } from 'lucide-react'
import { useAuth } from '../../features/auth/context/AuthProvider'

export type Page = 'explore' | 'saved'

type Props = {
  page: Page
  setPage: (page: Page) => void
  savedCount: number
  filterOpen: boolean
  setFilterOpen: (open: boolean) => void
  activeFilters: number
  libraryOpen: boolean
  setLibraryOpen: (open: boolean) => void
  detailsOpen: boolean
  setDetailsOpen: (open: boolean) => void
  researchOpen: boolean
  setResearchOpen: (open: boolean) => void
  hasResearch: boolean
  isLocal: boolean
  source: string
  hasSelected: boolean
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setHelp: (open: boolean) => void
}

/** Thanh menu trên cùng. Dùng CSS thường (không cần Tailwind) và nằm trên cảnh 3D. */
export default function TopNav({
  page,
  setPage,
  savedCount,
  filterOpen,
  setFilterOpen,
  activeFilters,
  libraryOpen,
  setLibraryOpen,
  detailsOpen,
  setDetailsOpen,
  researchOpen,
  setResearchOpen,
  hasResearch,
  isLocal,
  source,
  hasSelected,
  theme,
  toggleTheme,
  setHelp,
}: Props) {
  const auth = useAuth()
  const status =
    source === 'connecting'
      ? 'Đang kết nối'
      : isLocal
        ? 'Dữ liệu trong máy'
        : 'Thư viện sẵn sàng'
  return (
    <header className="topnav" role="banner">
      <a className="topnav-brand" href="#" onClick={(e) => { e.preventDefault(); setPage('explore') }} aria-label="Paper Magic, về trang khám phá">
        <Orbit size={22} />
        <span>
          paper<em>magic</em>
        </span>
      </a>

      <nav className="topnav-tabs" aria-label="Điều hướng trang">
        <button type="button" className={page === 'explore' ? 'active' : ''} aria-current={page === 'explore' ? 'page' : undefined} onClick={() => setPage('explore')}>
          <Sparkles size={15} />
          <span>Khám phá</span>
        </button>
        <button type="button" className={page === 'saved' ? 'active' : ''} aria-current={page === 'saved' ? 'page' : undefined} onClick={() => setPage('saved')}>
          <Bookmark size={15} />
          <span>Bài đã lưu</span>
          <i className="topnav-count" aria-label={`${savedCount} bài`}>{savedCount}</i>
        </button>
      </nav>

      <div className="topnav-tools">
        {page === 'explore' && (
          <>
            <button
              type="button"
              className={`topnav-tool${filterOpen ? ' active' : ''}`}
              aria-expanded={filterOpen}
              aria-haspopup="dialog"
              aria-controls="result-filter-dialog"
              aria-label="Bộ lọc kết quả"
              title="Bộ lọc kết quả"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <SlidersHorizontal size={15} />
              <span>Bộ lọc</span>
              {activeFilters > 0 && <i className="topnav-count hot">{activeFilters}</i>}
            </button>
            <button
              type="button"
              className={`topnav-tool${libraryOpen ? ' active' : ''}`}
              aria-label="Thư viện bài báo"
              title="Thư viện bài báo"
              aria-expanded={libraryOpen}
              aria-controls="search-results"
              onClick={() => {
                setLibraryOpen(!libraryOpen)
                setDetailsOpen(false)
                setResearchOpen(false)
              }}
            >
              <Layers size={15} />
              <span>Thư viện</span>
            </button>
            <button
              type="button"
              className={`topnav-tool${detailsOpen ? ' active' : ''}`}
              aria-label="Thông tin bài đang chọn"
              title={hasSelected ? 'Thông tin bài đang chọn' : 'Chọn một bài báo để mở góc đọc'}
              aria-expanded={detailsOpen}
              aria-controls="paper-details"
              disabled={!hasSelected}
              onClick={() => {
                setDetailsOpen(!detailsOpen)
                setLibraryOpen(false)
                setResearchOpen(false)
              }}
            >
              <BookOpen size={15} />
              <span>Góc đọc</span>
            </button>
            {hasResearch && (
              <button
                type="button"
                className={`topnav-tool${researchOpen ? ' active' : ''}`}
                aria-label="Dẫn chứng ngữ nghĩa"
                title="Dẫn chứng ngữ nghĩa"
                aria-expanded={researchOpen}
                onClick={() => {
                  setResearchOpen(!researchOpen)
                  setDetailsOpen(false)
                  setLibraryOpen(false)
                }}
              >
                <Sparkles size={15} />
                <span>Dẫn chứng</span>
              </button>
            )}
          </>
        )}
        <span className={`topnav-status${isLocal ? '' : source === 'connecting' ? ' connecting' : ' online'}`} title={status} role="status" aria-label={status}>
          {isLocal ? <WifiOff size={12} /> : <i />}
          <span>{status}</span>
        </span>
        <button type="button" className="topnav-icon" aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'} title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" className="topnav-icon" aria-label="Hướng dẫn" aria-haspopup="dialog" aria-controls="help-dialog" title="Hướng dẫn sử dụng" onClick={() => setHelp(true)}>
          <HelpCircle size={18} />
        </button>
        <div className="pm-auth-nav">
          {auth.isMock && <span className="pm-auth-demo-tag">Demo</span>}
          {auth.state.status === 'authenticated' ? <>
            <span id="topnav-auth-account" className="pm-auth-account-name" title={`${auth.state.session.user.displayName} · ${auth.state.session.user.email}${auth.isMock?' · Phiên demo':''}`}>{auth.state.session.user.displayName}</span>
            <button type="button" className="topnav-icon" aria-label={auth.isMock?'Đăng xuất demo':'Đăng xuất'} aria-describedby="topnav-auth-account" title={`Đăng xuất · ${auth.state.session.user.displayName} (${auth.state.session.user.email})`} disabled={auth.busy} onClick={() => void auth.logout()}><LogOut size={17} /></button>
          </> : <button type="button" className="topnav-icon" aria-label="Đăng nhập" title={auth.isMock ? 'Đăng nhập demo' : 'Đăng nhập'} aria-haspopup="dialog" disabled={auth.busy || auth.state.status === 'loading'} onClick={auth.openLogin}><LogIn size={18} /></button>}
        </div>
      </div>
      {auth.notice && <div className="pm-auth-nav-notice" role="status"><span>{auth.notice}</span><button type="button" aria-label="Đóng thông báo tài khoản" onClick={auth.dismissNotice}>×</button></div>}
    </header>
  )
}
