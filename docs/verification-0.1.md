# Kết quả kiểm chứng bản 0.1.0

Ngày: **04/11/2026**. Dự án đặt tại **C:\Users\TrngTrn\paper-magic** theo yêu cầu lưu trong thư mục người dùng. Sau khi chuyển, đã build lại, chạy lại 42/42 unit và 7/7 E2E đạt tại vị trí mới. Đây là kết quả bản cơ bản, không phải toàn bộ đặc tả cuối kỳ.

| Kiểm tra đã chạy | Kết quả |
|---|---|
| `pnpm typecheck` | Đạt cả core, web, api |
| `pnpm test` | **42/42 unit test đạt**, 2 file |
| `pnpm build` | Build Vite frontend và Next.js backend đạt |
| `pnpm test:e2e` trên bản production | **7/7 luồng đạt**, Microsoft Edge/Chromium headless |
| GET health thực tế | HTTP200, storage=mongodb, 30 bài, searchMethod=tfidf |
| Seed MongoDB thật | 30 bài được upsert vào MongoDB 8.0.16 local |
| Reload offline toàn mạng | Có service worker; reload rồi tìm U-Net, đọc kết quả vẫn được |
| Chặn riêng API | Tự tìm với corpus cục bộ và hiện đúng nguồn |
| Mobile 390×844 | Không tràn ngang; danh mục đóng/mở hoạt động |
| Kiểm tra giao diện | Đã xem ảnh idle, chọn U-Net, mobile trong `.local/screenshots` |

## 7 luồng browser/API

1. API: health/corpus/search, schema, không `_id`, input sai, JSON hỏng, ID không có, body quá lớn.
2. Tìm U-Net → chọn → canvas mở đúng ID → đọc abstract → lưu → reload → thấy trong kệ.
3. Zoom làm radius nhỏ đi; kéo đổi yaw; pause cập nhật; reset về góc chuẩn.
4. Lọc chuyên ngành; query không có; khôi phục toàn thư viện.
5. Mất API vẫn tìm bằng dữ liệu trên máy.
6. Mobile không tràn và điều hướng lĩnh vực hoạt động.
7. Bản build đã cài: tắt mạng, reload, tìm và hiện kết quả.

## Phép đo khởi đầu

30 request HTTP tuần tự với 30 bài, sau 3 lượt warmup, qua Vite proxy và Next.js; index TF-IDF đã có trong tiến trình, nguồn corpus MongoDB.

- p50: **4,61 ms**, p95: **6,23 ms**, p99: **6,69 ms**.
- JSON response lớn nhất trong phép đo: **34.820 byte**, khoảng **34,0 KiB** (decoded).
- Raw samples: `.local/performance.json`.

Đây **không phải** benchmark 20.000 bài / 20 người đồng thời, không gồm embedding hoặc render. Chưa có kết luận FPS thực tế hoặc ngân sách GPU/RSS đạt. Không dùng số đo này để nhận đã hoàn thành toàn bộ performance test.

## Lỗi phát hiện và sửa

- Vite 8 dùng manualChunks dạng hàm: đã chỉnh cấu hình và typecheck/build lại.
- Đường import CSS data URL không cần thiết: bỏ, giao diện tải thành công.
- Offline reload: Vite preview thêm `Vary: Origin`, trong khi request precache và module có Origin khác nhau. Cache chỉ tài nguyên tĩnh cùng origin, dùng `ignoreVary: true` cho các file tĩnh đã đóng gói. Chạy lại offline test đạt.
- Test JSON hỏng: Playwright tự serialize chuỗi theo Content-Type; đổi fixture sang byte buffer để gửi thật JSON hỏng, API trả400.
- Kiểm title với nguồn đã phát hiện diễn giải sai cho SqueezeNet/Datasheets: sửa summary biên tập, seed và build lại; abstract gốc không bị sửa.

## Giới hạn hiện tại

- Corpus khởi đầu 30 bài; chưa đủ 5.000–20.000.
- Tìm TF-IDF + bảng từ Việt/Anh; chưa embedding model hoặc trợ lý LLM, chưa có runtime prompt inference log vì chưa inference.
- Bookmark lưu trong IndexedDB ở trình duyệt hiện tại; chưa sync tài khoản.
- Chưa auth/RBAC, admin import, HTTPS443, mã hóa log riêng tư hoặc backup/restore nghiệm thu đầy đủ.
- MongoDB local profile loopback cho phát triển, chưa có auth/TLS; không public các cổng. Phải hoàn thiện profile bảo mật trước triển khai mạng.
- Build có cảnh báo chunk Three.js **543,86 kB** trước gzip; được lazy-load, gzip **133,40 kB**. Chưa tối ưu cho thiết bị yếu.
- Review trong phiên này là tự kiểm; chưa có người thứ hai review độc lập.

## Phiên bản đã chạy

Node 24.22.1; pnpm 11.25.0; TypeScript 5.9.3; React 19.3.1; Vite 8.3.5; Next.js 16.4.5; Three.js 0.187.0; MongoDB driver 7.8.0; MongoDB binary 8.0.16; Vitest 5.1.0; Playwright 1.64.1. Package version cụ thể khóa trong pnpm-lock.yaml.
