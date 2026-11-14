# FR12 Giai đoạn 5.3

GET users/me, PATCH users/me, GET sessions/current và DELETE sessions/current đã nối vào service/repository có sẵn. Không sửa Frontend, FR14, FR25 hoặc shared Bootstrap. Đăng ký/đăng nhập 5.2 vẫn dùng nguyên cơ chế Mongo/Argon2id/cookie.

GET users/me lấy subject từ token hash của session còn hạn/chưa revoke, rồi đọc User hiện tại từ DB; trả User an toàn và ETag. Thiếu phiên hoặc User đã xóa trả 401. Không nhận userId/role từ query/body/header.

PATCH kiểm session, Origin, CSRF, JSON size/media và DTO strict chỉ displayName 1–100 Unicode code point. Không cho email/role/id/status/password. Idempotency-Key UUID và If-Match strong ETag bắt buộc. ProfileService gọi transaction update theo revision và ghi receipt cùng commit: stale revision 412, thiếu If-Match 428, key/payload khác 409. Retry đã commit kiểm receipt trước CAS, không tăng revision thêm. Key/fingerprint HMAC gắn userId và route, không lẫn receipt đăng ký hoặc user khác.

GET sessions/current là optional auth theo OpenAPI: phiên hợp lệ trả User hiện tại/CSRF/expiry gốc; thiếu/hết hạn/revoke/cookie sai/User bị xóa trả user=null và expiresAt=null, CSRF đúng kiểu contract. Không cấp session, không gia hạn, không ghi DB hoặc cookie khi GET. Response private,no-store và requestId. CSRF anonymous không phải token đăng nhập, không cấp quyền.

DELETE sessions/current kiểm Origin và CSRF nếu phiên đang hoạt động, revoke server trước khi xóa cookie cùng tên/Path/SameSite/HttpOnly/Secure, không Domain; Max-Age=0 và Expires quá khứ. Thành công 204 không body. Phiên đã hết hạn/revoke/không tồn tại được cleanup idempotent 204 với Origin hợp lệ; cookie malformed bị từ chối 403. Lỗi revoke trả 503 và không giả xóa cookie thành công. Không xóa tài khoản hoặc dữ liệu thư viện.

Role policy tại domain/role.policy.ts gồm isAdmin và requireRole. IdentityService.requireAuthenticatedUser/requireRole nhận cookie proof, đọc phiên và User lại từ DB mỗi lần. Không nhận User từ client làm principal; role demotion có hiệu lực cho lần kiểm kế tiếp. FR25 có thể dùng service boundary này sau khi đầu mối tích hợp nối DI; không sửa FR25 hoặc tạo API sửa role.

## Phần chính sách chưa có trong tài liệu

User schema được cung cấp không có trạng thái disabled/deactivated. Chưa tự thêm field hoặc đoán tên trạng thái. User bị xóa được xử lý 401/anonymous; vô hiệu hóa tài khoản cần nhóm chốt schema và quy tắc thu hồi phiên trước khi hỗ trợ. Không tuyên bố trường hợp này đã được triển khai.

## File thay đổi

- application/session.service.ts: current/requireAuthenticatedUser/logout, giữ nguyên create session.
- application/profile.service.ts (mới): điều phối profile CAS/receipt.
- application/identity.service.ts: facade profile/session và trusted role checks.
- presentation/identity.controller.ts, identity.validation.ts: HTTP adapters, ETag/patch/cookie cleanup.
- ports/user.repository.ts, session.repository.ts: update/revoke ports.
- infrastructure/mongo-identity.repository.ts: profile transaction/CAS/receipt và revoke.
- domain/role.policy.ts: role guards.
- tests/identity.authentication.test.ts, identity.authentication-http.mjs: cập nhật test 5.2 sang vòng đời đầy đủ; test đồng thời đăng ký/login giữ nguyên.

## Kiểm tra và kiểm thủ công

Chạy test/TypeScript/build theo README và HTTP script tự tạo DB/Next tạm; không dùng database production. Test profile, CAS/retry, role escalation rejection, role promotion/demotion từ server, expired/revoked/deleted/tampered sessions, CSRF, logout lặp lại và revoke lỗi. Lint chưa có script.

Kết quả: 90/90 test Identity đạt; TypeScript và Next production build đạt. HTTP smoke trên bản build với DB replica tạm đạt đăng ký/đăng nhập/profile/PATCH/current/logout, cookie cũ bị từ chối và current chuyển anonymous. Không kiểm thử trạng thái disabled chưa có contract; không dùng database production. File next-env.d.ts do build sinh được khôi phục để giữ scope.

Postman/Bruno trên staging riêng: register → login giữ cookie và csrfToken → GET me lấy ETag → PATCH với Origin/X-CSRF-Token/Idempotency-Key/If-Match → retry cùng key → stale revision → logout → cookie cũ GET me 401 và current anonymous. Thử bỏ Origin/CSRF và gửi role/email để xác nhận từ chối. Dùng HTTPS để browser tuân thủ cookie Secure.

5.4 đề xuất: adapter Frontend theo User/Session DTO, bootstrap current session và refresh CSRF, profile revision/ETag, logout và phân biệt lỗi 401/403/409/412; không tự fallback mock khi Backend lỗi. Chưa thực hiện 5.4.
