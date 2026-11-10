import { Search, X, Sparkles, ArrowUpRight } from 'lucide-react'

interface SearchHeroProps {
  savedOnly: boolean
  draft: string
  setDraft: (val: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  search: (value: string) => void
  offlineReady: boolean
  searching: boolean
}

export default function SearchHero({
  savedOnly,
  draft,
  setDraft,
  searchRef,
  search,
  offlineReady,
  searching,
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
        <kbd>⌘ K</kbd>
        <button className="search-submit" type="submit">
          Tìm trong sách
          <Sparkles size={15} />
        </button>
      </form>
      <p className="search-scope-explainer">
        {offlineReady
          ? 'Tìm theo ngữ nghĩa trong các bài đã tải · Sẵn sàng dùng offline'
          : import.meta.env.PROD
            ? 'Đang cài tài nguyên để dùng offline…'
            : 'Tìm theo ngữ nghĩa trong các bài đã tải · Offline khả dụng ở bản build'}
      </p>
      <div className="suggestions">
        <span>Bắt đầu từ</span>
        {['Học sâu', 'Ảnh y sinh', 'Lượng tử', 'Protein'].map((q) => (
          <button key={q} onClick={() => search(q)}>
            {q}
            <ArrowUpRight size={11} />
          </button>
        ))}
      </div>
    </section>
  )
}
