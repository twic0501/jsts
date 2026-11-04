# Kiểm chứng Paper Magic0.5 — chữ, node, portal và sách

Ngày04/11/2026. Dự án C:\Users\TrngTrn\paper-magic. Mã hiện tại và input/output giải thích trong docs/08-input-output-ritual.md. Báo cáo0.4 giữ tại verification-0.4.md.

| Kiểm tra thực chạy | Kết quả |
|---|---|
| pnpm typecheck |Core/web/API đạt|
| pnpm test |83/83 unit,7 file|
| Web build |TypeScript+Vite đạt; Next backend không thay mã/build|
| SW |22asset local, cache8d3a836fb9af|
| pnpm test:e2e |13/13 đạt, khoảng1.4phút, Edge/Chromium production|
| API/Mongo |30 bài, search/health/graph/neighbors và input lỗi đạt|
| Offline |Mất API chạy model trong browser; offline toàn mạng vẫn reload/tìm|
| Chuỗi thật |Vortex/charging/channeling/sealing/closing/settling/zooming/opening/reading đều quan sát trong browser|
| Thoát |Kiểm exit-reopen không chữ; sau đó exit-release có chữ và góc mở<0.82|
| Lật |Giữ trang[0,1] khi framing, chốt[2,3] sau lật, quay lại được|
| Mobile |390×844, đọc trái/phải, không tràn ngang|
| QA ảnh |Chụp giữa mở/lật, sau lật và thoát; không pageerror/console error|

83unit gồm83 trường hợp thực, không phải bộ252 kịch bản cuối môn. Thêm các kiểm nhịp tăng tốc, nguồn paperId, cung bay,3 đỉnh sáng, thứ tự portal/sách, sparse links giới hạn2 nhánh không tự nối/trùng/cạnh bị lọc. Test browser đa số dùng reduced motion để kiểm chức năng nhanh; một luồng chạy toàn bộ hoạt cảnh bình thường thật, không bỏ qua hiệu ứng trong phép kiểm đó.

## Bằng chứng ảnh, không chỉ chụp sau hiệu ứng

Script scripts/capture-book-qa.mjs chụp opening0.15/0.6/1.0s; turning0.22/0.58/0.84s; đọc/lật ngược/mobile; exit-reopen và exit-release. Đã xem ảnh trung gian và sửa:

- Lá giấy dựng bị cắt phía trên: camera lùi/nâng tâm nhìn, có turn-framing0.55s trước khi lật; mobile tạm xem cả sách rồi về focus.
- Mặt giấy ưu tiên quá sớm: chỉ ưu tiên khi đọc/lật, không vẽ chữ xuyên bìa đang mở.
- Mặt sau chữ ngược: FrontSide/BackSide và UV texture sau riêng; dispose khi xong/hủy.
- Trang mới xuất hiện trước lá lật: giữ trang cũ khi framing; đổi lớp nằm dưới khi bắt đầu lật, chốt spread khi xong.
- Portal trắng nhiều vòng: thay vùng tối có gradient mềm,1 vòng mảnh và2 nhánh xoáy dịu.
- Node như dính sách/rối: đặt lên/sau, bỏ tether cố định; mạng nền≤24 cạnh/2nhánh,node nhỏ/quầng gọn, có điểm sáng chạy qua liên kết.
- Cụm node trôi về một phía: quay quanh đúng tâm cụm, camera tổng thể nhìn giữa. Vẫn giữ phép biến đổi đồng nhất, không sửa khoảng cách PCA từng điểm.
- Chữ thoát khi sách còn đóng: thêm exit-reopen1.1s, sau đó mới nhả; còn có điều kiện góc thực<0.82.

Report .local/book-visual-qa.json ghi144 ký tự trung tính ban đầu,0 ký tự có màu; trong exit-reopen số chữ đang truyền0; lúc release góc0.72; network24 cạnh; không overflow/console error. Ảnh .local/screenshots/qa-*.png là bằng chứng QA, không dùng làm tài sản nền.

## Input/output và dữ liệu thật

Input câu hỏi/chủ đề + bộ lọc. Output bài báo đã có trong corpus được xếp theo cosine384D; node và sách hiển thị tên/tác giả/năm/summary/abstract/nguồn. Không sinh bài nghiên cứu mới. Ký tự đơn lấy từ tiêu đề và giữ nguồn ID, không tuyên bố ký tự được embedding riêng.

Màu theo query trong khi có câu tìm; trực tiếp chọn không query thì so với bài đang đọc. Dải prototype: xanh≥0.82, lam0.79–0.82, tím<0.79, không phải xác suất hoặc ngưỡng khoa học. Điểm thật không bị sửa để có màu. PCA3D chỉ quan sát, ranking ở384D. Nút arXiv gốc ở điều khiển sách và Góc đọc; nguồn ngoài cần Internet.

## Kích thước/hiệu suất

File build mới: main662.09kB (gzip250.20), scene35.59kB (13.97), Three552.66kB (136.19), CSS36.96kB (8.43). kB=1000byte. Gzip là mức nén file, không phải đo tải thực. Worker547.26kB, WASM Vite26,861.77kB, model/tokenizer129.1MiB và các bản WASM local khác còn cần cache. Còn warning JS chunk>500kB.

Chưa benchmark FPS/GPU nhiều thiết bị, không tuyên bố60FPS. Runtime clampdt0.05s, pixel ratio≤1.6, QA projection200ms, reuse glyph textures/baseColors. Số API p50/p95/p99 trước đây là benchmark0.2 với30 bài, không coi là đo mới0.5. PCA giữ24.12% phương sai; smoke model cũ6query MRR0.778,recall@3=5/6 không phải đánh giá độc lập. Xem verification-0.4/0.3 cho điều kiện số cũ.

## Phiên bản/phạm vi

App/web0.5.0, thêm hoạt cảnh và sửa ổn định hiển thị; dependency/model/API/Mongo schema không thay. AST hiện127 hàm/phương thức có tên và635 giá trị khởi tạo trong phạm vi bộ sinh; không tính callback vô danh, không bằng số contract kế hoạch. Catalog, README và log web/scene đã cập nhật. Self review, chưa có reviewer độc lập. Runtime chỉ prefix embedding query/passage; không bịa log chatbot.

Mã ứng dụng/script JS/TS. Geometry/Canvas/số phức/sin/cos/nội suy, không ảnh/video/model3D tải sẵn, Python hoặc shaderGLSL tự viết. Model ONNX/WASM là asset/runtime cài local, không phải train model mới. Corpus30 chưa5.000–20.000; chưa HTTPS443/auth/RBAC/admin import/backup nghiệm thu đầy đủ. Mongo loopback chưa auth/TLS. Các giới hạn vẫn giữ như mốc cơ bản.