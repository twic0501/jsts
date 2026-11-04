# Kiểm chứng Paper Magic0.4 — thư viện toàn màn hình

Ngày04/11/2026. C:\Users\TrngTrn\paper-magic. Tài liệu triển khai: docs/07-immersive-library.md. Mốc0.3 giữ trong verification-0.3.md, không dùng số đo cũ để coi là benchmark mới.

| Kiểm tra thực chạy | Kết quả |
|---|---|
| pnpm typecheck | Core/web/API đều đạt |
| pnpm test |73/73 unit,5 file; lần cuối457ms |
| Web TypeScript + Vite build | Đạt |
| build-sw.mjs |22 asset local, cache cc71d61ad6a8 |
| pnpm test:e2e |13/13 đạt,53.1s, Edge/Chromium production |
| Bấm điểm3D thật | Hover tên, bấm mở đúng ID và5 cạnh lân cận; không cần chuyển bản đồ |
| Toàn màn hình mobile | Canvas đúng390×844, không tràn ngang; bảng kính mở/đóng được |
| Trang lớn | Scale1.5 khi đọc; auto mobile trang trái; chọn phải và lật vẫn chạy |
| Truy vấn liên tiếp/hủy | Không mở kết quả cũ; Escape hủy tự mở |
| Offline | Chặn API vẫn tìm E5 trong browser; chặn toàn mạng vẫn reload và tìm |
| API/Mongo | Corpus30, graph/health/search/neighbors và lỗi đầu vào đạt |

Backend dùng build production hiện có, mã API/schema Mongo/model không đổi. Đã kiểm type và API thật, không tuyên bố build lại backend trong đợt chỉ sửa frontend.

## Các luồng đã kiểm

1. API:health/search/graph/neighbors,384D/queryPoint, không leak _id, JSON/input/body lỗi.
2. Tìm U-Net tự mở → mở Góc đọc → đọc → lưu → reload và Bài đã lưu.
3. Camera kéo/zoom/pause/reset.
4. Thư viện:lọc lĩnh vực/năm, rỗng và khôi phục.
5. Mất API:browser worker chạy semantic thật.
6. Mobile:Canvas phủ viewport và bảng kính thao tác được.
7. Cài cache, offline toàn mạng, reload và tìm.
8. Sách/PCA luôn cùng cảnh, không còn nút mode; lọc nodes/corpus thống nhất, chọn bài đóng bảng.
9. Đủ phase phù phép; nội dung trên giấy; lật/thoát/tìm lại/đổi bài.
10. Truy vấn mới nhất và Escape khi chờ.
11. Reduced motion vẫn đọc/lật, tập rỗng trở vềidle.
12. Rê/bấm tại tọa độ chiếu của điểm thật; tooltip trỏ đúng ID và mở đúng bài, có cạnh liên quan.
13. Desktop scale1.5; mobile focus trái/phải và lật không làm tràn ngang.

73unit gồm toán số phức/camera, baseline tìm kiếm, vector/cosine/PCA/snapshot, state machine/chia trang và4 kiểm tra mới cho hệ tọa độ chung/camera fit. Mọi phần giấy chia ≤13 dòng; toàn bộ các từ abstract được giữ qua các trang. Tọa độ corpus và query cùng phép quay/tịnh tiến/scale2.35, được kiểm giữ khoảng cách tương ứng.

Một lượt đầu13test có12 đạt; case điểm3D đọc tooltip ngay sau pointermove trước React commit. Đã kiểm trực tiếp hit target/raycast, sửa phép kiểm bằng chờ điều kiện hiển thị, chạy lại case đạt và chạy lại cả bộ13/13 đạt. Không bỏ assertion chọn đúng ID.

## Hình ảnh/đồ họa

Geometry, giấy/chữ và quầng sáng Canvas tự sinh; quỹ đạo TypeScript dùng số phức/sin/cos/nội suy. Không ảnh/video/model3D tải ngoài, Python hoặc shaderGLSL tự viết. Nền6 dải sáng mềm,4 quầng màu,420 điểm bụi,144 ký tự dùng19 texture. Node/cạnh thật phân biệt với bụi trang trí bằng hover/click và dữ liệu paperId.

Mặt giấy được ưu tiên trong chế độ đọc để các điểm/quầng sáng không che chữ. Lựa chọn raycast không xuyên trang sách. Ảnh kiểm bằng capture-liquid.mjs trong .local/screenshots/liquid-*.png; các ảnh này không được dùng làm nền ứng dụng.

## Kích thước build hiện tại

| Asset | kB trước gzip | kB sau gzip |
|---|---:|---:|
| MainJS |661.28|249.88|
| Three.js |550.06|135.52|
| Scene |26.84|10.81|
| CSS |36.32|8.31|
| Embedding worker |547.26|Chưa lấy số gzip từ build|

kB=1000byte, KiB=1024byte. Gzip là file đã nén, không phải kích thước tải đo qua mạng thực. WASM Vite xuất26,861.77kB; model/tokenizer129.1MiB và các bản WASM local khác vẫn cần cache lần đầu. Còn cảnh báo JS chunk>500kB. QA projection cập nhật200ms, pixel ratio tối đa1.6, React không nhận tọa độ mỗi frame. Đây không phải số đo FPS hay bằng chứng60FPS; chưa benchmark GPU nhiều thiết bị hoặc20.000 bài.

Số API p50=14.24/p95=16.32/p99=16.83ms và response37.5KiB là phép đo mốc0.2 với30request tuần tự sau warmup, không phải đo mới của0.4. Định nghĩa và điều kiện giữ trong verification-0.3.md. Model smoke cũ6query MRR0.778, recall@3=5/6; không phải tập đánh giá độc lập. PCA3D giữ24.12% phương sai, ranking/màu/cạnh vẫn dựa trên vector384D.

## Phạm vi và nhật ký

App/web0.4.0 là minor vì thêm cách đọc và không gian hợp nhất; dependency/model revision không nâng. Dữ liệu/API không đổi contract. Danh mục AST cập nhật function-catalog.md/code-catalog.json; module web/scene có README và log AI kèm hash mã. Tự review, chưa có reviewer độc lập; runtime chỉ prefix embedding query/passage, không bịa log chatbot.

Corpus30 bài, chưa5.000–20.000. Chưa auth/RBAC/admin import/HTTPS443/backup nghiệm thu đầy đủ. Mongo local loopback chưa auth/TLS. Các hạn chế này không bị coi là đã hoàn thành bởi lần thiết kế giao diện. Cài model/dependency/cache đầu cần mạng; sử dụng sau chuẩn bị hỗ trợ offline.