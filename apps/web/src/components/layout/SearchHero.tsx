import { Search, X, Sparkles, ArrowUpRight, LoaderCircle } from 'lucide-react'

interface SearchHeroProps {
  savedOnly: boolean
  draft: string
  setDraft: (val: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  search: (value: string) => void
  offlineReady: boolean
  searching: boolean
  query: string
}

export default function SearchHero({
  savedOnly,
  draft,
  setDraft,
  searchRef,
  search,
  offlineReady,
  searching,
  query,
}: SearchHeroProps) {
  return (
    <section className="intro">
      <div className="eyebrow">
        <span /> A SPACE FOR CURIOUS MINDS
      </div>
      <h1>
        {savedOnly ? (
          'Những ý tưởng bạn giữ lại.'
        ) : (
          <>
            Một chút tò mò.
            <br />
            <span>Mở ra cả vũ trụ.</span>
          </>
        )}
      </h1>
      <p>
        {savedOnly
          ? 'Kệ sách riêng của bạn, luôn ở đây khi cần.'
          : 'Biến câu hỏi thành những kết nối bất ngờ giữa các bài nghiên cứu.'}
      </p>
      <form
        className="search-bar glass"
        role="search"
        aria-label="Tìm trong thư viện"
        onSubmit={(e) => {
          e.preventDefault()
          search(draft)
        }}
      >
        <Search size={20} />
        <input
          ref={searchRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bạn muốn khám phá điều gì?"
          aria-label="Tìm bài báo"
          maxLength={300}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
        />
        {draft && (
          <button
            className="clear-search icon-button"
            type="button"
            aria-label="Xóa tìm kiếm"
            onClick={() => search('')}
          >
            <X size={15} />
          </button>
        )}
        <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}</kbd>
        <button className="search-submit" type="submit" disabled={searching && draft.trim() === query} aria-label={searching ? 'Đang tìm bài báo' : 'Tìm trong sách'}>
          {searching ? 'Đang tìm…' : 'Tìm trong sách'}
          {searching ? <LoaderCircle size={15} className="ui-spinner" /> : <Sparkles size={15} />}
        </button>
      </form>
      <p className="search-scope-explainer" role="status">
        {offlineReady
          ? 'Tìm theo ngữ nghĩa trong các bài đã tải · Sẵn sàng dùng offline'
          : import.meta.env.PROD
            ? 'Tìm theo ý nghĩa · Mở trang có mạng để chuẩn bị dùng ngoại tuyến'
            : 'Tìm theo ý nghĩa trong thư viện bài báo'}
      </p>
      <div className="suggestions">
        <span>Bắt đầu từ</span>
        {['Học sâu', 'Ảnh y sinh', 'Lượng tử', 'Protein'].map((q) => (
          <button type="button" key={q} onClick={() => search(q)}>
            {q}
            <ArrowUpRight size={11} />
          </button>
        ))}
      </div>
    </section>
  )
}
