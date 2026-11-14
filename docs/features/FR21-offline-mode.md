# FR21 — Offline Mode

## 1. Tổng quan

FR21 cho phép người dùng lưu các bài báo khoa học trên thiết bị
và truy cập lại khi không có kết nối Internet.

Mục tiêu là hỗ trợ:
- Lưu một hoặc nhiều bài báo để đọc offline.
- Quản lý danh sách bài đã lưu.
- Tìm kiếm cục bộ trong các bài đã lưu.
- Sử dụng giao diện ứng dụng khi mất kết nối mạng.

## 2. Công nghệ

- React + TypeScript: giao diện người dùng.
- IndexedDB: lưu dữ liệu bài báo trên trình duyệt.
- Service Worker: lưu tài nguyên ứng dụng để hỗ trợ offline.
- Local Embedding Model: hỗ trợ xử lý truy vấn ngữ nghĩa trên máy.
- Semantic Search: tìm kiếm bằng vector khi dữ liệu phù hợp.
- Keyword Fallback: tìm kiếm từ khóa khi không sử dụng được model.

## 3. Luồng hoạt động

### 3.1. Online

1. Người dùng truy cập Paper Galaxy.
2. Tìm kiếm bài báo trong thư viện.
3. Mở bảng "Lưu để đọc offline".
4. Chọn một hoặc nhiều bài báo.
5. Lưu các bài đã chọn vào IndexedDB.

### 3.2. Offline

1. Người dùng chuyển sang chế độ Offline hoặc mất kết nối mạng.
2. Ứng dụng đọc danh sách bài đã lưu từ IndexedDB.
3. Người dùng nhập truy vấn tìm kiếm.
4. Hệ thống chỉ tìm kiếm trong những bài đã lưu.
5. Hiển thị các kết quả phù hợp.

## 4. Kiến trúc lưu trữ

### IndexedDB: paper-galaxy-offline

Lưu bộ dữ liệu nền và semantic snapshot phục vụ hoạt động offline.

### IndexedDB: paper-galaxy-saved-papers

Lưu các bài báo mà người dùng chủ động chọn tải về.

Mỗi bản ghi có các thông tin chính:

- id
- paper
- savedAt
- vector (nếu có)

## 5. Các thành phần mã nguồn

| File | Chức năng |
|------|-----------|
| apps/web/src/offline/papers-store.ts | Lưu, đọc, xóa bài báo offline |
| apps/web/src/offline/search-saved.ts | Tìm kiếm trong các bài đã lưu |
| apps/web/src/offline/OfflinePaperPicker.tsx | Giao diện quản lý bài offline |
| apps/web/src/offline/store.ts | Lưu trữ bộ dữ liệu offline nền |
| apps/web/src/offline/readiness.ts | Kiểm tra khả năng hoạt động offline |
| apps/web/src/offline/registerServiceWorker.ts | Đăng ký Service Worker |
| apps/web/public/sw.js | Cache tài nguyên ứng dụng |
| apps/web/src/App.tsx | Điều phối dữ liệu và chế độ tìm kiếm |

## 6. Giới hạn hiện tại

- Bản lưu bài báo gồm metadata và abstract; chưa tự tải PDF toàn văn.
- Semantic Search phụ thuộc vào vector và model khả dụng.
- Các bài chưa có vector có thể sử dụng Keyword Fallback.
- Việc đồng bộ đầy đủ bài đã lưu với bản đồ 2D/3D cần tiếp tục kiểm thử.
- Chưa hoàn tất kiểm thử nghiệm thu cho mọi trường hợp mất mạng.

## 7. Kiểm thử

Các trường hợp cần kiểm tra:

| ID | Trường hợp | Kết quả mong đợi |
|----|------------|------------------|
| TC01 | Online, lưu 1 bài | IndexedDB chứa bài vừa lưu |
| TC02 | Online, lưu nhiều bài | Lưu đúng số bài đã chọn |
| TC03 | Offline, tìm bài đã lưu | Trả về kết quả phù hợp |
| TC04 | Offline, tìm bài chưa lưu | Không trả về bài chưa lưu |
| TC05 | Offline, chưa lưu bài nào | Hiển thị danh sách rỗng |
| TC06 | Xóa bài đã lưu | Bài bị loại khỏi tìm kiếm offline |
| TC07 | Khởi động lại trình duyệt | Dữ liệu đã lưu vẫn tồn tại |
| TC08 | Model không khả dụng | Chuyển sang tìm kiếm từ khóa |
| TC09 | Chuyển Offline/Online | Nguồn tìm kiếm thay đổi đúng |
| TC10 | Chuyển 2D/3D | Chỉ hiển thị bài được phép |

## 8. Hướng phát triển

- Hoàn thiện kiểm thử tìm kiếm offline.
- Đồng bộ bản đồ 2D/3D với danh sách bài đã lưu.
- Hỗ trợ lưu PDF toàn văn.
- Quản lý dung lượng lưu trữ.
- Hỗ trợ cập nhật dữ liệu đã tải.

## 9. Trạng thái

FR21 đã triển khai các thành phần chính nhưng chưa hoàn tất
toàn bộ kiểm thử tích hợp và nghiệm thu.
