# Kết quả kiểm chứng — Paper Magic 0.2.0

Ngày 04/11/2026. Đường dẫn: C:\Users\TrngTrn\paper-magic.

## Kết quả đã chạy trên mã hiện tại

| Kiểm tra | Kết quả |
|---|---|
| pnpm typecheck | Core, web và API đều đạt |
| pnpm test | **58/58 unit**, 3 file |
| pnpm build | Vite frontend + Next.js backend đạt |
| pnpm test:e2e | **8/8 luồng đạt**, production build, Edge/Chromium headless |
| Health thực tế | storage=mongodb, 30 bài, searchMethod=semantic, dimension384 |
| MongoDB | Corpus và vector float32 binary đã seed thật |
| Node AI không mạng | Chặn global fetch, E5 vẫn tạo vector384D chuẩn hóa |
| Mất API | Browser worker JS/WASM tìm semantic thật, U-Net đứng đầu câu mô tả tiếng Anh |
| Mất toàn mạng | Cài SW → offline → reload → chạy model và tìm U-Net thành công |
| Map | 30 điểm PCA thật, filter biology còn6, chọn bài đồng bộ với sách |
| 3D | Bàn khối nguyên gốc, sách mở, glyph thu hồi, drag/zoom/pause/reset |
| Mobile390×844 | Không tràn, bố cục và thao tác hoạt động; đã xem ảnh |

## Tám luồng E2E

1. API health/search/graph/neighbors, queryPoint, dimension, loại self, không leak _id; JSON hỏng/input sai/body quá lớn.
2. Tìm U-Net → chờ đúng kết quả → mở sách → đọc abstract → lưu → reload → bài vẫn còn.
3. Kéo đổi yaw, zoom đổi radius, pause, reset.
4. Lọc chuyên ngành/năm, tập rỗng và khôi phục.
5. Chặn API: semantic inference trong browser, không TF-IDF trá hình.
6. Mobile: không overflow, điều hướng lĩnh vực đóng/mở.
7. Chặn toàn mạng: tải lại bản đã cài và tìm bằng model từ cache.
8. Chế độ map: tọa độ PCA, filter và lựa chọn khớp sách.

## Model / chất lượng ban đầu

- Xenova/multilingual-e5-small Q8, revision761b726dd34fb83930e26aab4e9ac3899aa1fa78, Transformers.js4.3.2.
- Corpus30 abstract thật. Prefix passage/query, mean pooling có attention mask, L2,384 chiều.
- 6 câu smoke phát triển chạy model thật khi chặn fetch: MRR0,778, recall@3=5/6.
- Câu Việt về mạng đối kháng đứng hạng6: hạn chế thực tế, không sửa số liệu để báo đạt.
- Raw: .local/semantic-evaluation.json. Chưa có tập judged queries độc lập hoặc kết luận chất lượng ở20.000 bài.
- PCA3 giữ24,12% phương sai; tọa độ chỉ để quan sát. Ranking dùng cosine384D.

## Performance nhỏ đã đo

30 HTTP request tuần tự, query khác nhau, sau3 warmup, corpus30; gồm embedding E5 trong Node worker và ranking. Không gồm model cold start / render /20VU.

- p50=14,24ms; p95=16,32ms; p99=16,83ms.
- Response decoded lớn nhất38.397byte, khoảng37,5KiB.
- Raw: .local/performance.json. Chưa đo FPS/GPU hoặc tải20.000 bài; không suy rộng số trên.
- Chunk Vite lớn còn cảnh báo: Three550,06kB và main658,53kB trước gzip. Model129,1MiB và WASM tách riêng. Cache cài đầu lớn nên cần chuẩn bị trước demo.

## Các sửa lỗi có kiểm chứng

- Schema phân biệt TF-IDF / semantic; query semantic bắt buộc có embedding, không fallback âm thầm.
- Vite dev phục vụ module WASM local qua middleware allowlist để tránh lỗi import public assets.
- Cache static bỏ Vary Origin cho assets đóng gói, cài lại bằng cache reload, không dùng cache model riêng của Transformers.
- Kết quả cũ bị khóa khi đang tìm; UI ghi completedQuery, test chờ đúng query thay vì sleep rồi chọn nhầm bài.
- Khi đổi edges, tạo lại geometry thay buffer quá nhỏ.
- Mobile không để summary3D chồng toolbar; thông tin HTML vẫn đầy đủ.
- SHA256 assets / textHash / version / dimension / norm / PCA được kiểm tại các biên tương ứng.

## Giới hạn bản cơ bản

Chưa đủ5.000–20.000 bài; chưa có auth/RBAC/admin import/sync tài khoản/HTTPS443/backup nghiệm thu đầy đủ. Mongo local chỉ loopback và chưa auth/TLS. Chưa LLM sinh câu trả lời, vì vậy không tạo log chat prompt giả. Bookmark hiện thuộc browser. Tự review trong phiên, chưa có reviewer độc lập.

Toàn bộ mã ứng dụng/script là JS/TS. Model weights và WASM là asset/runtime đã đóng gói, không có dịch vụ Python.

## Phiên bản

Node24.22.1, pnpm11.25.0, TypeScript5.9.3, React19.3.1, Vite8.3.5, Next16.4.5, Three0.187.0, Transformers.js4.3.2, MongoDB8.0.16/driver7.8.0, Vitest5.1.0, Playwright1.64.1. Khóa package bằng pnpm-lock; model bằng manifest SHA256.

Báo cáo lịch sử0.1: verification-0.1.md.
