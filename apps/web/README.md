# Web — React + Vite + TypeScript 0.5

Toàn web là một cảnh3D. Search và nút điều khiển là kính nổi; Thư viện và Góc đọc mở thành drawer. Sách đọc scale1.6, có phóng trái/phải; các điểm PCA/cạnh cosine luôn chung cảnh và bấm được. App.tsx quản lý search/filter/bookmark và kết quả mới nhất; storage.ts lưu IndexedDB; scene/MagicBook.tsx gắn scene vào React; scene/ritual.ts quyết định thứ tự chuyển động. Xem [luồng và hàm](../../docs/08-input-output-ritual.md).

Next.js /api cung cấp corpus và tìm kiếm E5. Mất API, browser worker chạy cùng model local bằng Transformers.js và SemanticIndex384D, không có TF-IDF fallback trong luồng chính. Source pill thể hiện nguồn thật. Kết quả dùng completedQuery, AbortController và active flag để truy vấn cũ không mở nhầm sách.

Chữ/giấy Canvas và geometry được tạo cục bộ bằng JS/TS; không dùng ảnh/video tải sẵn hoặc Python. CSS tạo kính/gradient tĩnh; chuyển động 3D từ TypeScript, không CSS animation hay GSAP.

`pnpm dev` chạy frontend/backend. `pnpm build` tạo production + SW; `pnpm preview` phục vụ bản này. SW không bật ở dev. Sau lần cài dependency/model và cache đầu, production có thể reload và tìm offline. Cài lần đầu cần Internet; arXiv nguồn ngoài cần mạng.

Mỗi effect của scene có cleanup. Không lưu tọa độ theo từng frame vào React state; React chỉ nhận thay đổi phase/cặp trang. Có nút pause, hỗ trợ reduced motion và bản đọc HTML. Kiểm thử và giới hạn ghi trong docs/verification.md. Nhật ký phát triển ở ai-development-log.jsonl.
Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.

Góc đọc mới: src/PaperDossier.tsx gồm4 hàm có tên, bìa hồ sơ, phạm vi dữ liệu, abstract, nguồn/PDF, sao chép trích dẫn và neighbor thật. Link PDF null khi xác định không có; provenance undefined là dữ liệu gốc chưa cung cấp trường này. Không tải fullPDF hoặc tạo abstract mới. Phạm vi tìm có dòng giải thích hiển thị trên desktop/mobile. Tài liệu docs/11-reading-experience.md; kiểm lại97unit/17E2E đạt. AI log đã ghi yêu cầu, sửa lỗi, hash và bằng chứng.


Mốc0.7: ResearchPanel.tsx (1 hàm) trình bày plan, queries, claims+IDcitation, quote và link nguồn. Frontend dùngv3; dữ liệu/scene vẫn384D/PCA. Mất API dùng documentFallbackReport, không gọi browser fallback là RAG đầy đủ. offline-ready.ts (1 hàm checkOfflineReady) dùng MessageChannel kiểm assetcache thật; UI chỉ báo sẵn sàng offline sau xác nhận. Bài đã lưu khi chưa tìm được đọc trực tiếp từ activeCorpus để không mất do giới hạn topK. docs12 mô tả input/output/flow/giới hạn.
