# Paper Magic 0.3 — giao diện kính và cuốn sách phù phép

Tài liệu lịch sử0.3. Bản0.4 chuyển toàn web thành cảnh3D, hợp nhất bản đồ với sách và tăng trang/kiểu đọc; xem docs/07-immersive-library.md. Giá trị trong tài liệu này giữ theo mốc0.3.

## Bạn sẽ thấy gì?

Giao diện lấy cảm hứng từ kính trong: nền sáng có các vùng màu dịu, viền sáng, các khối mờ nhìn xuyên và bo góc. Đây là giao diện web tự xây, không phải bộ giao diện của Apple. Sách nằm ở vùng lớn bên trái, danh sách bài bên phải; điện thoại xếp sách trước và thư viện bên dưới.

1. Ban đầu sách bay nhẹ trên bàn, hai nửa bìa mở rộng rồi thu hẹp một chút theo nhịp sin.
2. Nhập câu hỏi và nhấn **Tìm trong sách**. Các ký tự xoáy nhanh, co bán kính và hút vào gáy sách.
3. Sách khép. Nếu AI chưa trả kết quả, giữ sách đóng để đợi. Không tự tạo kết quả giả cho khớp hiệu ứng.
4. Có kết quả: camera tiến gần, sách mở. Bài đứng đầu tự xuất hiện trên hai mặt giấy.
5. **Trang sau / Trang trước** lật trang giấy 3D. Trang đầu là tiêu đề, tác giả và ghi chú tiếng Việt; các trang sau là abstract gốc được chia đủ, không cắt bỏ phần cuối. **Bài tiếp theo** chuyển sang kết quả tiếp theo trong danh sách đang lọc.
6. **Thoát** hoặc Escape: sách đóng, camera lùi, sách mở và tiếp tục bay. Escape cũng hủy việc tự mở khi đang đợi một truy vấn.

Kéo để xoay; nút +/− hoặc cuộn để zoom. Phím ←/→ lật trang khi không nhập văn bản. Tạm dừng dừng thời gian hiệu ứng. Chọn một bài hoặc tìm mới tiếp tục chuyển động. Chế độ giảm chuyển động của hệ điều hành bỏ chuỗi xoáy/zoom nhưng giữ tìm, đọc, lật và thoát.

## Hình ảnh và chuyển động được tạo như thế nào?

**Mã do nhóm viết là JS/TS. Không Python; không ảnh, video hoặc mô hình 3D tải sẵn.** Three.js là bộ vẽ WebGL, không tự quyết định quỹ đạo. Không viết shader GLSL riêng, không GSAP, không OrbitControls.

| Phần | Cách tạo |
|---|---|
| Bàn, sách, gáy, bìa, góc kim loại | Box/plane/cylinder với kích thước và tọa độ trong TypeScript |
| Chữ, giấy, viền giấy | Canvas 2D: font hệ thống, fillText, đường thẳng và gradient; CanvasTexture là ảnh bộ nhớ tự sinh, không phải file ảnh tải ngoài |
| Dải sáng nền | 4 dải mesh, mỗi dải 362 đỉnh. Tọa độ thay đổi theo sin/cos; các đỉnh nối thành tam giác |
| Quầng sáng | Gradient tròn tự vẽ vào Canvas, xoay mặt về camera; vị trí và độ sáng theo sin |
| Bụi sao | 420 điểm có tọa độ xác định từ chỉ số; chuyển động chậm theo thời gian |
| Ký tự | 144 sprite, dùng lại 19 texture chữ; mỗi ký tự liên kết một ID bài báo, không phải 144 bài mới |
| Vòng tròn dưới bàn | Điểm trên đường tròn từ phép quay số phức |
| Giấy lật | Một mặt giấy chia 24 đoạn ngang; biến đổi từng đỉnh quanh gáy và thêm độ cong bằng sin |
| Kính giao diện | CSS blur, gradient và viền. Đây là hiệu ứng giao diện, không tham gia điểm tìm kiếm |

Các công thức chính, với `t` tính bằng giây:

- Bay: `y = 0.095 sin(0.9t) + 0.025 sin(1.7t)`; giảm dần khi vào chế độ đọc.
- Nhịp mở lúc chờ: `angle = 0.72 + 0.055 sin(1.25t)` radian mỗi nửa; hai bên có dấu đối xứng.
- Quay số phức: `(x + iz) × (cos θ + i sin θ)` cho tọa độ quỹ đạo.
- Xoáy: `θ = gócBanĐầu + tốcĐộ × t + swirl² × (16 + 0.018i)`; bán kính `r = rBanĐầu × (1 − 0.98 absorb)`.
- Nội suy: `smooth(p) = p²(3 − 2p)`, chặn p trong [0,1], để vào/ra mềm. Camera dùng `damp` với thời gian từng frame.
- Lật: góc tiến từ 0 đến π; phần cong `0.18 sin(πx/1.46) sin(πp)`. Dùng số phức quay cặp tọa độ ngang/cao quanh gáy.

`i` là chỉ số ký tự, không phải đơn vị ảo trong công thức xoáy. Đơn vị ảo chỉ dùng trong lớp `Complex`.

## Thứ tự hiệu ứng và giá trị gán

| Trạng thái | Thời gian | Ý nghĩa |
|---|---:|---|
| idle | Không giới hạn | Bay, nhịp mở, ký tự quay nhẹ |
| vortex | 1.15 s | Tăng tốc xoáy và hút chữ |
| closing | 0.50 s | Khép sách đến 1.54 rad mỗi nửa |
| waiting | Đến khi có kết quả | Đóng sách, chờ dữ liệu thật |
| zooming | 0.65 s | Camera đến gần |
| opening | 0.70 s | Mở đến 0.10 rad mỗi nửa |
| reading | Đến thao tác tiếp theo | Đọc nội dung trên giấy |
| turning | 0.65 s | Uốn và lật một lá giấy, sau đó đổi cặp trang |
| exit-closing | 0.45 s | Đóng từ đúng góc hiện tại |
| exit-zoom | 0.60 s | Camera lùi từ đúng mức zoom hiện tại |
| exit-opening | 0.65 s | Mở lại và trả các ký tự ra quỹ đạo |

Tổng vào sách khoảng 3 giây nếu dữ liệu sẵn; thời gian chờ AI cộng thêm. Khi thiết bị chậm, dt hiệu ứng bị chặn tối đa 0.05 s/frame để tránh nhảy hình; thời gian quan sát thực tế có thể dài hơn.

Camera chờ: radius10, yaw1.23 rad, pitch0.43 rad. Đọc mặc định radius4.7 trên màn hình rộng, 7.1 khi canvas có tỷ lệ rộng/cao <0.8; pitch0.99. Map radius8, pitch0.38. Các nút/drag vẫn điều chỉnh được góc và khoảng cách trong chế độ đọc. Pixel ratio tối đa1.6 để hạn chế tải GPU.

## Màu nói lên điều gì?

Điểm lấy từ **cosine của vector E5 384 chiều**, không lấy khoảng cách giữa các chữ trang trí. Các dải màu là quy ước hiển thị ban đầu, chưa được hiệu chuẩn với tập đánh giá chuyên gia:

| Điều kiện | Màu 3D | Nhãn |
|---|---|---|
| score ≥ 0.85 | #7cf5cd, xanh ngọc | Tương đồng cao |
| 0.75 ≤ score < 0.85 | #8bc9ff, xanh lam | Tương đồng vừa |
| score < 0.75 | #d1a4ff, tím | Tương đồng thấp hơn |
| Chưa có điểm | #c4b7ff | Trung tính |

Danh sách kết quả luôn ghi điểm so với **câu tìm**. Khi chưa chọn bài, ký tự/map dùng điểm câu tìm; khi có bài đang đọc, ký tự/map dùng điểm so với **bài đang đọc**. Các nút bài liên quan dưới góc đọc ghi điểm so với bài đang đọc. Khi đang đợi truy vấn mới, không dùng điểm truy vấn cũ để tô màu. Map chưa có điểm thì dùng màu chuyên ngành.

Cosine không phải xác suất, phần trăm đúng, chất lượng bài báo hoặc bằng chứng liên ngành. Những chữ bay chỉ minh họa kết nối; vị trí thật trong không gian vector nằm ở nút **Bản đồ vector 3D**. Ranking tiếp tục tính ở384D, PCA3D chỉ giúp nhìn.

## Module, hàm và dữ liệu

| File | Trách nhiệm và hàm chính |
|---|---|
| App.tsx | Tìm/ lọc/ lưu; `search(value)`, `selectPaper(paper)`, `chooseGroup(value)`, `bookmark(paper)`; giữ truy vấn mới nhất và tự mở kết quả đầu |
| scene/MagicBook.tsx | Gắn scene vào React; nút xem, lật, thoát, pause; đồng bộ props và cleanup |
| scene/ritual.ts | `smooth(value)`, `similarityTone(score)`; `BookRitual.start/resolve/close/turn/tick/sample` điều khiển thứ tự, không phụ thuộc DOM |
| scene/book-pages.ts | `wrapLines(text,width)`, `readingPages(paper)`, `createPageTexture(page,pageNumber)` chia nội dung và vẽ giấy |
| scene/atmosphere.ts | `createAtmosphere(scene)` trả `update(time,energy)` cho dải sáng, quầng sáng và bụi sao |
| scene/create-book-scene.ts | `createBookScene(...)` dựng hình; handle gồm select, startSearch, empty, turn, setScores, setPaused, zoom, reset, setMode, filter, setQuery, dispose |
| scene/enchanting-table.ts | `createEnchantingTable()` tạo các khối bàn nguyên gốc |

`castId` tăng mỗi lần nhấn tìm để cùng câu hỏi vẫn chạy lại hiệu ứng. `pendingOpen` là câu hỏi đang được phép tự mở; Escape hoặc chọn bài xóa quyền tự mở đó. `completedQuery` xác định kết quả thuộc câu hỏi nào. `spread` bắt đầu0, là chỉ số cặp trang; `pendingSpread` là cặp sẽ hiện sau khi lật xong. `phase` là bước hiện tại, `age` là số giây đã chạy trong bước. `ready` báo có dữ liệu. `swirl/absorb/zoom/flip` là tiến độ0..1, không phải điểm AI.

`null`: chủ động không chọn bài, chưa có điểm màu, không có query point. `undefined`: phần tùy chọn không được truyền hoặc tra cứu không có phần tử; kiểm tra trước khi dùng. Không biến undefined thành điểm0 vì điểm0 là một điểm cosine hợp lệ. API và DB không thay cấu trúc ở lần cập nhật này.

Số hàm và tham số thực tế sinh bằng `node scripts/document-code.mjs`, xem function-catalog.md và code-catalog.json. Đây là số hàm có tên trong mã hiện tại, không phải số contract của đặc tả toàn bộ. Mỗi module có README và log phát triển AI. Chỉ có prefix embedding query/passage trong runtime, không bổ sung chatbot hay prompt sinh nội dung giả.

## Kiểm chứng và giới hạn

Unit mới kiểm thứ tự chờ dữ liệu, hủy giữa chừng, thoát, tìm lại, khóa lật chồng, reduced motion, biên màu, thời gian lỗi và giữ đủ abstract khi chia trang. E2E mới kiểm tự mở kết quả, lật nội dung thật, thoát/tìm lại, đổi bài, tìm liên tiếp, Escape và giảm chuyển động. Xem verification.md cho kết quả thực chạy.

Các ảnh QA do Playwright chụp từ ứng dụng nằm ở .local/screenshots/liquid-*.png; không được dùng làm nền hoặc texture. Canvas chỉ là cách đọc trực quan; điện thoại có thể dùng góc đọc HTML hoặc toàn màn hình/phóng to để đọc chữ nhỏ.

API Next.js, MongoDB, model E5 local, worker và cơ chế offline giữ luồng đã có. Cài dependency/model/cache lần đầu cần mạng. Chưa triển khai HTTPS443, auth hay bộ dữ liệu5.000–20.000; phần này vẫn thuộc các mốc sau. Chưa đo FPS/GPU trên nhiều thiết bị, không tuyên bố hiệu suất60FPS.

0.3.0 là phiên bản minor của ứng dụng vì thêm khả năng đọc và lật trang, không đổi contract API/schema Mongo. Dependency và model revision không nâng trong đợt thiết kế này.
