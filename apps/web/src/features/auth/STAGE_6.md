# Giai đoạn 6 — FR12 và ranh giới tích hợp FR14

## Trạng thái bàn giao

FR12 đã chạy thử với Backend Next.js và MongoDB replica thử nghiệm cô lập. **Chưa thể hoàn tất luồng lưu bookmark vào tài khoản thật:** checkout không có module Personal Library/FR14 hoặc Route Handler bookmark; `Paper` chưa có mapping sang Document UUID. Không triển khai Backend thay thành viên FR14, không thay schema, không giả API thành công và không tự đồng bộ IndexedDB.

Nguồn đối chiếu: mã `apps/api/app/api/v4/`, `apps/api/src/modules/identity/`, DTO/validation và tài liệu nhóm đã gửi, giải nén tại `.local/fr12-reference-2026-11-13/docs/design/{software-api.openapi.json,resource-api-matrix.md}` cùng baseline 27. OpenAPI tự ghi các endpoint bookmark là **thiết kế đích, chưa triển khai route runtime**. Việc có tên endpoint trong thiết kế không chứng minh đã chạy được.

## Đối chiếu API

| Method /api/v4/... | Contract / thực tế |
| --- | --- |
| POST users | DTO email/password/displayName; 201 User, không tạo phiên. Đã kiểm thực tế. |
| POST sessions | DTO email/password; 200 session và HttpOnly cookie. Đã kiểm đúng/sai thông tin. |
| GET sessions/current | 200 user hoặc anonymous cùng CSRF; đã kiểm reload và phiên hết hạn. |
| DELETE sessions/current | 204, thu hồi phiên; đã kiểm logout và lỗi mạng không được báo thành công. |
| GET users/me | 200 User + ETag hoặc 401; đã kiểm cả sau logout. |
| PATCH users/me | displayName only, CSRF/Origin, UUID key, If-Match; đã kiểm cập nhật và TopNav. |
| GET users/me/bookmarks | Thiết kế: cookie bắt buộc, 200 BookmarkPage, limit 1..200 (mặc định 20), opaque cursor. Runtime hiện trả 404 trang lỗi. |
| PUT users/me/bookmarks/{documentId} | Thiết kế: UUID documentId, body `{saved:true}`, UUID Idempotency-Key, CSRF/Origin, If-None-Match:* khi tạo hoặc If-Match khi sửa; 200 Bookmark. Chưa có handler. Probe không kèm precondition trả 404. |
| DELETE users/me/bookmarks/{documentId} | Thiết kế: UUID documentId, UUID Idempotency-Key, CSRF/Origin và If-Match bắt buộc; 204. Chưa có handler; probe trả 404. |

FR14 thiết kế Bookmark gồm id/documentId UUID, saved:true, revision>=1, updatedAt date-time. BookmarkPage gồm items và nextCursor. Lỗi thiết kế liên quan gồm 401, 403, 404, 409, 410, 412, 422, 428, 429, 503; chưa xác nhận được runtime error code/policy FR14. Không coi 404 trang Next là phản hồi JSON 404 tài liệu không tồn tại. Với If-None-Match:* trên đường dẫn vắng mặt, Next cũng có thể xử lý điều kiện cache trước và trả 304; đây không phải bằng chứng handler FR14 hoạt động.

Các probe được thực hiện bằng HTTP client **của test**, với/không có phiên thử nghiệm, trên database mới tách biệt. Probe chỉ kiểm tra đường dẫn vắng mặt, không phải kiểm thử contract đầy đủ. Frontend sản phẩm không gửi FR14 request khi tính năng chưa sẵn sàng.

## Những phần frontend đã hoàn thiện

- Tái sử dụng hook `useProtectedBookmarks`, AuthModal và BookmarkClient hiện có; không tạo feature/client trùng hoặc fetch trong UI.
- Thêm trạng thái thư viện loading, guest, ready, unavailable, error. Lỗi đọc/ghi không được biểu diễn thành “lưu thành công” hoặc thư viện đã đọc nhưng trống; chỉ cập nhật saved sau client xác nhận. Lỗi vẫn cho phép thử lại.
- SavedPage phân biệt thư viện demo, Guest, lỗi kiểm tra phiên và tài khoản thật đang chờ FR14. Xóa lời nhắc “đăng nhập demo” sai đối với tài khoản thật; không tuyên bố đã đồng bộ.
- Pending intent được kiểm tra mounted/AbortSignal/phiên hiện tại trước khi xử lý, kể cả trước thông báo chưa hỗ trợ. Login callback tiêu thụ intent đúng một lần; không thêm effect replay theo authenticated state.
- Thông báo auth không chặn nút điều hướng bên dưới trên mobile; nút đóng thông báo vẫn nhận tương tác chuột/bàn phím. Không đổi bố cục Khám phá hoặc Glassmorphism của form/modal.

Guest nhấn Lưu không gọi Bookmark API mà mở AuthModal. Đóng modal hủy intent. Sai mật khẩu giữ modal và không lưu. Đăng ký thật không có session nên hủy pending, không tự lưu. Đăng nhập thành công xác minh cookie qua FR12; callback hợp lệ hiện báo FR14 chưa khả dụng, giữ trạng thái chưa lưu. Khi có Backend/mapping chính thức, adapter thật mới được phép thực hiện PUT rồi xác nhận saved.

## Dữ liệu, phiên và quyền

`Paper.id` hiện là arXiv hoặc `oa:W...`, theo `packages/core/src/contracts.ts`. Không dùng mã này làm Document UUID, không tự sinh UUID hoặc dùng Mongo _id. Interface `ResolveDocumentId` đã có nhưng chưa có nguồn mapping có thẩm quyền. Chiều ngược documentId → Paper/metadata cho SavedPage cũng cần được bàn giao; không được bỏ âm thầm các tài liệu ngoài corpus hiện tại.

Bookmark demo vẫn trong memory theo user, không cấp quyền Backend. Tài khoản thật không đọc kho demo và không gọi client mock. Khi logout/đổi phiên, hook hủy write cũ, ẩn ngay snapshot không còn đúng phiên rồi xóa state; không chuyển dữ liệu A sang B. Kho demo giữ dữ liệu theo tài khoản trong phiên demo đúng hành vi Giai đoạn 4; không phải cache tài khoản Backend.

IndexedDB `paper-magic-v1/bookmarks` được giữ nguyên; không migrate, import hoặc gán cho user mới. Cookie HttpOnly do Backend quản lý, CSRF trong memory; không lưu mật khẩu/token vào localStorage/sessionStorage/IndexedDB. Session hết hạn được phát hiện qua refresh/focus/timer, chuyển Guest, xóa danh tính và pending; lỗi mạng là error, không giả định đã logout thành công. Chi tiết cookie/proxy tại REAL_AUTH.md.

## File tạo/sửa trong Giai đoạn 6

- `apps/web/src/features/auth/types/bookmark.types.ts`: kiểu trạng thái và thông báo chưa hỗ trợ dùng chung.
- `apps/web/src/features/auth/context/useProtectedBookmarks.ts`: trạng thái đọc/ghi, lỗi, chống thông báo từ intent cũ; giữ ranh giới real/mock.
- `apps/web/src/App.tsx`: chỉ truyền status/message từ hook sang SavedPage.
- `apps/web/src/components/layout/SavedPage.tsx`: nội dung đúng với trạng thái và nguồn bookmark.
- `apps/web/src/features/auth/styles/auth.css`: sửa thông báo auth chặn nút bên dưới.
- `tests/real-auth.browser.mjs`: bổ sung probe FR14, hủy pending, bấm lặp không lưu giả, nội dung thư viện real ở 1440/390/320px và profile 401 sau logout.
- `tests/protected-bookmarks.browser.mjs`: thêm lỗi client demo, kiểm saved không tăng, trạng thái lỗi và retry phục hồi.
- Tạo tài liệu này, thêm liên kết từ README auth.

Không sửa Backend FR12/FR14, schema, dependency, storage.ts hoặc source scene. Các file của giai đoạn trước đang có thay đổi chưa commit trong checkout được giữ nguyên.

## Kiểm thử và giới hạn nghiệm thu

Lệnh và điều kiện chạy HTTPS harness: REAL_AUTH.md. Các test dùng database Mongo mới tên ngẫu nhiên và browser context riêng; không dùng DB/tài khoản production. Public search được fixture để cô lập; FR12 gọi Backend thật, FR14 chỉ probe sự vắng mặt. Không log cookie/token/password.

```powershell
pnpm.cmd --filter @paper-galaxy/web typecheck
pnpm.cmd --filter @paper-galaxy/web build
pnpm.cmd test
node tests/real-auth.browser.mjs
# Với Vite mock 5174 và disabled 5175 như PROTECTED_BOOKMARKS.md:
$env:AUTH_DISABLED_TEST_URL='http://127.0.0.1:5175'
node tests/protected-bookmarks.browser.mjs
```

Đã kiểm được FR12, Guest/public search/filter, cancel/sai login/không auto-login sau đăng ký, double-click/StrictMode không replay, đổi tài khoản trong demo, lỗi client demo và retry, expiry/network/logout, keyboard/focus/Escape, desktop/mobile, canvas/context/cast/selection/query/filter và dữ liệu IndexedDB. Không thể nghiệm thu lưu/đọc/xóa bookmark thật, session hết hạn giữa request FR14, lỗi API FR14 hoặc phân quyền bookmark A/B/401 khi FR14 chưa có runtime. Kiểm thử lỗi client demo không thay thế kiểm thử HTTP/persistence/authorization thật.

Để tiếp tục, người phụ trách FR14 cần bàn giao ba handler chạy được, DTO/error JSON/ETag/pagination/idempotency/CSRF runtime, môi trường thử nghiệm và nguồn mapping Paper↔Document. Sau đó mới nối adapter thật và chạy đủ vòng đăng nhập → PUT → GET → DELETE → logout → FR14 401, cộng kiểm A/B và race. Không tự chọn cơ chế migrate local; cần thống nhất riêng với FR14.

Kết quả ngày 2026-11-14: TypeScript web và production build đạt; build còn cảnh báo chunk >500KB có sẵn, dự án chưa có script lint. Bộ unit toàn workspace: 148 đạt, 1 lỗi có sẵn ở `tests/ritual.unit.test.ts:21` (mong đợi `Tương đồng vừa`, nhận `Tương đồng trung bình`), giữ nguyên vì ngoài phạm vi. HTTPS browser harness đạt các kiểm tra FR12 và trạng thái chưa hỗ trợ FR14 trên 1440/390/320px. Mock/disabled harness đạt hồi quy desktop/mobile/keyboard cùng lỗi client và retry. Bundle production không chứa credential/module mock. Đối chiếu SHA-256 trước/sau xác nhận toàn bộ file trong `apps/api/src`, `apps/api/app`, cùng create-book-scene.ts, MagicBook.tsx và storage.ts không đổi.
