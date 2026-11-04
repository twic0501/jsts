# 04 — Kiểm chứng, offline và bảo mật

> Cập nhật bản 0.2.0: đã có E5 384D, cosine, PCA3D và bàn phù phép. Xem [thiết kế đang triển khai](05-semantic-basic.md) và [kết quả kiểm chứng](verification.md). Các phần ghi bản đầu/TF-IDF bên dưới là lịch sử mốc 0.1.

## Các lớp kiểm thử bản đầu

1. Unit: phép quay 90°, bảo toàn khoảng cách, đảo thứ tự quay ngược, damping theo dt; topK, số sai, query không có, lọc năm/chuyên ngành, self-exclusion.
2. API/contract: health, corpus, search POST input hợp lệ/sai, JSON hỏng, paper không có; xác nhận không leak Mongo document.
3. E2E: trang mở → tìm → chọn bài → sách mở → chi tiết khớp → bookmark → reload → giữ bookmark; lọc và empty; kéo/zoom/pause/reset.
4. Offline: chặn API rồi tìm bằng corpus cục bộ; bản production đã cài service worker reload khi network offline.
5. Build/typecheck: kiểm TypeScript cả 3 workspace và build Vite/Next thật.

Test đang được xây và chạy; kết quả cuối lưu trong `docs/verification.md`. Không tái sử dụng số test PASS của bản trình bày để nói ứng dụng này đã đạt.

## Biên bảo mật bản cơ bản

- Dev chỉ bind 127.0.0.1. Chưa có public hosting và chưa hoàn thành HTTPS443.
- API đọc, không có import/admin công khai. Body có giới hạn, schema strict, URL arXiv allowlist, abstract render text.
- Không lưu mật khẩu/API key. Không nhúng secret trong Vite. Mongo URI chỉ ở backend/env.
- Có Mongo URI nhưng DB lỗi thì trả 503; không im lặng gọi JSON là MongoDB.
- Nội dung kết quả và bookmark local không xem như quyền tài khoản; chưa triển khai login/sync nên không quảng cáo có chức năng đó.

## Phiên bản và kiểm tra

Đọc tài liệu chính thức đúng phiên bản, chạy spike, khóa pnpm-lock, typecheck/test/build rồi mới đánh dấu kiểm chứng. Patch sửa lỗi tương thích; minor thêm chức năng tương thích; major có thể phá tương thích. Quy ước môn học thêm điều kiện patch giữ cấu trúc đã chốt.

Nguồn đối chiếu: https://vite.dev/guide/ ; https://nextjs.org/docs/app/getting-started/route-handlers ; https://info.arxiv.org/help/api/basics.html . Không dùng nguồn ngoài trong luồng tìm kiếm.
