# Kết quả kiểm chứng — Paper Magic 0.3.0

Ngày04/11/2026. Dự án: C:\Users\TrngTrn\paper-magic. Báo cáo0.2 giữ trong verification-0.2.md; số performance API/model bên dưới được ghi rõ là phép đo ở mốc0.2.

## Kết quả chạy trên bản giao diện mới

| Kiểm tra | Kết quả |
|---|---|
| pnpm typecheck | 3 workspace core/web/API đạt |
| pnpm test | 69/69 unit, 4 file, lần cuối779ms |
| pnpm --filter @paper-galaxy/web build | TypeScript + Vite production đạt |
| node scripts/build-sw.mjs | 22 asset local, cache b7e5f1a3e1d3 |
| pnpm test:e2e | 11/11 đạt, 52.7s, Edge/Chromium production |
| API + MongoDB | health/search/graph/neighbors chạy thật, 30 bài,384D |
| Mất API | Browser worker chạy E5 local, U-Net đầu bảng với mô tả ảnh y sinh |
| Mất toàn mạng | Cài cache → offline → reload → tìm U-Net thành công |
| Đọc sách | Tìm tự mở bài đầu, nội dung trên texture giấy; lật sang abstract; thoát/tìm lại/đổi bài |
| Truy vấn liên tiếp | Kết quả mới nhất mở đúng ID; Escape hủy tự mở |
| Reduced motion | Bỏ chuỗi chuyển động, vẫn đọc/lật và thoát được |
| Mobile390×844 | Không tràn ngang, danh sách không co hàng; đã xem ảnh thực tế |
| Chụp hình QA | Không pageerror/console error trong capture-liquid.mjs |

Next.js backend không thay mã trong đợt này; dùng production build đang chạy từ mốc0.2, đã kiểm tra type và API/E2E. Không tuyên bố đã rebuild backend ở mốc0.3. Dependency và model revision giữ nguyên.

## 11 luồng E2E

1. Health, search, graph, neighbors, vector384D/queryPoint và lỗi input/JSON/body quá lớn; không leak _id.
2. Tìm U-Net, đọc, lưu và reload giữ bài đã lưu.
3. Camera kéo/zoom/pause/reset.
4. Lọc lĩnh vực/năm, tập rỗng, khôi phục.
5. Chặn API, tìm semantic thật bằng browser worker.
6. Mobile không tràn, danh mục đóng/mở.
7. Chặn toàn mạng, reload và chạy model từ cache.
8. Map30 điểm PCA thật, lọc biology còn6, chọn cùng ID với sách.
9. Tìm tự mở; đủ các phase vortex/closing/zooming/opening/reading; nội dung đúng trên giấy; lật/thoát/tìm lại/đổi bài.
10. Tìm liên tiếp không mở nhầm câu trước; Escape hủy khi đang đợi.
11. Reduced motion vẫn đọc/lật; tập rỗng trở về idle.

Unit thêm11 trường hợp cho state machine, hủy/thoát, khóa lật chồng, dt lỗi, biên nội suy/màu và giữ toàn bộ các từ abstract sau chia trang. E2E kiểm dữ liệu trang bằng thuộc tính đọc từ cùng nguồn vẽ Canvas; ảnh chụp được kiểm bằng mắt để phát hiện lỗi vật liệu/chữ, không chỉ dựa vào thuộc tính DOM.

## Các lỗi đã sửa sau khi kiểm tra thực tế

- Ánh sáng điểm làm giấy/chữ bị bạc: mặt giấy dùng MeshBasicMaterial, không phụ thuộc đèn; bìa và bàn tiếp tục nhận ánh sáng.
- Hàng kết quả mobile bị co: đặt grid-auto-rows và dùng danh sách block ở màn hình nhỏ.
- Zoom/drag khi đọc: cộng góc thao tác vào góc đọc, áp dụng hệ số khoảng cách cho cả chế độ đọc.
- Hủy khi đang đợi: đóng từ đúng góc/zoom hiện tại, xóa quyền tự mở của truy vấn.
- Không tô màu bằng điểm query cũ khi query mới chưa hoàn tất; map có chú thích đúng màu.
- Dùng lại19 texture chữ cho144 ký tự; dispose RAF/listener/observer và tài nguyên GPU.

## Kích thước bản build mới

Đây là kích thước file build, không phải FPS hay thời gian tải đo trên Internet. kB =1000byte, KiB =1024byte. Gzip là kích thước sau nén, chỉ đạt khi web server bật nén.

| Phần | Trước gzip | Sau gzip |
|---|---:|---:|
| JS ứng dụng chính | 660.50kB | 249.64kB |
| Three.js | 550.06kB | 135.52kB |
| Scene sách | 23.22kB | 9.65kB |
| CSS | 24.50kB | 6.06kB |
| Embedding worker | 547.26kB | Không dùng kết quả gzip từ build |

WASM asyncify do Vite xuất26,861.77kB; asset model/tokenizer129.1MiB và các WASM local còn có trong public. Cache lần đầu lớn, cần chuẩn bị trước demo. Build còn cảnh báo chunk >500kB. Chưa benchmark FPS/GPU, cold start mới, tải đồng thời hoặc20.000 bài; không khẳng định60FPS.

## Số đo API và chất lượng từ mốc0.2

Giữ số cũ để tham khảo, **không coi là benchmark mới của giao diện0.3**:

- 30 HTTP request tuần tự, các query khác nhau, sau3 warmup, corpus30, E5 Node worker + Mongo snapshot: p50=14.24ms, p95=16.32ms, p99=16.83ms. p50 là trung vị, p95/p99 là mức mà95%/99% mẫu hoàn tất không chậm hơn; không phải độ chính xác AI.
- Response decoded lớn nhất38,397byte ≈37.5KiB, không phải kích thước cả model. Raw: .local/performance.json.
- 6 query smoke model thật khi chặn fetch: MRR0.778, recall@3=5/6. MRR là trung bình nghịch đảo thứ hạng bài đích, recall@3 là tỷ lệ truy vấn có bài đích trong3 đầu. Không phải tập chuyên gia độc lập. Một câu tiếng Việt về GAN đứng hạng6.
- PCA3 giữ24.12% phương sai, nghĩa là phần lớn thông tin384D không giữ trong hình3D. Ranking dùng cosine ở384D; màu là ngưỡng trình bày, không xác suất.

## Tài liệu, phiên bản và giới hạn

Docs06 giải thích luồng, công thức và biến. AST hiện ghi113 hàm/phương thức có tên,469 giá trị khởi tạo biến (theo phạm vi bộ sinh, không tính callback JSX vô danh hoặc biến dài). Module web/scene có README mới và log AI kèm SHA256. Không giả lập reviewer độc lập hoặc log chatbot.

Node24.22.1, pnpm11.25.0, TS5.9.3, React19.3.1, Vite8.3.5, Next16.4.5, Three0.187.0, Transformers.js4.3.2, MongoDB8.0.16/driver7.8.0, Vitest5.1.0, Playwright1.64.1. App/web lên0.3.0 vì thêm chức năng đọc/lật; dependency không nâng.

Toàn bộ mã ứng dụng/script do nhóm viết là JS/TS. Giấy/chữ/quầng sáng là Canvas tự sinh, geometry và chuyển động do TypeScript tính; không có ảnh/video/model3D tải sẵn hoặc Python. E5 weights/ONNX/WASM là model/runtime local, không phải tự train model từ đầu.

Corpus hiện30 bài, chưa5.000–20.000. Chưa auth/RBAC/admin import/sync tài khoản/HTTPS443/backup nghiệm thu đầy đủ. Mongo local loopback chưa auth/TLS. Bookmark thuộc browser. Tự review trong phiên, chưa có reviewer độc lập. 69unit/11E2E không đồng nghĩa đạt toàn bộ252 kịch bản của đặc tả cuối.