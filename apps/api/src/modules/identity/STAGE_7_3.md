# Giai đoạn 7.3 — FR12 hardening và regression

## A. Kết quả sửa lỗi

Baseline: Backend 90/90, frontend auth/bookmark 22/22. Đã đối chiếu contract fr12.reference.json và tài liệu nhóm trong `.local/fr12-reference-2026-11-13/docs/design/`. Giữ nguyên thay đổi chưa commit có sẵn; không reset/commit/push. Endpoint, HTTP status và wire DTO không đổi.

| Mã | Trạng thái | File chính / xử lý | Xác minh |
| --- | --- | --- | --- |
| CQ01 | Fixed | real-auth-client: status riêng từng endpoint, JSON Content-Type, User/Session schema, login kiểm cookie và danh tính; logout chỉ nhận 204 | Frontend unit, browser HTML logout bị từ chối |
| S03 | Partially Fixed | Registration receipt mới dùng Argon2id có salt; repository trả receipt thắng cuộc để Application verify | Mongo retry/đổi payload/concurrency/legacy; HMAC fingerprint không nhận password |
| S01 | Partially Fixed | Global budget Mongo theo operation/window; source quota qua resolver server tin cậy; bỏ khóa theo email | Integration nhiều email/header, hai service instance, nguồn khác vẫn đăng nhập |
| CQ02 | Fixed | Application models riêng, SessionService nhận policy hẹp; Presentation map wire DTO | TypeScript, DTO tests, browser |
| CQ03 | Fixed | Module.authorization là interface hẹp; active/unavailable implementations tách riêng, fail-closed | Unit facade/readiness 503, integration role/principal |
| CQ04 | Fixed | PATCH chỉ xác minh principal/CSRF một lần tại Service; loader DTO/Origin vẫn tại Controller | Một session read + một user read; anonymous malformed PATCH 401 và body chưa đọc |
| CQ05 | Fixed | Error code 409 phân biệt; 403/429 riêng, Retry-After; AuthActionResult rõ; lỗi pending action không hủy login đã xác minh | Frontend unit và browser Provider probe |
| S04 | Fixed | HTTP chỉ trên loopback; public IPv4/IPv6/hostname cần cert+key | 12 guard tests |
| S05 | Fixed | BroadcastChannel chỉ invalidation, không gửi user/token; abort phản hồi cũ và verify lại Backend; queue focus refresh khi bận | 2 event tests, browser hai tab/tài khoản thật |
| S06 | Fixed ở ứng dụng | Audit port/sink allowlist event/timestamp; sink lỗi không thay auth result | Unit redaction/sink failure, integration events |
| S02 | Unchanged | Giữ 409 EMAIL_ALREADY_REGISTERED đúng contract | Kiểm status/code/message duplicate canonical email và browser |
| CQ06 | Fixed | scripts/fr12/check.mjs chạy các nhóm riêng, tùy chọn TypeScript/build/browser | Đã chạy entrypoint mặc định và full build/browser |
| CQ07 | Fixed trong phạm vi module | Explicit checkReady/readiness; reuse promise/client; không thêm shutdown hoặc gom pool của FR khác | TypeScript/integration; giữ quyền sở hữu client tại repository |

### Receipt mới và dữ liệu cũ

Không đổi collection, index, tên field hoặc type BSON. **Encoding fingerprint của receipt đăng ký mới thay đổi** từ HMAC sang chuỗi Argon2id. Canonical email/password/displayName được kiểm bằng KDF chậm có salt; không có bộ kiểm tra password nhanh khác. PasswordHash tài khoản vẫn dùng Argon2id.

User+receipt vẫn commit nguyên tử. Khi request cạnh tranh gặp receipt đã tồn tại, repository trả receipt thắng cuộc; Application dùng KDF verify, payload khác trả IDEMPOTENCY_CONFLICT. Không so sánh hai salted hash để suy ra cùng payload.

Receipt HMAC cũ bị fail-closed 503 khi retry, không fallback và không tự nâng cấp. Tài khoản cũ vẫn login được. Receipt profile không chứa password và không đổi cơ chế. **Chưa xóa/convert dữ liệu hoặc backup cũ**; rủi ro HMAC cũ chưa tự biến mất. Cần nhóm chốt kiểm kê, TTL/backup/retention, rollout đồng bộ và có cần migration hay không. Không chạy bản cũ tiếp tục ghi HMAC song song với bản mới rồi coi tương thích hoàn toàn.

### Rate limiting và ingress còn phụ thuộc

IDENTITY_AUTH_MAX_ATTEMPTS hiện là **global budget cho mỗi operation/window**, không còn theo email. Nhóm cần xem lại ngưỡng theo tải trước production. Bộ đếm Mongo dùng chung giữa các instance có cùng DB/secret; semaphore memory chỉ giới hạn công việc đồng thời trong process. 429 kèm Retry-After tới cuối cửa sổ.

Optional IDENTITY_AUTH_SOURCE_MAX_ATTEMPTS phải nhỏ hơn global budget. Source bị chặn không tiếp tục tiêu global budget. Source quota chỉ có tác dụng khi composition root được cấp requestSource resolver đã review.

Next Request hiện không cung cấp peer IP đáng tin trong module này. Bootstrap chưa tự bật IP resolver, không tin X-Forwarded-For/X-Real-IP và không thêm secret/header proxy giả. Mặc định có global budget; trusted-source/edge protection cần nhóm chốt topology và cấu hình. Không sửa deployment. Global budget có thể ảnh hưởng người dùng hợp lệ khi bị tiêu hết; chưa coi đây là chống DoS/credential stuffing production hoàn chỉnh.

### Interface, lifecycle và audit

`getIdentityModule().authorization` cung cấp requireAuthenticatedUser, requireRole, assertMutationProof. Không cần gọi Controller hoặc deep-import concrete IdentityService. Principal luôn kiểm với DB; ownership tài nguyên vẫn thuộc FR sở hữu. HTTP Origin validation vẫn thuộc boundary và không được bỏ khi FR khác tích hợp.

Module expose readiness để composition root có thể kiểm trước nhận traffic sau khi nhóm thống nhất. Index hiện có dùng chung promise readiness. Không thêm health API, signal handler cho Next, hoặc đóng client theo request. Không đóng pool của module khác.

Audit event gồm register/login success/failure, rate_limited, csrf_rejected, session_revoked. Sink mặc định ghi console.info JSON chỉ scope/event/timestamp chuẩn hóa; không serialize user/request/error hoặc credential. Sink lỗi được cô lập.

Production cần chốt audit access/retention và nơi thu thập. Đề xuất quyền đọc tối thiểu cho người vận hành được phân công, mã hóa nơi lưu, thời hạn có hạn mức và xóa tự động; thời hạn cụ thể cần nhóm duyệt. Không tạo kho log/telemetry ngoài hệ thống.

HTTPS guard giữ HTTP loopback để chạy sau reverse proxy TLS termination; bind public trực tiếp bắt buộc cert+key. Không suy ra tin cậy từ forwarded headers, không thay topology.

## B. Kiểm thử

| Nhóm | Kết quả |
| --- | --- |
| Backend Unit/config/DTO/facade/audit | 47/47 |
| Backend Mongo Integration | 52/52 |
| Frontend Authentication/events/mock/bookmark | 43/43 |
| HTTPS policy | 12/12 |
| Browser Real | Đạt: 6 API thật, multi-tab logout/đổi user/profile, Provider result, pending failure, HTML response, expiry/network, Guest/mobile và IndexedDB |
| Browser Mock/Disabled | Đạt desktop/mobile/keyboard, cancel/replay/error/retry, A/B, scene và IndexedDB |
| TypeScript | API và web đạt |
| Build | API Next và web Vite đạt; cảnh báo chunk >500KB có sẵn |
| Unit toàn workspace | 181 đạt / 1 lỗi có sẵn tại tests/ritual.unit.test.ts:21: Tương đồng vừa khác Tương đồng trung bình; không sửa ngoài phạm vi |
| Lint | Chưa có script, không tự cài toolchain |

Các test dùng Mongo replica/DB tên ngẫu nhiên và browser context riêng. Thành công FR12 gọi Backend thật; chỉ dữ liệu tìm kiếm công khai hoặc response lỗi được fixture. Probe Provider chỉ thuộc harness, không import vào entry production; bundle không chứa probe/credential/module mock.

Đã gặp EBUSY/file-sharing error từ node_modules trong OneDrive ở một số lần test/build. Backend tests chạy tuần tự; build Next bị lỗi khóa file đã chạy lại riêng sau khi dừng server thử nghiệm. Không reinstall dependency, đổi bundler hoặc bỏ qua lỗi.

## C. Chạy kiểm tra tổng hợp

Từ root `jsts`:

```powershell
node scripts/fr12/check.mjs
node scripts/fr12/check.mjs --build --browser
```

Mặc định chạy Backend Unit, Mongo Integration, Frontend/HTTPS. --build thêm TypeScript/build hai app; --browser thêm HTTPS harness. --browser không --build yêu cầu API build hiện hành. Certificate thử nghiệm/Edge/Mongo xem REAL_AUTH.md của frontend; certificate bypass chỉ trong browser test context.

Runner loại MONGODB_URI/IDENTITY_* kế thừa khỏi child-process checks; integration/harness cấp cấu hình riêng. Không đổi env file. Không coi `pnpm test` là đã chạy Backend Identity/browser. Mock/disabled harness vẫn chạy như PROTECTED_BOOKMARKS.md với Vite riêng 5174/5175; server thử nghiệm đã được dừng.

## D. File tạo/sửa trong 7.3

Trong `apps/api/src/modules/identity/`:

- Tạo: application/identity.models.ts; ports/audit.ts; infrastructure/identity.audit.ts; tests/identity.audit.test.ts; STAGE_7_3.md.
- Sửa: application/identity.service.ts, application/session.service.ts; presentation/identity.controller.ts, presentation/identity.dto.ts; ports/user.repository.ts, ports/session.repository.ts; infrastructure/mongo-identity.repository.ts; identity.module.ts, identity.bootstrap.ts, identity.config.ts, .env.example, README.md.
- Sửa tests: authentication.fixtures.ts, identity.authentication.test.ts, identity.config.test.ts, identity.service.test.ts.

Trong `apps/web/src/features/auth/`:

- Tạo: services/auth-events.ts; tests/auth-probe.tsx (harness only).
- Sửa: services/real-auth-client.ts, context/AuthProvider.tsx, types/auth.types.ts, README.md.

Ở root:

- Tạo: scripts/fr12/check.mjs, scripts/fr12/https-policy.mjs; tests/auth-events.unit.test.ts, tests/fr12-https.unit.test.ts.
- Sửa: scripts/serve-production.mjs; tests/real-auth.unit.test.ts, tests/real-auth.browser.mjs.

Không sửa App.tsx/main.tsx, FR14, scene hoặc storage.ts trong 7.3. SHA-256 create-book-scene.ts, MagicBook.tsx, storage.ts trước/sau không đổi. Browser xác minh IndexedDB legacy còn nguyên. Những thay đổi cũ đang có trong Git status được giữ nguyên; không thêm dependency/commit/push/merge.

## E. Kết luận

FR12 đáp ứng Route → Bootstrap/Module → Controller → Service → Repository. Các luồng demo đã kiểm đạt. Có thể đề nghị nghiệm thu kỹ thuật 7.4 trên môi trường cô lập với ngoại lệ S01/S03/S02; không tự chạy 7.4 hoặc demo production.

Nhóm cần quyết định receipt cũ/rollout, trusted ingress/ngưỡng rate limit, enumeration contract, audit retention/access và TLS deployment. Chưa đánh giá tải production, Safari/Firefox hoặc account-disabled ngoài contract hiện có. FR14 vẫn thiếu Backend/mapping và ngoài phạm vi. Không chuẩn bị tài liệu thuyết trình.
