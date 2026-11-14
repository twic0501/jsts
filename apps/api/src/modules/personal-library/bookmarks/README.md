# FR14 Bookmark — implementation và dependency gate

## Trạng thái thực tế

Đã triển khai module Bookmark, 3 Next Route Handlers, Mongo transaction/CAS/receipt/cursor và frontend real adapter. **Chưa thể nghiệm thu luồng full-stack lưu bài thật**, vì checkout không có Document Service/Repository, ACL public/private/shared hoặc mapping Paper.id ↔ Document UUID chính thức.

Không tự tạo Document hoặc UUID dựa trên arXiv/OpenAlex để vượt blocker. Bootstrap dùng Document dependency fail-closed; frontend dùng unavailableMapping. Unit transport và integration với Document fixture không phải bằng chứng rằng Document Backend thật đã hoạt động.

FR12 7.3 được giữ nguyên ở Backend, tái sử dụng `getIdentityModule().authorization`. Các phụ thuộc còn lại của FR12: receipt HMAC cũ chưa migrate, trusted ingress/rate thresholds chưa chốt, enumeration vẫn 409 đúng contract; xem Identity/STAGE_7_3.md.

## A. Implementation

```text
Next Route Handlers /api/v4/users/me/bookmarks[/{documentId}]
  → bookmark.bootstrap.ts → bookmark.module.ts
  → BookmarkController → BookmarkService
  → FR12 authorization + DocumentAccess port
  → BookmarkRepository → MongoBookmarkRepository
```

Controller giữ HTTP/Origin/query/body/precondition; Service lấy principal qua FR12, kiểm Document access và điều phối; Repository thực hiện truy vấn/transaction. Không query DB trong Controller, không copy kiểm tra session, không tin owner/userId từ client.

Collection riêng FR14:

- `personal_bookmarks`: UUID `_id`, ownerId, documentId, saved, revision, updatedAt. Unique index `(ownerId, documentId)`; không sửa Document/Identity schema.
- `personal_bookmark_receipts`: key hash theo owner/key, fingerprint theo owner/method/path/precondition/payload, kết quả và expiresAt; TTL index. Không chứa password, cookie hoặc session token.
- DELETE giữ tombstone saved=false và tăng revision. Tạo lại tăng revision tiếp, tránh ABA với ETag cũ. Tombstone không đi vào DTO saved:true.
- State và receipt commit trong cùng Mongo transaction; cần replica set/sharded deployment. Retry cùng key trả kết quả cũ; key đổi method/path/precondition trả 409. Distinct-key create cạnh tranh chỉ một request tạo được; request còn lại nhận 412.
- Cursor được mã hóa AES-GCM, bind owner/limit/version/sort và TTL. Không lộ ID bị lọc bằng cách decode base64. List lọc quyền hiện tại, quét tối đa 1000 record/lượt; có thể trả trang rỗng kèm cursor khi cần tiếp tục lọc.

### Document dependency và mapping

`ports/document-access.ts` phải được adapter của Document module chính thức triển khai: readiness và readable(userId, documentId), bao gồm private/shared/deleted policy. Không bật bằng env hoặc cho phép mọi tài liệu để demo.

Paper schema hiện chỉ có ID arXiv hoặc `oa:W...`; API v1 không cung cấp canonical UUID. Không có mapping chính thức trong dữ liệu hiện hành. Frontend `DocumentMapping` yêu cầu readiness và hai chiều; không có fallback sinh UUID. Reverse mapping thiếu sẽ trả lỗi thay vì âm thầm bỏ record.

Để bật đầy đủ, cần bàn giao Document adapter, nguồn mapping ổn định/có thẩm quyền và metadata Paper cho SavedPage. Tài liệu ngoài corpus đang tải cần cơ chế hydrate metadata đã kiểm chứng; không chỉ trả source ID rồi bỏ khỏi UI. Contract endpoint lookup/Document projection cần nhóm thống nhất, không tự thêm API ngoài OpenAPI.

## B. API

Contract đối chiếu với tài liệu nhóm tại `.local/fr12-reference-2026-11-13/docs/design/{software-api.openapi.json,resource-api-matrix.md,resource-api.registry.json}`.

| Endpoint | Success khi đủ dependency | Runtime hiện tại |
| --- | --- | --- |
| GET `/api/v4/users/me/bookmarks` | 200 `{items,nextCursor}`, limit 1..200 (default 20), opaque cursor | Guest 401; session hợp lệ + query hợp lệ 503 do Document/mapping chưa sẵn sàng |
| PUT `.../bookmarks/{documentId}` | 200 Bookmark + strong ETag; body đúng `{saved:true}` | Guest 401; request hợp lệ đã auth 503, không tạo state |
| DELETE `.../bookmarks/{documentId}` | 204; không xóa Document | Guest 401; request hợp lệ đã auth 503, không tạo state |

PUT/DELETE cần UUID documentId và Idempotency-Key, Origin/CSRF theo FR12. PUT tạo dùng If-None-Match:*, update dùng If-Match; DELETE cần If-Match. Thiếu precondition 428; sai schema/UUID/header 422; conflict key 409; stale revision 412; missing/forbidden Document cùng 404; cursor hết hạn 410. Body DELETE thực sự rỗng được chấp nhận kể cả Next cung cấp stream không-null; mọi nội dung gửi kèm bị từ chối. Response cá nhân và lỗi đều private, no-store; không trả ownerId hoặc stack trace.

6 API FR12 vẫn hoạt động và đã chạy lại qua Next/HTTPS. Không thay status/code của contract FR12. Frontend dùng credentials:include, không gửi userId để quyết định owner; CSRF lấy qua phương thức bổ sung `AuthClient.getMutationHeaders(expectedUserId)` sau kiểm tra session mới.

## C. Frontend và kiểm thử

Canonical feature: `apps/web/src/features/bookmarks/{services,hooks,types}`. Các entry bookmark cũ dưới auth chỉ re-export tương thích; không có hai implementation riêng. Mock adapter chỉ dùng khi DEV opt-in mock, không gọi Backend. Real mode không fallback sang mock.

Real adapter kiểm status/Content-Type/DTO/ETag, map lỗi an toàn, timeout 15 giây, deduplicate write theo paper/account; giữ key/precondition khi kết quả request chưa rõ. Cache/pending chỉ trong memory và reset khi logout/đổi user; phản hồi cũ không được khôi phục cache. Load list cũ không đè revision cache của write mới. Không cập nhật saved trước xác nhận Backend.

Hook giữ pending một lần, không replay qua effect; Guest/cancel/login sai không gửi Bookmark API. Real register không tạo session hoặc tự lưu. API 401 yêu cầu Provider refresh; source/mapping thiếu được hiển thị trung thực. IndexedDB legacy không đọc để gán cho account, không migrate, không xóa.

Các test đã chạy gồm:

- FR14 Backend: 10 unit DTO/policy/cursor, 11 integration Mongo + **FR12 thật**, Document port là fixture rõ ràng. Bao phủ owner A/B, same-document, key/body/precondition, race, ABA, expiry/logout, ACL denial, pagination/tamper/expiry, CSRF/Origin, rollback receipt và missing dependency.
- Frontend: 17 real-bookmark adapter unit tests dùng response tổng hợp; không coi là Backend integration. Bao phủ mapping, payload không owner, retry cùng key, duplicate clicks, 401/403/409/412/429/503, schema/HTML, timeout, reset và stale list.
- FR12 regression: 47 Backend unit, 52 Mongo integration; frontend auth/bookmark/transport policy có thêm test bridge CSRF. Browser real kiểm đủ 6 API FR12 và 3 route FR14 401/503; browser mock/disabled kiểm pending/scene/mobile/IndexedDB.
- TypeScript/build API và web được chạy; có cảnh báo chunk lớn có sẵn. Lint chưa có script. Unit toàn workspace còn lỗi nhãn độ tương đồng ngoài phạm vi (xem báo cáo cuối lượt).

```powershell
node scripts/fr14/check.mjs --browser
# Chỉ build khi không có demo Next đang phục vụ cùng .next:
node scripts/fr14/check.mjs --build --browser
```

Không tuyên bố PUT/GET/DELETE bookmark full-stack thành công với Document chính thức. Chưa kiểm được ACL/visibility transaction của Document implementation thật, quyền thay đổi giữa lúc kiểm và commit, metadata hydrate, tải production hoặc mapping sau reload với nguồn thật. Test Mongo dùng Document fixture không thay thế các kiểm tra đó.

## D. Demo Windows cô lập

```powershell
pnpm.cmd --filter @paper-galaxy/api build
pnpm.cmd --filter @paper-galaxy/web build
node scripts/fr14/demo.mjs
# Ở terminal khác:
node tests/fr14-demo.browser.mjs
# Dừng sạch đúng demo do script tạo:
node scripts/fr14/demo.mjs --stop
```

URL: **https://localhost:5443**. Next start tại 127.0.0.1:3341, Vite dev tại 127.0.0.1:5176. Helper gọi CLI Next/Vite cùng ứng dụng đang có, chỉ đổi port; không tạo server framework thứ hai. HTTPS proxy local giữ Origin, Set-Cookie và cookie Secure/HttpOnly. Dùng cửa sổ riêng để tránh trộn phiên local.

Demo dùng MongoMemoryReplSet thật, DB `fr14_demo_<uuid>` mới hoàn toàn và secret sinh trong memory. Chỉ seed corpus Paper/embedding công khai hiện có qua script seed cũ sau xác nhận DB mới rỗng; **không seed Document hoặc mapping**. Không dùng MONGODB_URI production; không preseed tài khoản. User tự đăng ký tài khoản thử; dữ liệu demo mất khi dừng. State file `.local/fr14-demo/state.json` chỉ chứa port/PID/tên DB/status, không chứa secret hay credential.

Helper tự cấp child-process config: MONGODB_URI, IDENTITY_MONGODB_DB, IDENTITY_SECRET, IDENTITY_ALLOWED_ORIGINS=`https://localhost:5443`, TTL/SameSite/rate-limit/receipt của FR12; BOOKMARK_RECEIPT_TTL_SECONDS=3600, BOOKMARK_CURSOR_TTL_SECONDS=600; VITE_AUTH_MODE=real và API_PROXY_TARGET=`http://127.0.0.1:3341`. Không ghi env thật của dự án. Secret phải giữ server-side; không đặt vào VITE_*.

Điều kiện: API build, binary Mongo thử nghiệm đã có/tải được, Edge cho browser test và certificate local tại `.local/fr12-browser-tls/{key,cert}.pem`. Certificate này chỉ phục vụ local; browser test dùng ignoreHTTPSErrors trong context QA, không sửa TLS validation của sản phẩm. Nếu cần tạo certificate với OpenSSL đã cài:

```powershell
New-Item -ItemType Directory -Force .local/fr12-browser-tls
& 'C:/Program Files/Git/usr/bin/openssl.exe' req -x509 -newkey rsa:2048 -nodes -keyout .local/fr12-browser-tls/key.pem -out .local/fr12-browser-tls/cert.pem -days 2 -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1'
```

Thao tác thủ công: mở URL → tìm public paper → chọn Lưu → đăng ký/login → thấy tài khoản thật nhưng save bị chặn với lý do Document/mapping → SavedPage hiển thị chưa sẵn sàng → reload giữ phiên → logout về Guest. **Đây là demo kiểm chứng availability và fail-closed, không phải demo lưu bookmark full-stack đã hoàn tất.**

Browser demo kiểm public search thật (không fixture), 6 FR12 APIs, 3 FR14 APIs fail-closed, cookie/reload/logout và scene; tạo QA account chỉ trong DB tạm, không in password/token. Không chạy đồng thời nhiều browser/model-heavy checks để tránh timeout do tải CPU local.

## E. File và blocker

Tạo Backend trong module này: bookmark.bootstrap.ts, bookmark.module.ts; domain/bookmark.entity.ts, domain/bookmark.policy.ts; application/bookmark.service.ts, application/bookmark.cursor.ts; ports/bookmark.repository.ts, ports/document-access.ts; infrastructure/mongo-bookmark.repository.ts; presentation/bookmark.controller.ts, presentation/bookmark.dto.ts; tests/vitest.config.ts, tests/bookmark.unit.test.ts, tests/bookmark.integration.test.ts; README này. Tạo routes tại `apps/api/app/api/v4/users/me/bookmarks/route.ts` và `apps/api/app/api/v4/users/me/bookmarks/[documentId]/route.ts`.

Frontend mới: `features/bookmarks/types/bookmark.types.ts`, `hooks/useBookmarks.ts`, `services/bookmark-client.ts`, `services/real-bookmark-client.ts`, `services/mock-bookmark-client.ts`, README.md. Mock/hook chuyển từ auth, không có hai implementation hoạt động. Entry cũ `auth/types/bookmark.types.ts`, `auth/services/bookmark-client.ts`, `auth/services/mock-bookmark-client.ts`, `auth/context/useProtectedBookmarks.ts` giữ compatibility re-export. Sửa tích hợp tại `auth/types/auth.types.ts`, `auth/services/real-auth-client.ts`, `auth/context/AuthProvider.tsx` và `components/layout/SavedPage.tsx`. Không sửa App.tsx, Three.js hoặc storage.ts.

Tests/scripts: real-bookmarks.unit.test.ts, fr14-demo.browser.mjs, scripts/fr14/check.mjs, scripts/fr14/demo.mjs; cập nhật real-auth.unit.test.ts, bookmarks.unit.test.ts và real-auth.browser.mjs cho route tồn tại nhưng dependency chưa đủ.

Blocker bắt buộc: adapter Document/ACL thật; mapping hai chiều + metadata có thẩm quyền; xác minh cross-module quyền đồng thời và cấu hình production. Không tự migration Document/Identity/local bookmarks, không thêm dependency, không commit/push/merge. Không chuẩn bị tài liệu thuyết trình.

### Kết quả bàn giao ngày 2026-11-14

Runner `node scripts/fr14/check.mjs --browser` đạt: FR12 Backend 47 unit + 52 Mongo integration; FR14 10 unit + 11 Mongo integration; frontend 56 auth/bookmark/HTTPS cũ + 17 real-bookmark transport = 73 test. Browser Real/multi-tab và Mock/Disabled/mobile đạt. Demo availability đang chạy tại URL trên; `node tests/fr14-demo.browser.mjs` đạt với public search không fixture, 6 FR12 APIs và 3 FR14 APIs 503/401 đúng dependency gate. **Không có test full-stack save thành công với Document thật.**

API/web TypeScript và build đạt. `pnpm test` toàn workspace: 199 đạt, 1 lỗi nhãn có sẵn tại tests/ritual.unit.test.ts:21; không sửa scene/test ngoài phạm vi. Không có script lint. Production bundle không chứa credential/module mock hoặc test probe. Hash toàn Identity Backend, toàn scene và storage.ts trước/sau không đổi.

Đã sửa lỗi DELETE empty stream phát hiện qua Next runtime, không bỏ body validation. Một lượt browser auth trong lúc chạy model/checks song song vượt timeout; chạy lại riêng và runner tuần tự đều đạt. Cần kiểm tải riêng trước production. Dữ liệu demo chỉ nằm ở replica tạm; secret không ghi ra state file hoặc báo cáo.
