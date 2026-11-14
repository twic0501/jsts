# Bookmark feature

Types, real/mock adapter và hook bookmark thuộc feature này. Entry bookmark cũ dưới auth chỉ re-export để giữ tương thích.

Real authentication tự chọn real bookmark adapter; không có flag cho phép mock bookmark với real session. Adapter mặc định dùng unavailableMapping vì dữ liệu hiện tại chưa có Document UUID/ACL/mapping chính thức. Không tự sinh UUID từ Paper.id hoặc nhập IndexedDB vào tài khoản.

Chi tiết API, dependency gate, tests và demo Windows: [FR14 README](../../../../api/src/modules/personal-library/bookmarks/README.md).
