# Giai đoạn 4: Guest Mode và Protected Bookmark demo

Guest vẫn tìm kiếm, lọc và đọc tài liệu công khai. Không mở AuthModal khi khởi động. Mọi nút Lưu đi qua `useProtectedBookmarks`; guest giữ ý định `{ paperId, action: 'save' }` trong memory và mở AuthModal với lời nhắc đăng nhập.

AuthProvider tiêu thụ callback chờ trước khi gọi nó, ngay trong luồng đăng nhập/đăng ký thành công. Không có effect theo dõi login để tự lưu. Đóng modal xóa callback và hủy request. Một adapter trả kết quả muộn sau khi hủy cũng không được xác nhận phiên hoặc tiếp tục lưu. Đăng nhập từ TopNav sau lần hủy không tiếp tục thao tác cũ. Chuyển Login/Register giữ nguyên ý định trong lần mở modal đó.

Kho demo là `Map<userId, Set<Paper.id>>`, chỉ trong bộ nhớ của module development. Không truy cập IndexedDB, localStorage, cookie hoặc Backend. Logout chỉ ẩn danh sách đang xem; đăng nhập lại cùng tài khoản trong trang hiện tại vẫn thấy bookmark của mình. Tải lại trang mất toàn bộ tài khoản đăng ký, phiên và bookmark demo. UI nhắc rõ giới hạn này. Không đồng bộ lên tài khoản thật.

`storage.ts` và object store IndexedDB `paper-magic-v1/bookmarks` không thay đổi. App không còn dùng danh sách legacy cho các nút bookmark hoặc thư viện demo. Dữ liệu cũ được giữ nguyên, không tự gán cho bất kỳ tài khoản nào; giai đoạn này chưa thêm giao diện riêng để xem/nhập lại dữ liệu legacy.

## Chống trùng và đổi tài khoản

- Khóa thao tác theo cặp `[userId, paperId]`; các nút cùng bài dùng chung trạng thái disabled/busy.
- Tiếp tục thao tác chờ bằng `save`, không dùng toggle. Kho dùng Set nên save/remove đều idempotent.
- Chỉ cập nhật dấu đã lưu khi client xác nhận ghi xong. Lỗi ghi không tạo dấu đã lưu giả.
- Mỗi snapshot gắn với đúng đối tượng session. Khi logout/đổi tài khoản, snapshot cũ bị ẩn ngay; các thao tác cũ bị hủy và phản hồi cũ không được cập nhật UI mới.
- Tải danh sách chỉ đọc; epoch ngăn phản hồi đọc cũ ghi đè kết quả vừa lưu. Các thay đổi đồng thời ở những bài khác nhau được hợp nhất bằng state updater.
- Danh sách ID truyền cho MagicBook được memo hóa để render do auth/bookmark không gọi lại bộ lọc scene. Không thay create-book-scene.ts, MagicBook, castId hay camera.

## Phạm vi file

Tạo:

- `context/useProtectedBookmarks.ts`: điểm chặn auth, callback save rõ ràng, khóa theo tài khoản/bài, quản lý snapshot và lỗi.
- `types/bookmark.types.ts`: interface BookmarkClient và ranh giới mapping documentId tương lai.
- `services/bookmark-client.ts`: chọn mock development hoặc client chưa khả dụng; production loại bỏ import mock.
- `services/mock-bookmark-client.ts`: kho memory tách theo userId, request bất đồng bộ và AbortSignal.
- `tests/bookmarks.unit.test.ts`, `tests/protected-bookmarks.browser.mjs` tại gốc dự án.
- Tài liệu này.

Sửa `context/AuthProvider.tsx`, `README.md`, cùng `App.tsx`, `ResultsPanel.tsx`, `PaperDossier.tsx`, `SavedPage.tsx` tại các điểm tích hợp bookmark/hiển thị nguồn dữ liệu. Không sửa main, TopNav, logic tìm kiếm, schema storage, scene hoặc Backend.

## Development và Backend tương lai

Bật như Giai đoạn 3: `apps/web/.env.development.local` chứa `VITE_AUTH_MODE=mock`, rồi khởi động lại Vite. Xóa biến hoặc đặt `disabled` để tắt; production luôn tắt mock. Khi chưa bật mock/chưa có adapter thật, đăng nhập và lưu tài khoản đều báo chưa khả dụng, không tự xác thực hoặc ghi IndexedDB legacy.

BookmarkClient dùng ID của ứng dụng để UI không phụ thuộc API. Hiện `Paper.id` là ID nguồn arXiv hoặc `oa:W...` theo `packages/core/src/contracts.ts`, chưa có documentId FR14 trong Paper. Không được gửi thẳng ID đó như documentId Backend. Adapter FR14 phải nhận mapping `ResolveDocumentId`, xử lý trường hợp chưa có mapping và ánh xạ cả chiều danh sách trả về.

Adapter thật sau này sẽ dùng GET/PUT/DELETE `/api/v4/users/me/bookmarks[/{documentId}]`, cookie/session và kiểm tra quyền phía Backend theo contract nhóm. `userId` trong mock chỉ chọn kho bộ nhớ; nó không cấp quyền API. Không tự fallback về mock khi API thật lỗi. Chưa triển khai bất kỳ endpoint FR12/FR14 nào.

## Kiểm tra

Từ thư mục gốc `jsts`:

```powershell
pnpm.cmd --filter @paper-galaxy/web typecheck
pnpm.cmd --filter @paper-galaxy/web build
pnpm.cmd exec vitest run tests/auth.unit.test.ts tests/bookmarks.unit.test.ts
```

Browser test dùng entry App thật với React StrictMode; chỉ dữ liệu tìm kiếm công khai được fixture. Mở Vite development với `VITE_AUTH_MODE=mock` trên port 5174, sau đó chạy:

```powershell
node tests/protected-bookmarks.browser.mjs
```

Đổi địa chỉ bằng `AUTH_TEST_URL`. Để kiểm tra cả chế độ tắt, mở Vite thứ hai trên port 5175 với `VITE_AUTH_MODE=disabled`, rồi đặt `$env:AUTH_DISABLED_TEST_URL='http://127.0.0.1:5175'` trước khi chạy browser test. Không chạy test này vào website production. Test tự dùng browser context riêng và seed một bookmark legacy trong context đó; không chạm profile trình duyệt đang dùng của bạn.

Phạm vi kiểm tra: Guest đọc/tìm/lọc; mở modal từ ResultsPanel/Dossier; hủy, lỗi, login và register tiếp tục đúng bài; bấm liên tục; bỏ lưu từ Dossier/SavedPage; đổi tài khoản; hủy write cũ khi logout; callback login trả muộn; reload; tách A/B; dữ liệu IndexedDB cũ còn nguyên; không gọi FR12/FR14; không log mật khẩu; canvas/WebGL context, castId, query, filter và lựa chọn giữ nguyên. Browser được kiểm ở 320/390/768/1440px, giao diện sáng/tối và reduced motion.

Kết quả bàn giao: 15/15 unit auth/bookmark đạt; toàn bộ các bước của browser script đạt, gồm server tắt mock. TypeScript web và build đạt. Build với `VITE_AUTH_MODE=mock` vẫn không chứa credential demo, chunk mock auth hoặc chunk mock bookmark. Bộ unit toàn workspace đạt 141/142, với lỗi nhãn có sẵn được mô tả bên dưới. SHA-256 của create-book-scene.ts, MagicBook.tsx và storage.ts không thay đổi trong giai đoạn này.

Giới hạn: kho memory không đồng bộ tab/thiết bị và mất khi reload; đây là UI demo, chưa phải bảo vệ dữ liệu bằng Backend. Kiểm thử browser dùng Edge/Chromium, chưa kiểm Safari/Firefox. Bộ unit chung còn lỗi có sẵn ở `tests/ritual.unit.test.ts` vì nhãn `Tương đồng vừa` khác `Tương đồng trung bình`; không chỉnh file scene/test ngoài phạm vi để xử lý lỗi này. Build còn cảnh báo chunk lớn; dự án chưa có script lint.
