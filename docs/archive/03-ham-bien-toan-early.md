# 03 — Hàm, giá trị và ý nghĩa biến

> Cập nhật bản 0.2.0: đã có E5 384D, cosine, PCA3D và bàn phù phép. Xem [thiết kế đang triển khai](05-semantic-basic.md) và [kết quả kiểm chứng](verification.md). Các phần ghi bản đầu/TF-IDF bên dưới là lịch sử mốc 0.1.

Đây là danh mục bản cơ bản; danh mục hoàn thiện được kiểm lại theo mã và cập nhật khi thêm hàm. Số 104 trong hồ sơ cũ là kế hoạch toàn dự án, không phải số hàm hiện đã viết.

## Hợp đồng toán `packages/core/src/math.ts`

| Hàm | Input → output | Quy tắc |
|---|---|---|
| Complex.constructor | re, im → Complex | Hai phần của số phức, đều hữu hạn |
| Complex.rotate | angle → Complex | Radian; nhân với cos(angle) + i sin(angle) |
| rotatePoint3D | point, angles → Point3 | Quay X → Y → Z, trục tay phải |
| orbitPosition | radius,yaw,pitch,center → Point3 | Camera quay quanh tâm bằng số phức |
| damp | current,target,lambda,dt → number | alpha = 1-exp(-lambda*dt), không phụ thuộc FPS |
| zoomRadius | radius,delta → number | Bán kính giới hạn 4..14 |
| stepAngle | angle,speed,dt → number | Góc tăng speed*dt, gói về 0..2π |

`z' = z * (cos θ + i sin θ)`. Quanh X ghép y+iz; quanh Y ghép z+ix; quanh Z ghép x+iy. Không coi một số phức đơn lẻ là đủ cho mọi điểm 3D.

## Biến và giá trị scene

| Biến | Đơn vị / khoảng | Ý nghĩa và lý do |
|---|---|---|
| dt | giây, clamp 0..0.05 | Thời gian từ frame trước; tránh nhảy lớn sau đổi tab |
| yaw / pitch | radian | Góc camera ngang / dọc; pitch tránh đỉnh cực |
| radius | 4..14 scene units | Khoảng cách camera; giá trị nhỏ là zoom gần |
| elapsed | giây mô phỏng | Dừng khi pause; không dùng giờ hệ thống để nhảy chuyển động |
| open | 0..1 | Mức mở sách; chuyển theo damp |
| recall | 0..1 | Ký tự chuyển từ quỹ đạo về trang sách |
| selectedId | string hoặc null | null nghĩa đã biết chưa chọn bài nào |
| dragStart | Point hoặc undefined | undefined nghĩa chưa có lần kéo đang hoạt động |
| lambda | >=0, 3..7 dùng cho scene | Tốc độ hội tụ; lớn hơn thì tiến gần đích nhanh hơn |
| glyphCount | 114 | Hữu hạn để giảm GPU / nhãn chồng nhau |

Chọn bài làm thay đổi target open/recall/radius. Các glyph lấy quỹ đạo cố định theo chỉ số và sin/cos theo elapsed; dùng complex rotation để quay vị trí. Thu hồi nội suy vị trí ngoài vào trang. Sách được tạo từ box, plane, spine; không tải GLB hay animation preset. Thông tin dùng texture canvas chữ sinh tại máy, không ảnh tải ngoài.

## Tìm kiếm `packages/core/src/search.ts`

| Hàm | Việc làm |
|---|---|
| normalizeText | Bỏ dấu để so từ Việt/Anh; không thay abstract lưu gốc |
| tokenize | Tách từ, bỏ stopword |
| expandQuery | Bổ sung từ theo bảng Việt/Anh cố định, không gọi LLM |
| SearchIndex.constructor | Tính TF-IDF, chuẩn hóa vector từ corpus |
| SearchIndex.search | Validate → filter → cosine → sắp score / ID → topK |
| SearchIndex.neighbors | Tìm bài gần từ tiêu đề, loại chính bài đang chọn |

`idf = ln((N+1)/(df+1))+1`. `score` là độ tương đồng từ khóa 0..1; không phải xác suất đúng hoặc embedding AI. Không hiển thị score thành “AI chính xác xx%”.

## Quy tắc null / undefined

- `null`: giá trị không có đã được xác định, như chưa chọn bài hoặc corpus chưa tải xong ở state có status riêng.
- `undefined`: tham số tùy chọn chưa truyền, như không lọc năm. Omit trong JSON, không serialize field undefined.
- Danh sách rỗng dùng `[]`. Paper không có trả 404. Lỗi dùng error/status, không dùng null thay thông báo lỗi.
- Bật strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess. Không ép unknown sang type để né validation.
