# FR17 Mốc đọc theo phiên bản

Các route FR17 đọc và ghi mốc theo hợp đồng v4 của dự án. GET một mốc trả ETag. PUT tạo dùng `If-None-Match: *` và trả 201 với Location. PUT cập nhật dùng `If-Match` và trả 200. Cả hai trả revision trong body. [Hợp đồng FR17](../../../../docs/27-backend-domain-baseline.md#fr17-đọc-và-ghi-mốc-theo-revision)

## Phụ thuộc tích hợp

- `MONGODB_URI` chỉ tới MongoDB replica set. `FR17_MONGODB_DB` có thể chọn database riêng. Mặc định dùng database trong Mongo URI.
- Cấu hình phiên theo [FR12](../../src/modules/identity/.env.example). FR17 dùng trực tiếp module Identity để kiểm cookie `__Host-pm_session`, tài khoản, phiên, Origin và CSRF. Config backend có thể nạp từ `.env` qua `pnpm dev`.
- Kho phiên bản cung cấp `documents` (UUID làm `_id`, `ownerId`, `visibility`, `activeVersionId`, `deletedAt`), `document_versions` (DTO phiên bản, UUID làm `_id`, `documentId`, `activatedAt`, `pageCount`, `sourceFileId`), và `document_chunks` (DTO đoạn, UUID làm `_id`). Ordinal của chunk duy nhất trong một phiên bản. `activatedAt` lưu thời điểm từng kích hoạt để đọc lại bản lịch sử. File nguồn tùy chọn nằm trong GridFS bucket `document_sources` và được tham chiếu bằng ObjectId. Mặc định chỉ chủ tài liệu được tải file. `allowSourceDownload` có thể cho phép người đọc hợp lệ tải file hoặc chặn cả chủ tài liệu. API phục vụ tài liệu công khai hoặc tài liệu thuộc người dùng hiện tại. Chia sẻ cho người dùng khác thuộc FR23.

FR17 quản lý `reading_states` với unique index theo chủ và tài liệu, `reading_state_receipts` với TTL 24 giờ và `reading_state_changes`. Ghi thành công commit cả ba trong một giao dịch. Mỗi lần replay kiểm lại quyền phiên bản trước khi đọc receipt. Feed đồng bộ chung có thể tiêu thụ sự kiện này khi được tích hợp.

Đăng nhập từ thanh trên cùng, chọn **Tài liệu**, mở một tài liệu và dùng **Lưu vị trí**. Reader lấy thư viện qua `GET /api/v4/documents`, lấy phiên bản hiện hành qua `GET /api/v4/documents/{id}` và dùng `versionId` của mốc khi mở lại. Nó khôi phục đoạn trước, rồi đến trang nguồn nếu mốc chỉ có trang, rồi dùng tiến độ khi cần. Nếu bản lưu hết khả dụng, người dùng có thể chọn mở bản hiện hành từ đầu.

Client giữ key và ETag gốc trong IndexedDB theo tài khoản, lấy CSRF từ phiên hiện tại rồi gửi lại cùng yêu cầu khi cần. Khi máy chủ trả 412, giao diện hiển thị mốc thiết bị và mốc máy chủ. Chọn dùng mốc máy chủ sẽ mở vị trí đó. Chọn giữ mốc thiết bị sẽ gửi một ý định mới có key mới và ETag vừa đọc. Kho v4 dùng tài liệu đã có trong MongoDB. Reader sách 3D của corpus v1 tiếp tục dùng dữ liệu v1 và không suy đoán mapping sang UUID.

## Kiểm thử

`node node_modules/vitest/vitest.mjs run tests/reading-states.unit.test.ts` chạy các route thật với một MongoDB replica set dùng một lần. Có thể đặt `MONGOMS_SYSTEM_BINARY` trỏ tới mongod 8.0.16 đã có. Kịch bản dùng hai phiên cho cùng tài khoản, kiểm tạo và cập nhật đồng thời, replay, quyền truy cập, trang/chunk lỗi và mở lại A sau khi active pointer chuyển sang B.

`pnpm exec playwright test tests/e2e/fr17-reading.spec.ts` khởi động Next, Vite và MongoDB cô lập, đăng nhập FR12 qua hai hồ sơ trình duyệt, rồi kiểm lưu, xử lý xung đột, retry sau mất phản hồi và mở lại bản A. Kịch bản đổi con trỏ sang B trong fixture MongoDB để kiểm luồng đọc.
