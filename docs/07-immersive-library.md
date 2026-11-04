# 0.4 — toàn bộ web là một thư viện phép thuật

## Cách nhìn và sử dụng

Không còn khung sách nhỏ trong trang hay nút chuyển sang bản đồ. Một Canvas3D phủ toàn viewport. Thanh tìm kiếm, điều hướng và nút điều khiển là kính trong nổi trên nền đó. Nền nhiều màu gồm dải sáng tím/hồng/cyan/vàng, quầng sáng, bụi sao và ký tự. Tất cả hình học và chuyển động vẫn được sinh bằng JS/TS; giấy/chữ/quầng sáng tự vẽ bằng Canvas, không ảnh/video/GLB tải sẵn.

**Thư viện** mở bảng kính bên phải để lọc/chọn bài. **Góc đọc** mở văn bản HTML bên trái. Mặc định hai bảng đóng để thấy toàn bộ ngoại cảnh. Tìm hoặc chọn bài sẽ đóng bảng và mở sách; Escape đóng bảng và thoát đọc. Trên điện thoại các bảng mở thành một drawer phủ phần giữa màn hình.

Sách lúc chờ scale1.1, lúc đọc scale1.5. Mặt chữ tăng từ32 lên42px trên texture768px, tăng khoảng31%. Nội dung giới hạn13 dòng/trang, mỗi dòng abstract khoảng27 ký tự; thêm trang thay vì bỏ bớt văn bản. **Hai trang / Trang trái / Trang phải** điều khiển góc đọc. Với tỷ lệ canvas <0.8 và focus=auto, camera tự phóng trang trái. Trang phải luôn đọc được bằng nút tương ứng. Trang sau/trước vẫn lật cả cặp trang.

Đây là giao diện lấy cảm hứng từ kính trong; không phải framework Liquid Glass của Apple. HTML/CSS/JSON là cấu trúc, giao diện và dữ liệu, mã chương trình do nhóm viết là JS/TS. Không Python hoặc shaderGLSL tự viết.

## Vector có ý nghĩa gì ngay trong cảnh sách?

- Mỗi đốm sáng là một bài báo có ID thật, không phải hạt trang trí.
- Rê vào đốm sáng xem tên/năm/lĩnh vực và điểm nếu đã có. Bấm mở đúng bài trong sách. Thư viện HTML cung cấp đường thao tác bằng bàn phím tương đương.
- Chưa chọn bài: mạng mảnh nối mỗi bài với2 lân cận gần nhất theo cosine384D, gộp các cạnh trùng, chỉ hiện cạnh khi cả2 đầu đang được lọc ra.
- Đọc bài:5 cạnh sáng nối điểm bài đó với các lân cận gần nhất đang hiển thị; một đường vàng chỉ về cuốn sách. Không đủ bài sau lọc thì ít cạnh hơn5.
- Điểm truy vấn dùng cùng phép chiếu và cùng phép biến đổi không gian, hình bát diện màu vàng nhạt.
- Màu lúc chưa có điểm theo chuyên ngành; có câu tìm dùng cosine query; khi đọc dùng cosine so với bài đang đọc. Điểm trong danh sách vẫn so với câu tìm. Màu không phải xác suất đúng hoặc đánh giá chất lượng.

Vị trí **không** được xếp vòng tròn tùy ý cho giống vector. Với điểm PCA thật p, toàn bộ bài và query cùng dùng:

`x = 2.35 p.x; y = 1.4 + 2.35 p.z; z = -2.2 - 2.35 p.y`.

Đây là quay hệ trục, nhân cùng một tỷ lệ và tịnh tiến; khoảng cách giữa hai điểm tăng đúng2.35 lần. Không đẩy từng điểm độc lập ra vòng tròn vì sẽ làm sai quan hệ PCA. PCA vẫn mất thông tin, vì thế cạnh và xếp hạng dùng cosine384D, không dùng khoảng cách trang trí. Khi điểm khuất sau sách, không chọn xuyên qua sách. Trong chế độ đọc, giấy được vẽ ưu tiên để đốm sáng/quầng sáng không che chữ.

## Camera và ngoại cảnh tạo bằng toán

| Giá trị | Ý nghĩa |
|---|---|
| CLOUD_SCALE=2.35 | Nhân đồng nhất cho toàn bộ điểm PCA và query |
| focus=auto/both/left/right | Tự thích nghi/hai trang/trái/phải; không phải chuyển bản đồ |
| radius chờ12, yaw1.23, pitch0.43 | Góc nhìn tổng thể ban đầu |
| scale chờ1.1 → đọc1.5 | Phóng vật thể cùng với chuyển camera |
| tâm X khi đọc một trang ±1.17 | Nhìn thẳng vào giữa trang trái/phải |
| FOV42° | Góc mở dọc camera |
| 0.76 | Tỷ lệ chiều rộng dự kiến để giấy không chạm hai cạnh màn hình |
| đọc cả sách: radius tối thiểu7.25 | Giữ sách và ngoại cảnh trong cùng khung |
| đọc một trang: radius tối thiểu5.8 | Còn được tăng theo aspect để tránh cắt ngang giấy |
| pixel ratio tối đa1.6 | Hạn chế số pixel cần GPU vẽ |
| 200ms | Chu kỳ cập nhật vị trí chiếu phục vụ kiểm chứng/QA, không React state mỗi frame |

Khoảng cách fit ngang: `max(radiusTốiThiểu, width / (2 tan(21°) × aspect × 0.76))`; width=5.1 cho cả sách và2.35 cho một trang. Camera vẫn damp theo dt, drag/zoom/pause/reset hoạt động. Các bước xoáy/đóng/chờ/zoom/mở/lật/thoát tiếp tục dùng state machine ở docs06.

Nền gồm6 dải geometry, mỗi dải543 đỉnh (181 vị trí ×3 hàng). Màu ở hai mép về đen, hàng giữa sáng; cộng màu để tạo dải mờ.4 quầng màu vẽ bằng gradient tròn,420 điểm bụi có màu.144 ký tự dùng19 texture chữ chung, góc/bán kính/độ cao dùng số phức, sin và nội suy. Bán kính xoáy có dạng nón theo độ cao rồi co về gáy sách. Không lấy hình nền/video từ mạng.

## File, hàm và biến

| Module | Hàm/chức năng mới hoặc thay đổi |
|---|---|
| App.tsx | libraryOpen/detailsOpen đóng/mở bảng kính; chọn bài đóng bảng; Escape thoát; giữ luồng search mới nhất |
| MagicBook.tsx | focus, hover; nút trang lớn; tooltip bài thật; không còn mode book/map |
| spatial-layout.ts | toLibraryPoint(p) và readingCamera(aspect,focus), hai hàm thuần để kiểm chứng toán |
| create-book-scene.ts | updateNetwork, updateEdges, pickPaper, focusPage; điểm/node có paperId; raycaster xét sách để tránh chọn xuyên |
| book-pages.ts | readingPages chia mọi phần thành trang ≤13 dòng, giữ đủ abstract; createPageTexture dùng42px |
| atmosphere.ts |6 dải mềm,4 quầng bão hòa màu, bụi màu; update(time,energy) theo thời gian |

`null` = không chọn bài/chưa có điểm/không có queryPoint. `undefined` = tra cứu không có phần tử, kiểm tra trước khi chọn. `scoreValues` là Map ID→cosine thật; không đổi giá trị vắng mặt thành0. `hoverId` tránh cập nhật React mỗi lần pointermove trên cùng một bài. `PageFocus` chỉ chọn phần giấy để nhìn rõ. Hàm và tham số đầy đủ lấy từ danh mục AST, không tự gán số lượng theo đặc tả kế hoạch.

API Next.js, MongoDB, E5 local, search và cache offline không đổi contract/schema. Phiên bản app/web lên0.4.0 vì bổ sung giao diện hợp nhất và cách đọc một trang lớn; dependency/model không nâng. Chưa tự train model mới.

## Kiểm chứng

Unit: giữ khoảng cách PCA theo tỷ lệ, dùng cùng hệ cho query, fit camera ở nhiều aspect, chọn trái/phải và giữ đủ nội dung13 dòng. E2E: cảnh phủ đúng390×844, mở/đóng bảng kính, không còn chuyển mode, lọc điểm cùng dữ liệu, rê/bấm điểm3D mở đúng ID,5 cạnh liên quan, trang lớn desktop/mobile, tìm/lật/thoát và offline.

Một lượt E2E phát hiện phép kiểm tooltip đọc DOM ngay sau pointermove, trước khi React commit; đã sửa bằng chờ điều kiện hiển thị và kiểm mục tiêu không bị bảng kính che. Kiểm tra tương tác3D sau sửa được chạy lại; xem verification.md cho kết quả cuối. Ảnh QA chụp từ web không được dùng làm ảnh nền.

Giới hạn hiện tại:30 bài khởi đầu, PCA3D chỉ để quan sát, chưa benchmark FPS/GPU nhiều thiết bị; cache/model cần cài lần đầu. Các yêu cầu HTTPS443/auth/5.000–20.000 bài vẫn thuộc phạm vi chưa hoàn thành ở bản cơ bản, không thay đổi trong lần thiết kế này.
