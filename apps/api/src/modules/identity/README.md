# FR12 Đăng ký và đăng nhập

Mã được tích hợp từ `origin/feature/fr12-fr14-swagger` để cấp phiên và xác thực FR17. POST đăng ký và đăng nhập, GET/PATCH hồ sơ, GET/DELETE phiên hiện tại dùng chung Identity module. Xem [cấu hình môi trường](.env.example) và [tích hợp FR17](../../../lib/reading-states/README.md).

Các ghi chú triển khai 5.2 bên dưới mô tả lúc đăng ký và đăng nhập được bổ sung lần đầu, trước các thao tác hồ sơ và phiên.

## Contract và policy

Nguồn: bộ thiết kế ngày 13/11/2026 đã cung cấp (baseline 27, design 29, registry/matrix và OpenAPI), cộng tài liệu cấu trúc Backend DOCX. Snapshot FR12 ở `contracts/fr12.reference.json`, gồm source SHA-256; không sửa contract gốc. Runtime MongoDB ở `lib/repository.ts` chỉ phục vụ corpus trước đó; không có shared Identity/Bootstrap/DB pool để tái sử dụng trong checkout. Giữ composition root cục bộ cho tới khi đầu mối tích hợp cung cấp Bootstrap chung.

Ngày 14/11/2026, người dùng xác nhận policy cho 5.2: Argon2id; email trim + lowercase; session Mongo chỉ lưu hash; cookie `__Host-pm_session` luôn Secure/HttpOnly/Path=/; TTL, SameSite, Origin và ngưỡng chống brute force phải cấu hình; Origin cho pre-auth và CSRF gắn phiên khi có phiên cookie đang hoạt động. Không tự chọn JWT hoặc identity provider khác.

Tài liệu nêu `password hash only`, không cấm mọi password verifier. Vì vậy lưu Argon2id hash được phép; không lưu mật khẩu rõ, mã hóa hai chiều, raw token hoặc credential vào receipt/log. Không seed tài khoản demo trên Backend.

## Hai luồng đã triển khai

### Đăng ký

1. Route gọi Controller; thiếu cấu hình server trả 503, không kích hoạt mock.
2. Controller kiểm Origin chính xác từ allowlist, cookie/CSRF nếu có phiên đang hoạt động, JSON tối đa 65.536 byte, DTO strict và Idempotency-Key UUID.
3. DTO bắt buộc email/password/displayName; email tối đa 254, password 12..256 ký tự, displayName 1..100. Từ chối field lạ, role/userId/confirmPassword và không ép kiểu. Độ dài password/displayName đếm Unicode code point; không thêm quy tắc độ phức tạp ngoài contract.
4. Service chuẩn hóa email trim + lowercase, áp attempt/concurrency limits; tìm receipt trước khi kiểm email trùng. Fingerprint là HMAC có secret trên payload canonical chứa password; DB không chứa password gốc hoặc fingerprint công khai có thể dò offline.
5. Hash password bằng thư viện Argon2id; tạo User UUID, role mặc định user, revision 1, updatedAt từ đồng hồ server.
6. Repository transaction ghi User + receipt. Unique index trên email canonical chặn race. Retry cùng key/payload trả User đã commit; key cũ/payload khác trả 409; lỗi receipt rollback cả User. TTL hết hạn được kiểm trong query, không chỉ trông chờ TTL monitor.
7. Trả 201 User theo allowlist + Location `/api/v4/users/me` + ETag. Không tự tạo session/cookie sau đăng ký.

### Đăng nhập

1. Controller kiểm Origin, media/size/DTO, cookie/CSRF như trên. DTO chỉ email/password; login nhận password 1..256, không áp nhầm minimum đăng ký.
2. Service áp attempt limit, đọc credential qua repository và verify Argon2id. Email không có cũng verify một dummy hash với cùng cấu hình; lỗi công khai của email không có và sai password đều 401 `INVALID_CREDENTIALS`. Không tuyên bố đã triệt tiêu mọi timing side channel.
3. SessionService sinh opaque token từ 32 byte random CSPRNG. Repository chỉ nhận SHA-256 hash của token, userId và thời điểm, lưu session thật trong Mongo. Nếu đã có phiên, insert phiên mới và revoke phiên cũ cùng transaction.
4. Chỉ sau commit, Controller phát cookie `__Host-pm_session`: HttpOnly; Secure; Path=/; không Domain; SameSite/Max-Age/Expires từ cấu hình. Không có cookie nếu session write lỗi.
5. JSON là `{user, csrfToken, expiresAt}` đúng contract. Token cookie không xuất hiện trong JSON. CSRF token là HMAC gắn riêng với opaque session token, không phải raw session token; không lưu CSRF token vào DB/outbox/log.

Mỗi response có `Cache-Control: private, no-store` và `X-Request-Id`. Error body dùng helper chung `{error:{code,message},requestId}`. Không đưa raw Mongo/Argon2 exception, stack hoặc secret vào response/log. Success DTO chọn rõ field, không spread persistence object. Đăng nhập không nhận receipt/idempotency replay hoặc đưa password vào outbox.

## Origin, cookie và CSRF

Không lấy Host/X-Forwarded-* hoặc Referer từ client làm allowlist. Origin thiếu/null/khác chính xác cấu hình trả 403. Chỉ nhận JSON, không cho form content type đi vào credential handler. CORS mới chưa được mở trong phạm vi này.

Pre-auth chưa có phiên dùng mandatory Origin + JSON. Cookie đang hoạt động phải có X-CSRF-Token đúng HMAC và session còn hiệu lực trong Mongo. Cookie hết hạn/revoked/không tìm thấy không tạo principal: request được coi pre-auth và vẫn kiểm Origin/JSON/password. Cookie malformed hoặc lặp cùng tên bị từ chối. Không tin role/userId do client khai.

Cookie luôn Secure kể cả development theo policy đã xác nhận; dùng HTTPS khi kiểm thực tế bằng browser, không tự bỏ Secure hoặc đổi tên cookie để chạy HTTP. HTTP smoke bằng Node xác nhận header/server behavior, không thay cho kiểm browser qua HTTPS. Trong 5.2, client giữ CSRF từ response login; API đọc lại phiên/CSRF sau reload thuộc 5.3, chưa bật. Secret rotation cần được phối hợp với session/CSRF lifecycle ở bước tích hợp, không tự đoán trong module khác.

## MongoDB và chống brute force

Chỉ dùng các collection do FR12 sở hữu trong database cấu hình riêng:

| Collection | Dữ liệu và ràng buộc |
|---|---|
| identity_users | User công khai + passwordHash nội bộ; UUID _id, email canonical unique |
| identity_sessions | _id là token hash, userId/createdAt/expiresAt/revokedAt; TTL expiresAt, index userId |
| identity_registration_receipts | key HMAC, payload HMAC, User an toàn và expiresAt; TTL, không password/cookie |
| identity_auth_limits | bucket HMAC theo action + email canonical, count và expiresAt; TTL |

Khởi tạo lazy qua repository; không thay collection/schema corpus. Mongo phải là replica set hoặc sharded deployment hỗ trợ transaction. Standalone trả 503 trước khi công bố thành công, không giả bảo đảm atomic bằng memory/JSON. Không tự chuyển Mongo production sang replica set; cần đầu mối hạ tầng cấu hình. Pool cục bộ tối đa 5, timeout server selection/connect/queue 2,5s, socket 10s; commit có giới hạn riêng. Khi shared pool xuất hiện, adapter có thể được ghép lại ở Bootstrap chung.

Rate limit là fixed-window atomic trong Mongo theo action + canonical email được HMAC. Đếm mọi lần thử, cả thành công, để không reset/quên budget khi restart worker; vượt ngưỡng trả 429 và Retry-After. Ngoài ra giới hạn số password work đang chạy trong application instance, không xếp hàng không giới hạn. Đây không thay thế quota theo IP/WAF ở ingress; không tự tin header IP khi chưa có trusted-proxy contract. Cần benchmark/tune cấu hình và giới hạn ingress trước production lớn.

## Cấu hình bắt buộc — chỉ tên biến

Mẫu tên biến tại `.env.example` trong module, không chứa giá trị bí mật. Thiết lập trong environment của API hoặc `apps/api/.env.local` (gitignored); file mẫu trong module không tự được nạp.

- MONGODB_URI
- IDENTITY_MONGODB_DB
- IDENTITY_SECRET
- IDENTITY_ALLOWED_ORIGINS
- IDENTITY_SESSION_TTL_SECONDS
- IDENTITY_SESSION_SAME_SITE
- IDENTITY_AUTH_WINDOW_SECONDS
- IDENTITY_AUTH_MAX_ATTEMPTS
- IDENTITY_AUTH_MAX_CONCURRENT
- IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS

Không dùng VITE_* để cấu hình secret. IDENTITY_SECRET là key random ít nhất 32 byte, encode Base64 chuẩn; không in key ra log. Origins là danh sách origin phân cách bằng dấu phẩy, không path/wildcard; production chỉ chấp nhận HTTPS. SameSite nhận Lax/Strict/None. Các số phải là số nguyên dương: session tối đa 365 ngày, window tối đa 1 ngày, attempts tối đa 10.000, concurrent tối đa 16, receipt tối đa 7 ngày. Đây là giới hạn cấu hình, không phải giá trị default. Thiếu/sai bất kỳ biến bắt buộc nào thì 503; thay cấu hình cần restart API.

## File tạo/sửa trong 5.2

- `identity.bootstrap.ts`, `identity.module.ts`: ghép Mongo/hasher/crypto/session/application khi cấu hình hợp lệ; giữ readiness fallback thật sự không khả dụng, không mock.
- `identity.config.ts`, `.env.example`: cấu hình bắt buộc và kiểm tra an toàn.
- `presentation/identity.controller.ts`: HTTP guard/input/output, 201/200/cookie và lỗi chuẩn; không query DB.
- `presentation/identity.validation.ts`, `identity.dto.ts`: JSON streaming limit, schema strict và cookie serialization; ProfilePatch vẫn type-only.
- `application/identity.service.ts`, `session.service.ts`: đăng ký, đăng nhập, capacity và session orchestration; bốn operation khác chưa bật.
- `domain/identity.error.ts`, `role.policy.ts`: lỗi an toàn, canonical email, role đăng ký và public User mapping.
- `ports/user.repository.ts`, `session.repository.ts`, `authentication.ts`: credential/receipt/session/rate/hash boundaries, không raw token qua repository.
- `infrastructure/mongo-identity.repository.ts`, `identity.crypto.ts`: Mongo transaction/index/TTL/limiter và Argon2id/CSPRNG/HMAC adapter.
- `tests/authentication.fixtures.ts`, `identity.authentication.test.ts`, `identity.config.test.ts`, `identity.authentication-http.mjs`, `vitest.config.ts`: test cấu hình và đăng ký/đăng nhập thật trên DB tạm, cùng lỗi/race/security.
- `apps/api/package.json`, `pnpm-lock.yaml`: thêm argon2 pin version, khai báo Zod cùng phiên bản core. `pnpm-workspace.yaml` chỉ thêm allowBuilds cho native package argon2.
- README và AI development log cập nhật kết quả thực tế. Các Route Handler users/sessions có sẵn được tái sử dụng, không cần thay code route hoặc mở server thứ hai.

## Kiểm chứng

Từ gốc jsts:

```powershell
pnpm.cmd --filter @paper-galaxy/api typecheck
pnpm.cmd exec vitest run --config apps/api/src/modules/identity/tests/vitest.config.ts
pnpm.cmd --filter @paper-galaxy/api build
node apps/api/src/modules/identity/tests/identity.authentication-http.mjs
```

Test chỉ dùng MongoMemoryReplSet/MongoMemoryServer với database random riêng, không đọc URI production. HTTP script tự tạo replica tạm và Next process/port tạm, ghi đè toàn bộ Identity env bằng fixture trong process con rồi đóng chúng. Cache binary Mongo nằm trong `.local/fr12-test-mongodb-binaries`, gitignored. Các repo test doubles chỉ phục vụ fault injection; Bootstrap thật không có mock authentication/store.

Kết quả cuối: 88/88 test Identity đạt (5 file), gồm Mongo transaction/unique/rollback, Argon2id, session/cookie, Origin/CSRF, race/idempotency, rate limit, lỗi DB/verifier và cấu hình fail-closed. API TypeScript check và Next production build đạt. HTTP script trên build thật cũng đạt cho đăng ký/đăng nhập/race/retry/cookie/CSRF/rate limit và bốn API ngoài phạm vi vẫn 503; không dùng database production. AI development log lưu kết quả thực tế, không lưu credentials. API/root chưa có script lint nên không cài thêm lint framework. Không tính các test ngoài module chưa chạy vào số FR12 đạt. HTTP script cũ `identity.http-smoke.mjs` chỉ dùng khi cố ý chưa cấu hình Identity để kiểm readiness, không dùng làm test success của 5.2. Thay đổi `next-env.d.ts` do Next tự sinh khi build được khôi phục để giữ phạm vi chỉnh sửa.

Argon2id dùng memoryCost 19.456 KiB, timeCost 2, parallelism 1, salt do library sinh. Tham khảo [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) và [node-argon2](https://github.com/ranisalt/node-argon2). Thiết kế CSRF gắn phiên đối chiếu [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). Không tự viết thuật toán hash password.

## Phần còn lại / Giai đoạn 5.3 — chưa triển khai

GET sessions/current, DELETE sessions/current và GET/PATCH users/me vẫn 503 theo giới hạn 5.2. Bước sau cần principal/require-auth dùng chung, đọc/thu hồi phiên, CSRF refresh/pre-auth lifecycle, hồ sơ với Idempotency-Key/If-Match, hết hạn/rotation và nối Bootstrap/pool chung. Quy trình migration/index/secret/HTTPS/ingress phải được kiểm staging với hạ tầng nhóm.

Frontend/mock/FR14 và API v1–v3 không thay đổi trong giai đoạn này; nối client thật là bước riêng khi được yêu cầu. Chưa deploy, chưa seed tài khoản thật, chưa chạy trên DB production và chưa tuyên bố đã nghiệm thu hệ auth production.
