# 01 — Chúng ta làm gì và làm bằng cách nào?

> Cập nhật bản 0.2.0: đã có E5 384D, cosine, PCA3D và bàn phù phép. Xem [thiết kế đang triển khai](05-semantic-basic.md) và [kết quả kiểm chứng](verification.md). Các phần ghi bản đầu/TF-IDF bên dưới là lịch sử mốc 0.1.

Ngày bắt đầu triển khai: 04/11/2026. Theo yêu cầu mới: FE Vite, BE Next.js, mã JS/TS, cuốn sách ma thuật 3D tạo bằng toán. Quyết định này thay kiến trúc Express ở bộ hồ sơ cũ, giữ các mục tiêu dữ liệu/offline/bảo mật làm hướng phát triển.

## Trải nghiệm chính

1. Trang mở ra một cuốn sách giữa không gian tối, các ký tự và điểm sáng bay quanh.
2. Người dùng nhập câu tìm kiếm hoặc chọn chuyên ngành.
3. Backend tìm trong corpus đã cài trên máy. Danh sách bên trái cập nhật.
4. Chọn bài: camera tiến gần, sách mở, ký tự bay thu về, các tấm thông tin hiện trong không gian 3D.
5. Kéo để xoay, cuộn hoặc nút +/- để zoom, tạm dừng chuyển động, đặt lại góc nhìn.
6. Thông tin chi tiết dạng HTML luôn đọc được; lưu bài yêu thích bền trong IndexedDB.

## Trình tự kỹ thuật

- Chốt kiểu dữ liệu, kiểm input và hàm toán độc lập giao diện.
- Chuẩn bị corpus thật có URL arXiv; lưu snapshot, không cần mạng khi chạy.
- Viết repository JSON / MongoDB và API Next.js; kiểm dữ liệu trước khi trả.
- Dựng sách từ các khối và mặt phẳng Three.js. Chuyển động dùng số phức, nội suy theo dt.
- Nối React/Vite với API, thêm local search khi API mất kết nối.
- Kiểm unit, API, browser, cache, bookmark, chuyển động và build.

## Phân biệt mốc cơ bản và mục tiêu cuối

Bản đầu: corpus nhỏ có thật để kiểm toàn luồng, TF-IDF + từ khóa Việt/Anh, sách 3D và offline cơ bản. Đây chưa phải bộ dữ liệu 5.000–20.000 bài hoặc model embedding. Không sinh bài giả để tăng số lượng.

Tiếp theo: model embedding ONNX qua `@huggingface/transformers` trong JS/TS; đóng gói tokenizer, WASM và weights cục bộ. AI runtime planner nếu cần dùng model qua runtime có binding JS; dữ liệu đầu ra phải qua schema. Việc model gốc được huấn luyện bằng công cụ nào không tạo thêm dịch vụ Python cho dự án.

HTTPS443, đăng nhập/phân quyền, nhập dữ liệu, sync đa người dùng, PCA và đánh giá semantic là các mốc tiếp theo có nghiệm thu riêng. Bản đầu không tự thay thế toàn bộ hồ sơ thiết kế cũ.
