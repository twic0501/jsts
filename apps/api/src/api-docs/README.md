# Swagger UI — FR12 / FR14

Mở **https://localhost:5444/api-docs** khi stack persistent đang chạy. JSON OpenAPI: `/api-docs/openapi.json`.

```powershell
# Tại thư mục jsts
node scripts/fr14/persistent.mjs
```

Trang hiện mô tả **9 thao tác FR12/FR14**, chưa phải danh sách toàn bộ API công khai legacy hay các FR khác. Spec FR12 tái sử dụng schema/metadata contract trong `identity/contracts/fr12.reference.json`, điều chỉnh header theo Controller thực tế. FR14 mô tả contract hiện có và đánh dấu rõ dependency Document còn thiếu. OpenAPI 3.0.3 được dùng để tương thích resolver Swagger trên trình duyệt đã kiểm thử.

## Cách thử

1. Bấm dòng API → **Try it out**.
2. Đăng ký: `POST /api/v4/users`, nhập email của bạn, password 12–256 ký tự và displayName. Không gửi confirmPassword. Header `Idempotency-Key` được điền UUID ban đầu; dùng key mới khi đổi nội dung, giữ key/body/precondition cũ khi retry. Đây là đăng ký thật vào database development, chưa có OTP email và chưa tự đăng nhập.
3. Đăng nhập: `POST /api/v4/sessions`, nhập email/password vừa tạo → **Execute**. Trình duyệt nhận cookie HttpOnly, không cần nhập vào nút Authorize hay nhập Bearer token. Nếu đã đăng nhập từ website cùng origin, Swagger dùng chung phiên đó.
4. Đọc phiên bằng `GET /api/v4/sessions/current`, đọc hồ sơ bằng `GET /api/v4/users/me`. Guest có user=null khi đọc phiên.
5. Đổi tên: `PATCH /api/v4/users/me`, nhập strong ETag lấy từ response GET hồ sơ vào `If-Match` (gồm dấu ngoặc kép, ví dụ `"1"`), body chỉ có displayName. Dùng Idempotency-Key riêng cho mỗi thao tác mới.
6. Đăng xuất: `DELETE /api/v4/sessions/current` → Execute. Thao tác này đăng xuất cả trang khám phá đang dùng cùng cookie.

Các thao tác ghi tự lấy CSRF mới từ `GET sessions/current` trước request. Origin do trình duyệt gửi, Backend vẫn kiểm tra bình thường. Nếu không lấy được CSRF, trang ngăn request ghi và báo lỗi. Không thay đổi AuthProvider, API contract, session policy, role hay repository. Các response có thể chứa dữ liệu cá nhân/CSRF; không chia sẻ ảnh response hay dùng tài khoản production.

**Bookmark:** GET/PUT/DELETE hiện vẫn fail-closed với `BOOKMARK_DEPENDENCY_UNAVAILABLE` (503) sau xác thực; Guest nhận 401. Không có mapping/Document chính thức nên đừng điền UUID ngẫu nhiên để kỳ vọng lưu thành công. Mongo persistent không thay thế Document/ACL còn thiếu.

## Triển khai

- Dùng `swagger-ui-dist` 5.34.1 tại Backend; asset CSS/JS phục vụ nội bộ, không dùng CDN. Script telemetry Scarf của dependency được tắt trong workspace policy.
- `PM_API_DOCS=1` bật trang cho bản build Next; launcher persistent tự đặt biến này. `next dev` bật mặc định, `PM_API_DOCS=0` tắt trong development. Production mặc định trả 404 cho HTML, spec và asset; chỉ bật khi chủ động cấu hình, không tự công khai trong deployment khác.
- Không gửi spec đến validator bên ngoài; không cho URL cấu hình từ query string; request interceptor chỉ cho cùng origin, chỉ thử ghi `/api/v4/`. CSP chỉ cho script/connect cùng origin. Cookie do trình duyệt quản lý, không lưu credentials vào localStorage/sessionStorage.
- Asset route chỉ nhận ba tên cho phép; không dùng tên file từ URL để đọc đường dẫn tùy ý. Next được chạy với cwd `apps/api` như script hiện có và launcher; cần package `swagger-ui-dist` trong runtime node_modules. Chưa cấu hình deployment standalone.
- Trang này đi qua proxy `/api` hiện có của Vite vì `/api-docs` cùng prefix, không sửa scene, React UI hoặc IndexedDB.
- Tham khảo cấu hình chính thức: [Swagger UI configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/).

## Kiểm tra

```powershell
node node_modules/vitest/vitest.mjs run tests/api-docs.unit.test.ts
# Stack persistent phải đang chạy; test thêm một tài khoản QA thật, giữ dữ liệu.
node tests/api-docs.browser.mjs
```

Unit kiểm tra default-off production, opt-in, explicit disable, CSP và asset allowlist. Browser kiểm tra 9 API, chỉ request nội bộ, đăng ký, đăng nhập sai/đúng, cookie, hồ sơ, bookmark báo đúng dependency, logout với CSRF và render ở 390px. Credentials QA ở RAM, không lưu hoặc ghi log. Không dùng mock để tuyên bố thành công.
