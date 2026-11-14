# Hồ sơ dự án Paper Magic

Cập nhật ngày 04/11/2026 theo mã nguồn mốc 0.7.0. Văn bản mô tả chức năng, thiết kế và bằng chứng đã chạy; không dùng số kiểm thử dự kiến làm kết quả thực tế. Không có mục use case, phân công hoặc tiến độ nhóm.

## Tài liệu đọc chính

| Nội dung | Tài liệu |
|---|---|
| Thiết kế API v4 và mô hình dữ liệu đích cho FR17, FR20 và FR24 | [docs/design](design/README.md) |
| Đặc tả, định nghĩa, yêu cầu và điều kiện nghiệm thu | [13-requirements.md](13-requirements.md) |
| Kiến trúc thống nhất, API, CSDL và flow | [14-architecture-api-database.md](14-architecture-api-database.md) |
| Hàm, biến, công thức và null/undefined | [03-ham-bien-toan.md](03-ham-bien-toan.md) |
| Mọi hàm có tên và tham số | [function-catalog.md](function-catalog.md) |
| Mọi biểu thức khởi tạo biến | [variable-catalog.md](variable-catalog.md) |
| Danh mục có thể đọc bằng chương trình | [code-catalog.json](code-catalog.json) |
| Module, số hàm/biến, README và AI log | [18-module-inventory.md](18-module-inventory.md) |
| Các loại test, tải, độ bền, chỉ số và giới hạn | [15-testing-resilience.md](15-testing-resilience.md) |
| Kết quả kiểm thử trước lần cập nhật hồ sơ | [verification.md](verification.md) |
| Hướng dẫn hosting, HTTPS443, bảo mật và mã hóa | [16-hosting-https.md](16-hosting-https.md) |
| Phiên bản và quy trình kiểm chứng | [17-version-verification.md](17-version-verification.md) |
| Chi tiết RAG đang chạy | [12-rag-architecture.md](12-rag-architecture.md) |
| Slide cập nhật | Thư mục [presentation](presentation) |
| Bằng chứng kiểm thử tải/TLS và bản chốt | Thư mục [evidence](evidence) |

01–04 đã được đồng bộ lại. Các tài liệu05–12 và verification-0.x mô tả từng mốc; số liệu lịch sử không tự áp dụng cho mã mới. Bản cũ của01–04 được giữ trong archive khi thay nội dung.

## Phạm vi hiện tại

React/Vite + Next.js + MongoDB + IndexedDB. Các model chạy cục bộ bằng JavaScript/TypeScript; không có dịch vụ Python. Tìm kiếm ở vector384D, PCA dùng để hiển thị3D, RAG đọc abstract/tiêu đề. Chưa có full-PDF RAG, tài khoản/RBAC/sync hoặc nghiệm thu5.000–20.000 bài. Kiểm HTTPS443 cục bộ khác với có tên miền public và chứng chỉ CA được cấp thật.


Bản trình bày chốt có27slide ởpresentation, kèmPPTXchỉnhsửa vàPDFđểxem. Kiểm mới: load120/120, soak45/45trong180s, burst2×200+10×429, offlineRAG200; Nginx443TLS1.3/auth401/200 đạt. Chưa có publicdomain.


Bổ sung kiểm public demo: [19-public-demo.md](19-public-demo.md), URLHTTPS cóBasicAuth, API/Mongo vàsách3D đã được kiểm quaInternet. Đây làQuickTunnel tạm thời, chưa thay hostingproduction.
