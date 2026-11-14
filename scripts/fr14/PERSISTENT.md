# FR12 / FR14 — MongoDB development lưu bền vững

Trang Swagger UI của 9 API FR12/FR14: **https://localhost:5444/api-docs**. Launcher persistent tự bật `PM_API_DOCS=1` cho Backend. Xem hướng dẫn Try it out trong [API docs README](../../apps/api/src/api-docs/README.md); thao tác ghi thay đổi database development thật, Bookmark vẫn chờ Document/mapping.

## Trạng thái bàn giao

**A — Dữ liệu thật:** FR12 sử dụng MongoDB 8.0.16 với WiredTiger trên đĩa, Argon2id, opaque session cookie, CSRF/Origin và repository hiện có. Sáu API không đổi. Kiểm thử `tests/persistent-auth.browser.mjs` tạo tài khoản QA thật trong database development, cập nhật hồ sơ, dừng và khởi động lại **mongod + Next + Vite + HTTPS**, xác nhận cùng user/revision/ETag/session; đăng xuất, restart lần nữa và kiểm chứng cookie cũ bị thu hồi; đăng nhập lại và chuyển sang tài khoản B. Không xóa tài khoản QA sau kiểm thử, không lưu mật khẩu QA. Tài khoản tự đăng ký trên giao diện cũng được lưu trong cùng database này.

**B — Fixture độc lập:** bộ kiểm thử FR14 hiện có dùng Mongo replica riêng và DocumentAccess fixture trong test. Bao gồm revision, replay/idempotency, transaction rollback, owner isolation, quyền Document, cursor và thu hồi session. Đây không phải bằng chứng bookmark với Document thật đã hoạt động.

**C — Còn chặn:** checkout hiện tại chỉ có Paper corpus với ID nguồn, chưa có Document Module FR20, adapter kiểm quyền Document chính thức và mapping Paper.id ↔ Document UUID. Backend FR14 đã dùng cùng cấu hình Mongo persistent, nhưng ba API trả 503 `BOOKMARK_DEPENDENCY_UNAVAILABLE` sau xác thực; Guest nhận 401. Không tạo Document hoặc UUID giả, không ghi bookmark bypass quyền. Chưa thể xác minh bookmark thật tồn tại qua restart hoặc A/B bookmark end-to-end. Cần nhóm cung cấp DocumentAccess + mapping chính thức rồi nối vào bootstrap/backend và real bookmark client/frontend hiện có.

## Kiểm tra máy và phân tách dữ liệu

Không tìm thấy Mongo Windows service hay `mongod`, `mongosh`, `mongodump` trong PATH. Binary thật đã có tại `.local/fr12-test-mongodb-binaries/mongod-x64-win32-8.0.16.exe`; launcher chạy trực tiếp binary này, **không dùng MongoMemoryServer**, không cài hoặc sửa Windows service. Nếu checkout mới thiếu binary, cài MongoDB Community 8.0 theo hướng dẫn nhà phát hành và cung cấp đúng binary đã kiểm chứng tại đường dẫn trên; không trỏ vào dbPath của một service có sẵn. Các test FR12 hiện có cũng tải binary 8.0.16 vào cache này.

| Thành phần | Giá trị |
| --- | --- |
| Database development | `paper_magic_development` |
| Replica set một node | `pmDevelopment` |
| Mongo | `127.0.0.1:27114` |
| dbPath | `%LOCALAPPDATA%\PaperMagic\fr12-fr14-development\db` |
| Nhật ký Mongo | `%LOCALAPPDATA%\PaperMagic\fr12-fr14-development\mongod.log` |
| Marker nhận diện thư mục | `%LOCALAPPDATA%\PaperMagic\fr12-fr14-development\paper-magic-owner.json` |
| Stable identity secret, certificate/key, trạng thái | `.local/fr14-persistent/` (được Git ignore) |
| Backend Next | `127.0.0.1:3342` |
| Frontend Vite | `127.0.0.1:5177` |
| HTTPS giao diện | **https://localhost:5444** |

Data nằm ngoài OneDrive để tránh đồng bộ/khóa file WiredTiger. Launcher kiểm tra marker, port và đường dẫn Mongo thực tế trước khi ghi. Không nhận URI tùy ý, không kết nối production, không chiếm cổng hay kill tiến trình của người khác. Không có reset/drop/delete collection. Nếu toàn bộ database mới hoàn toàn trống, launcher nhập corpus Paper/embedding công khai từ dữ liệu hiện có trong một transaction; không tạo Document. Database đã có collection thì được giữ nguyên, không seed lại hoặc cập nhật corpus. Nếu thiếu corpus trong database có sẵn, ứng dụng dừng readiness để người quản lý xử lý, không tự sửa dữ liệu.

Mongo này chỉ phục vụ development trên máy cá nhân: bind loopback và chưa bật Mongo database authentication, nên các tiến trình khác trên cùng máy vẫn có thể kết nối. Không mở port, không dùng máy chia sẻ không tin cậy hay production. Mật khẩu tài khoản **Paper Magic** vẫn chỉ lưu bằng Argon2id; token session chỉ lưu hash. Không có tài khoản ứng dụng mặc định.

## Chạy và dừng (PowerShell tại thư mục `jsts`)

Lần đầu hoặc sau khi thay code backend:

```powershell
pnpm.cmd build
node scripts/fr14/persistent.mjs
```

Một lệnh launcher trên khởi động Mongo, Backend Next, Frontend Vite và proxy HTTPS với cấu hình thống nhất. Mở **https://localhost:5444**, tự đăng ký tài khoản rồi đăng nhập. `5443` vẫn là demo **tạm** cũ; hai hệ thống dùng port/database riêng và không tự chuyển dữ liệu cho nhau. Tài khoản đã tạo trong demo tạm không tự có ở database mới. Có thể dừng riêng demo tạm bằng lệnh cũ `node scripts/fr14/demo.mjs --stop` nếu không cần dùng nữa.

Để dừng stack persistent, chạy trong terminal thứ hai:

```powershell
node scripts/fr14/persistent.mjs --stop
```

Đợi terminal chạy chính kết thúc rồi chạy lại `node scripts/fr14/persistent.mjs`. Mongo nhận lệnh shutdown sạch, không bị xóa thư mục dữ liệu. Tắt/mở máy cũng không xóa dữ liệu; launcher không phải Windows service nên cần chạy lại sau khi mở máy. Session tối đa 24 giờ, có thể hết hạn hoặc bị thu hồi theo chính sách; tồn tại tài khoản không có nghĩa cookie phải hợp lệ mãi.

Chỉ chạy Mongo (không Next/Vite/proxy):

```powershell
node scripts/fr14/persistent.mjs --mongo-only
```

Dừng bằng cùng `--stop`, đợi kết thúc trước khi chạy stack đầy đủ. Nếu cần chạy Backend/Frontend bằng terminal riêng, dùng cấu hình môi trường đã được quản lý an toàn như phần dưới và các script hiện có `pnpm.cmd --filter @paper-galaxy/api start` / `pnpm.cmd --filter @paper-galaxy/web dev`; các script mặc định dùng port 3001/5173, cần proxy HTTPS và cấu hình Origin/target tương ứng. Không chạy song song các script này với launcher rồi giả định chúng dùng cùng config. Cách đã kiểm thử trên máy là launcher đồng bộ ở 3342/5177/5444.

Nếu bị tắt cưỡng bức, `running.lock` có thể còn. Kiểm tra toàn bộ cổng 27114/3342/5177/5444 đã trống và mongod tương ứng đã dừng trước khi **chỉ** gỡ file `.local/fr14-persistent/running.lock`; giữ toàn bộ config, data và marker. Launcher không tự xóa khóa hoặc kill PID dựa vào file state cũ. Nếu thiếu `config.json` trong khi dbPath đã có dữ liệu, launcher dừng để yêu cầu khôi phục secret, không tự sinh secret thay thế.

## HTTPS và cấu hình

Launcher tạo certificate localhost riêng trong `.local/fr14-persistent/`, có SAN localhost/127.0.0.1 và hạn một năm, bằng OpenSSL đi kèm Git for Windows. Có thể chỉ định đường dẫn executable qua **tên biến** `PM_DEV_OPENSSL`. Không cài certificate vào Windows trust store và không tắt xác minh TLS toàn hệ thống. Trình duyệt có thể cảnh báo chứng chỉ tự ký như demo cũ; chỉ chấp nhận chứng chỉ local của chính môi trường này. Khi hết hạn, dừng stack, lưu certificate/key cũ vào backup và tạo cặp mới cho localhost; giữ nguyên `config.json` để không đổi identity secret.

Các **tên** biến backend launcher cung cấp (giá trị secret không được in):

- `NODE_ENV`, `MONGODB_URI`, `IDENTITY_MONGODB_DB`, `IDENTITY_SECRET`.
- `IDENTITY_ALLOWED_ORIGINS`, `IDENTITY_SESSION_TTL_SECONDS`, `IDENTITY_SESSION_SAME_SITE`.
- `IDENTITY_AUTH_WINDOW_SECONDS`, `IDENTITY_AUTH_MAX_ATTEMPTS`, `IDENTITY_AUTH_MAX_CONCURRENT`.
- `IDENTITY_REGISTRATION_RECEIPT_TTL_SECONDS`, `BOOKMARK_RECEIPT_TTL_SECONDS`, `BOOKMARK_CURSOR_TTL_SECONDS`.
- Frontend: `VITE_AUTH_MODE`, `API_PROXY_TARGET`; `NEXT_TELEMETRY_DISABLED` cho tiến trình Next.

Secret được sinh một lần, dùng lại qua restart, chỉ truyền cho Backend. Không truyền `IDENTITY_SECRET`/URI chứa credentials vào biến `VITE_*`. Launcher loại bỏ cấu hình auth/URI thừa kế để không vô tình dùng database nhóm hoặc mock. `NODE_ENV=production` ở Next chỉ để chạy bản build; môi trường dữ liệu này vẫn là **development**, không phải bản triển khai production.

Cookie vẫn `__Host-pm_session`, Secure, HttpOnly, Path=/, SameSite=Lax. Không nới Origin/CSRF, không đổi contract, không bật mock fallback. Giữ nguyên giao diện, scene và Bookmark IndexedDB; không nhập bookmark local vào account. Giữ kín file config và private key, không gửi kèm log/ảnh chụp hoặc commit vào Git.

## Sao lưu và chuyển Atlas

**Cold backup đã dừng Mongo:** chạy `--stop`, đợi mongod dừng hoàn toàn. Sao chép **toàn bộ** `%LOCALAPPDATA%\PaperMagic\fr12-fr14-development` vào thư mục backup mới; sao lưu thêm `.local/fr14-persistent/config.json` và certificate/key vào nơi riêng tư, cùng thời điểm. Không sao chép riêng vài file WiredTiger hoặc sao chép dbPath đang chạy. Giữ bản cũ, không ghi đè bản duy nhất. Khôi phục toàn bộ bộ dữ liệu/marker và secret tương ứng khi stack đã dừng, bằng Mongo cùng version; thử trên bản copy trước. Công cụ MongoDB Database Tools (`mongodump`/`mongorestore`) chưa có trên máy; có thể cài riêng để backup logic sau, không dùng `--drop` trên database đang sử dụng.

**Atlas sau này:** launcher này cố ý chỉ local; không thêm URI Atlas vào nó để bỏ qua chốt an toàn. Chuẩn bị deployment/config riêng với replica set Atlas, Mongo user quyền tối thiểu trên database development riêng và network access phù hợp. Dùng cùng tên biến FR12/FR14 kể trên; `MONGODB_URI` và `IDENTITY_MONGODB_DB` phải cùng database, giữ secret ổn định, Origin trùng HTTPS frontend. Backend hiện có đã hỗ trợ `mongodb+srv`; không sửa contract hoặc đưa URI vào frontend. Nhập dữ liệu bằng backup/restore theo kế hoạch nhóm, không chạy script `scripts/seed.mjs` trên database có dữ liệu vì script legacy có thao tác xóa corpus ngoài danh sách. Atlas cũng không thay thế Document Module/mapping/ACL còn thiếu.

## Kiểm thử

```powershell
# Khi stack persistent đang dừng; sẽ thêm tài khoản QA thật, giữ lại dữ liệu.
node tests/persistent-auth.browser.mjs
# Replica test riêng, không xóa development database.
node scripts/fr14/check.mjs
pnpm.cmd typecheck
pnpm.cmd build
```

193 regression tests FR12/FR14 đạt (47 backend unit + 52 identity Mongo + 56 frontend auth/policy + 21 bookmark backend + 17 bookmark transport). Kiểm thử browser persistent đạt trên máy Windows/Edge, bao gồm hai lần full restart. TypeScript và build đạt; Vite còn cảnh báo chunk lớn có sẵn. Repository không có script lint nên không tuyên bố lint đã chạy. Browser test chỉ bỏ kiểm tra chứng chỉ ở context kiểm thử localhost; không thay đổi browser người dùng hay chính sách TLS ứng dụng.

File mới trong lần triển khai này: `scripts/fr14/persistent.mjs`, `scripts/fr14/PERSISTENT.md`, `tests/persistent-auth.browser.mjs`. Không sửa Backend nghiệp vụ, Frontend, FR20, schema chung, scene, IndexedDB hoặc API contract; không commit/push/merge. Các thay đổi có sẵn trong working tree được giữ nguyên.
