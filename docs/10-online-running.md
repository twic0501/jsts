# Paper Magic0.6 — tìm nguồn thật, lưu và đọc offline

## Cách thử ngay

Mở http://127.0.0.1:5173, chọn **Trên mạng**, nhập `graph neural networks` rồi tìm. Đợi nguồn và model trả kết quả; cuốn sách sẽ mở một bài thật. **Thư viện** xem danh sách, điểm cosine và lọc. Link nguồn nằm ở điều khiển sách và Góc đọc; PDF hiện khi nguồn cung cấp URL HTTPS.

Ba chế độ:

- Thư viện: các bài gốc và dữ liệu đã có trên trình duyệt. Offline dùng cùng E5 local qua worker khi API mất.
- Trên mạng: lấy ứng viên từ OpenAlex/arXiv, xếp bằng cosine384D, chỉ trả ID mà nguồn tìm thấy.
- Cả hai: thêm kết quả thư viện gốc vào tập ứng viên từ nguồn ngoài.

Kết quả được cache trong IndexedDB (DB paper-magic-v1 lên version2, giữ bookmarks cũ) cùng vector và PCA projection. Khi reload offline vẫn tìm lại bài đã lấy. Cài app/model/cache lần đầu cần mạng; khi offline không thể lấy bài mới. Nếu không kết nối API v2, UI báo đang tìm trong dữ liệu đã có, không giả nguồn ngoài hoạt động.

## Luồng thật

Query → Next.js v2 → arXiv+OpenAlex → chuẩn hóa/gom trùng → E5 query/passage384D → cosine → điểm PCA từ cùng projection gốc → node/sách → link bài gốc.

Model **chưa tự train**. E5 là pretrained, không gọi việc tạo vector là training. Reranker tự train cần tập gán nhãn và phép đo held-out riêng; không bịa kết quả để ghi báo cáo đạt.

Ví dụ live đã chạy: query graph neural networks,2 nguồn mỗi nguồn8 bản ghi,≤12 bài sau hợp nhất, vector384D; lưu thật vào MongoDB. Report raw .local/online-report.json, response .local/live-online.json. Kết quả từng lần có thể khác khi nguồn/model batching thay đổi; số đo thực chạy ở verification.md.

## API

POST /api/v2/search, application/json:

```json
{"query":"graph neural networks","scope":"online","topK":8}
```

Tuỳ chọn group, yearFrom, yearTo. query2..300; topK integer1..20; năm1900..2100 và bắt đầu≤kết thúc; không field thừa; body≤8192B. Không nhận URL nguồn do client cung cấp. Mỗi process≤3 query đang chạy/20lượt mỗi phút. Lỗi415/400/413/422/429/503 có requestId, không stack/secret.

Output có result(items/total/durationMs/method/datasetVersion/queryPoint), dataset(corpus/snapshot), providers(status/count/message/durationMs), scope, ranking=e5-cosine-384d, storage=mongodb|memory, warnings. snapshot gửi cho FE để node/chữ/neighbor/offline cùng vector thật. result.total là số ứng viên hợp lệ sau lọc, không phải tổng số bài trên Internet. Mỗi nguồn lấy≤8; tối đa12 bài mới, không phải tìm exhaustively.

Thiếu abstract: ghi rõ, abstractAvailable=false, embed chỉ title. Không bịa tóm tắt. Summary nguồn ngoài là đoạn trích abstract, không tự dịch/sinh tiếng Việt. Nhãn group là suy đoán từ topic/title nên chỉ dùng gợi ý hiển thị. Điểm title-only không có cùng mức bằng chứng như điểm đầy đủ abstract.

ID gốc arXiv giữ nguyên; OpenAlex dùng oa:W..., URL nguồn chỉ arxiv.org/abs, openalex.org/W... hoặc doi.org/10.... PDF chỉ HTTPS không credentials. Nội dung nguồn là dữ liệu không tin cậy: React escape và Canvas vẽ text; không innerHTML/iframe nguồn. Google Scholar chỉ có thể mở link ngoài, chưa tích hợp API/scraping.

## CSDL và offline

Mongo collections papers/embeddings/datasets gốc giữ nguyên. Thêm onlinePapers(_id=paperId, metadata, provenance), onlineEmbeddings(_id=paperId, vector384D, point, textHash, modelRevision). Upsert giữ dữ liệu qua restart; nếu không lưu được, warning rõ và storage=memory. Chưa có sync tài khoản hoặc endpoint tải lại toàn bộ cache Mongo của nhiều người; dữ liệu đã tìm trên máy này khôi phục qua IDB.

mergeBundles giữ mọi bài gốc, ghép đúng paper/vector theo ID; bản mới thay metadata/vector của bản cache cùng ID, không thay paper gốc. Phải cùng model revision/projection, kiểm dimension/norm/ID/point trước nhận. Không fit lại PCA mỗi query. Cache IDB hiện tăng theo số bài đã tìm; quota/browser full được báo, chưa có eviction/quản lý dung lượng theo tài khoản.

Phân biệt null/undefined: provenance có doi/pdfUrl null khi nguồn không có; không biến thiếu abstract thành nội dung nghiên cứu. provenance optional cho bản seed cũ. DTO group/year optional là undefined khi chưa lọc. Điểm cosine0 là giá trị hợp lệ, không thay điểm vắng bằng0.

## Module/hàm

| Module | Hàm chính |
|---|---|
| packages/core/src/online.ts | onlineSearchSchema, validateBundle, embeddingText, mergeBundles, response schemas |
| apps/api/lib/online/providers.ts | normalizeOpenAlex, normalizeArxiv, deduplicatePapers, reconstructAbstract, searchProvider |
| apps/api/lib/online/search.ts | runOnlineSearch, onlineSearch; inject nguồn/model trong unit |
| apps/api/lib/embedding.ts | embedBatch(texts≤3), embedQuery; worker queue/cache, local model |
| apps/api/app/api/v2/search/route.ts | POST, kiểm input/body và giới hạn request |
| apps/web/src/App.tsx | scope/changeScope, nguồn/warnings, bundle động và query mới nhất |
| apps/web/src/storage.ts | loadOnlineDataset/saveOnlineDataset; IDB migration giữ bookmarks |
| scripts/check-online.mjs | Nguồn thật+inference thật+Mongo counts |
| scripts/measure-online.mjs |5 warm request, bytes/percentiles và static/proxy checks |
| scripts/serve-production.mjs | Static dist+proxy nội bộ, tùy chọn HTTPS cert/key |

Tham số/return và số hàm thực tế cập nhật docs/function-catalog.md/code-catalog.json. Modules có README và ai-development-log.jsonl; không tự ghi đã train hoặc đã public khi chưa có.

## Web server và host

Sau `pnpm build`, backend chạy production Next. `pnpm serve` phục vụ Vite dist và proxy /api tới Next nội bộ; mặc định127.0.0.1:8080. E2E có thể chạy bằng E2E_BASE_URL=http://127.0.0.1:8080. Vite preview vẫn để xem local, không coi là web server public.

Server có MIME WASM/JS, cache headers, nosniff, deny frames, referrer policy; chặn traversal/dotfile, không serve .env, chỉ proxy API_ORIGIN loopback. Không nhận upstream tùy ý. Nếu dùng HTTPS trực tiếp, cấu hình SERVER_HOST=0.0.0.0, SERVER_PORT=443, TLS_CERT_FILE và TLS_KEY_FILE tới chứng chỉ/key hợp lệ; có HSTS khi TLS. Public bind không TLS bị từ chối. PUBLIC_ORIGIN dùng để kiểm Origin gửi đến API. Có thể đặt sau reverse proxy443, giữ bindloopback.

**HTTPS443 chưa được nghiệm thu và chưa public**: chưa có máy chủ/tên miền/chứng chỉ. Đã kiểm static/proxy qua HTTP local; không gọi đó là đã chạy SSL. Chưa có auth/RBAC và rate limit phân tán; không phơi Mongo không auth hiện tại lên Internet. Đọc docs09 cho kiến trúc triển khai, backup và quyền truy cập cần hoàn thiện. Không cần Python cho mã ứng dụng/server.

## Kiểm chứng và giới hạn

Unit kiểm chuẩn hóa/DOI/abstract/URL/429/cache/nguồn lỗi/vector/PCA và merge offline. E2E phần online dùng fixture có khai báo để kiểm UI nhất quán, tách khỏi live integration gọi API Internet. Live check mới là bằng chứng nguồn thật; không gán fixture thành dữ liệu inference thật. Prompt runtime hiện chỉ query/passsage prefix embedding, chưa chatbot nên không bịa bộ prompt test LLM. Kết quả test/performance cuối ở verification.md, kể cả lỗi phát hiện và phạm vi chưa test.

Corpus gốc30, không tuyên bố đã nhập5.000–20.000. Candidate retrieval ngoài dựa API tìm kiếm của nguồn rồi mới rerank cosine; chất lượng tiếng Việt/tên chủ đề cần bộ đánh giá riêng. Thời gian ngoài phụ thuộc mạng/hạn mức, UI luôn ghi trạng thái từng nguồn. Cache model lớn vẫn cần chuẩn bị lần đầu. Dependency/model không nâng; app/web/API lên0.6.0 cho module mới, v1 còn hoạt động.
