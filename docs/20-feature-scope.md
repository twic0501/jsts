# Tính năng Paper Magic đã cập nhật

Ngày 13/11/2026. Đối chiếu source `086286c`; tính năng mới trong thiết kế chưa được code. Đọc [requirements](13-requirements.md), [phần mềm](29-software-design.md), [OpenAPI](design/software-api.openapi.json).

## Lõi sản phẩm

| Nhóm | Tính năng đích | Đã có và cần bổ sung |
|---|---|---|
| Khám phá | Search ngữ nghĩa, lọc, lân cận | Có E5/cosine 30 bài; chưa tìm chung study/paper |
| Đọc/3D | Sách Three.js, node/cạnh, xoay/zoom/lật trang, nguồn | Có scene/abstract; chưa pipeline fulltext mới |
| Thêm tài liệu | PDF text/TXT/MD, trạng thái/lỗi/version | Chưa có; cần parse/chunk/embed/publish generation |
| RAG | Câu trả lời có quote/trang/nguồn | Backend v3 có, UI chưa nối đầy đủ |
| Offline | Tìm/đọc phần tải và giữ mutation pending | Có fallback/model; chưa facade/replay mới |

## Tiện ích cá nhân

| ID | Tính năng | Hành vi |
|---|---|---|
| FR12 | Tài khoản | Đăng ký/đăng nhập/đăng xuất/hồ sơ/role; không token/password trong IDB |
| FR13 | Lịch sử tìm | Lưu query/thời gian/filter, tìm lại/xóa, một submit một record |
| FR14 | Yêu thích | Lưu/bỏ lưu và sync user; hiện mới có local bookmark |
| FR15 | Bộ sưu tập | CRUD và membership, không xóa Document khi xóa collection |
| FR16 | Ghi chú | CRUD gắn document/chunk/version và xử lý conflict |
| FR17 | Vị trí đọc | Một mốc theo tài khoản và tài liệu. Mở lại đúng phiên bản đã đọc và đối chiếu revision giữa các thiết bị. |
| FR18 | Nhập tài liệu | Tiến trình rõ, file hỏng/rỗng/trùng/quota, private mặc định |
| FR19 | Tìm chung | Một Search API trả paper/study trong quyền |
| FR20 | Quản lý tài liệu | Chủ tài liệu đã nhập sửa metadata, thay file bất đồng bộ và xóa. Chỉ yêu cầu thay mới nhất được kích hoạt. Xóa chặn mọi phiên bản. |
| FR21 | Dữ liệu offline | Chọn tải, trạng thái đủ tài nguyên và xóa cache an toàn |
| FR24 | Thiết lập | Theme, cỡ chữ, giảm chuyển động và chất lượng cảnh lưu theo hồ sơ trình duyệt, dùng cả khi chưa đăng nhập. |
| FR25 | Quản trị | Import manifest, job/error/reindex có quyền |

Tài khoản/history/collection/note và sync mới chưa có runtime. Một hàng tính năng không bằng một endpoint hoặc một function đã triển khai.

## Mở rộng

FR22 BibTeX/RIS khi metadata đủ; FR23 chia sẻ theo quyền; đổi/đặt lại mật khẩu, xác minh email và OCR cần contract/security riêng trước khi bật. Chưa có đầy đủ endpoint cho các phần mở rộng trong API lõi gửi kèm. Sao chép trích dẫn hiện có không là đủ mọi định dạng xuất.

## Hành vi thống nhất

Nhập file → kiểm → parse → chunk giữ trang/mục → vector → index generation → ready. PDF ảnh quét chưa có OCR phải báo rõ. File đang queued chưa được hiển thị như đã tìm được trên server.

Search dùng Document/Chunk chung. Vector cấp bài cho search/graph, cấp đoạn cho evidence. Summary là dẫn xuất, không thay nguồn. Thêm tài liệu cập nhật chỉ mục, không train lại model.

Ghi cá nhân dùng DataService + IDB outbox; online gửi ngay, offline chờ, cùng REST API/key/revision. GET sync nhận canonical/tombstone, không có /sync/push ghi nghiệp vụ thứ hai. Tài liệu 21–24 cũ không áp dụng phần mâu thuẫn với baseline 26–29.

Nghiệm thu: CRUD/reload đúng, không lộ quyền, version/index/citation khớp, xóa trong lúc job chạy không hồi sinh; retry sau commit không trùng; hai user không lẫn; conflict giữ draft; quota/model/file lỗi có trạng thái rõ. Đây là yêu cầu, chưa là test đã đạt.
