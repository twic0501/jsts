# 02 — Kiến trúc / API / dữ liệu

> Cập nhật bản 0.2.0: đã có E5 384D, cosine, PCA3D và bàn phù phép. Xem [thiết kế đang triển khai](05-semantic-basic.md) và [kết quả kiểm chứng](verification.md). Các phần ghi bản đầu/TF-IDF bên dưới là lịch sử mốc 0.1.

## Cấu trúc

`apps/web` là React/Vite; `apps/api` là Next.js backend; `packages/core` chứa contract, tìm kiếm và công thức dùng chung; `data` chứa corpus; `scripts` là Node.js `.mjs`; `tests` là kiểm thử TypeScript.

Trình duyệt → Vite proxy `/api` → Next.js → repository → JSON hoặc MongoDB. Không CORS mở mọi origin, không gọi API bên ngoài khi tìm.

## Contract dữ liệu bài báo

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id | string | ID arXiv, duy nhất |
| title / abstract | string | Tiêu đề / abstract gốc |
| authors | string[] | Danh sách tác giả |
| year | integer | Năm xuất bản, 1900–2100 |
| group | ai / biology / medicine / physics | Nhóm hiển thị, mapping đề xuất |
| categories | string[] | Nhãn arXiv gốc |
| sourceUrl | string URL | Chỉ URL https://arxiv.org/abs/... |
| tags / summary | string[] / string | Từ khóa và mô tả ngắn do nhóm biên soạn, không giả làm abstract gốc |

Mọi dữ liệu ngoài vào Zod trước. Mongo document nội bộ không trả `_id` ra frontend. Collection `papers`: unique id; collection `datasets`: version và manifest. Thay corpus bằng seed có kiểm tra, không mở API ghi công khai ở bản đầu.

## API bản đầu

| Method / route | Input | Output / lỗi |
|---|---|---|
| GET /api/v1/health | Không | storage, trạng thái; 503 nếu DB đã cấu hình nhưng lỗi |
| GET /api/v1/papers | Không | Corpus + storage; 503 khi repository lỗi |
| POST /api/v1/search | query, group?, yearFrom?, yearTo?, topK | Kết quả TF-IDF; 400 JSON hỏng; 413 quá lớn; 422 sai input |
| GET /api/v1/papers/[paperId] | ID | Paper; 404 khi không có |

`topK` là số nguyên 1..50; không nhận string số, null, Infinity hoặc field lạ. Query tối đa 300 ký tự; chuỗi rỗng có nghĩa duyệt toàn corpus. Lỗi trả `{error:{code,message}, requestId}` và không có stack.

## Lưu trong web

IndexedDB giữ snapshot đã validate và ID bài yêu thích. Khi API lỗi: hiện rõ “Dữ liệu trong máy”, tìm bằng cùng SearchIndex. Bookmark bản đầu chỉ thuộc trình duyệt này, chưa sync tài khoản. Service worker chỉ bật bản build; không cache API lỗi hoặc phụ thuộc CDN/font từ xa.
