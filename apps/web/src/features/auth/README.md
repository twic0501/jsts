# Giao diện tài khoản FR12

Giao diện sử dụng cookie và các route FR12 cùng origin. Đăng ký tạo tài khoản và yêu cầu đăng nhập riêng. AuthProvider lấy phiên khi mở ứng dụng, kiểm lại khi tab được kích hoạt và làm mới phiên khi nhận sự kiện từ tab cùng hồ sơ. FR17 dùng tài khoản từ phiên hiện tại, và giữ bản chờ riêng theo tài khoản.

Mã giao diện được tích hợp từ ref `origin/feature/fr12-fr14-swagger`. Xem [cấu hình backend](../../../../api/src/modules/identity/.env.example) và [luồng tích hợp FR17](../../../../api/lib/reading-states/README.md).
