import { X } from 'lucide-react'
import { GROUPS, Group } from '@paper-galaxy/core'

interface SidebarProps {
  sidebar: boolean
  setSidebar: (val: boolean) => void
  chooseGroup: (value: Group | 'all') => void
  counts: Record<string, number>
  totalPapers: number
}

export default function Sidebar({
  sidebar,
  setSidebar,
  chooseGroup,
  counts,
  totalPapers,
}: SidebarProps) {
  return (
    <aside className={`sidebar glass ${sidebar ? 'is-open' : ''}`} aria-label="Danh mục">
      <div className="sidebar-title">
        Thư viện của bạn
        <button
          className="icon-button"
          aria-label="Đóng danh mục"
          onClick={() => setSidebar(false)}
        >
          <X size={18} />
        </button>
      </div>
      <nav className="category-nav">
        <button onClick={() => chooseGroup('all')}>
          Tất cả lĩnh vực <span>{totalPapers}</span>
        </button>
        {(Object.keys(GROUPS) as Group[]).map((key) => (
          <button key={key} onClick={() => chooseGroup(key)}>
            <i style={{ background: GROUPS[key].color }} />
            {GROUPS[key].label}
            <span>{counts[key]}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
