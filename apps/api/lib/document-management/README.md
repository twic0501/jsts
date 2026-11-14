# FR20 Quản lý tài liệu đã nhập

Chủ sở hữu tài liệu `study` có thể vào **Tài liệu → Quản lý tài liệu** để sửa tiêu đề và nhãn, thay PDF có lớp văn bản, TXT hoặc Markdown, và xóa tài liệu. Mục quản lý chỉ hiện khi GET Document xác nhận quyền. Server kiểm chủ sở hữu, loại tài liệu, phiên FR12 và CSRF ở mỗi yêu cầu ghi.

Khởi động API và web bằng `pnpm dev`. Chạy worker riêng bằng `pnpm --filter @paper-galaxy/api worker:documents` với cùng `MONGODB_URI` replica set và `FR17_MONGODB_DB`. Worker dùng model E5 cục bộ đã được chuẩn bị theo hướng dẫn API. Nó thu hồi job hết lease và thử lại lỗi tạm tối đa ba lượt. Các trạng thái phiên bản và job vẫn được polling qua v4 khi worker chạy ở tiến trình khác.

- PATCH và DELETE dùng ETag của Document trong `If-Match`. POST phiên bản dùng multipart với `baseDocumentRevision`, `clientVersionId` và `file`. Thiếu revision trả 428, revision sai định dạng trả 422, revision cũ trả 409. Cả ba thao tác yêu cầu `Idempotency-Key`.
- Worker giữ nguyên phiên bản đang phục vụ trong khi xử lý file mới. Chỉ job đang giữ lease của yêu cầu thay mới nhất được công bố. Ghi vector, chunk, trạng thái job và active pointer trong một giao dịch MongoDB. Nếu có job thay bản C trong khi B đang chạy, B chưa từng được kích hoạt sẽ kết thúc với `VERSION_SUPERSEDED`.
- Sau 204, quyền trên tài liệu cha chặn mọi lần đọc mới, kể cả bản lịch sử. Worker dọn phiên bản, file GridFS và vector sau đó. Tài liệu đã xóa giữ tombstone cho việc chặn truy cập và đối chiếu receipt xóa.

Vector thế hệ hiện được lưu trong `document_index_vectors` cùng kho tài liệu v4. Nhánh hiện tại chưa có adapter Cassandra hoặc truy vấn Search v4 sử dụng collection này. Các API v1–v3 vẫn phục vụ corpus cũ. FR20 quản lý tài liệu study đã tồn tại trong kho v4, còn đường nhập file đầu tiên thuộc FR18.

Kiểm tích hợp thao tác và cạnh tranh worker bằng `pnpm exec vitest run tests/document-management.unit.test.ts`. Kiểm trình duyệt và worker E5 thật bằng `pnpm exec playwright test tests/e2e/fr17-reading.spec.ts`. PDF có lớp văn bản được trích xuất bằng PDF.js. Tệp PDF không có lớp văn bản kết thúc với lỗi nội dung.
