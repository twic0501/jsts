# Paper Magic0.5 — đầu vào, đầu ra và nhịp phù phép

## Hiểu bài toán bằng cách đơn giản

**Input của người dùng:** một câu hỏi/chủ đề, ví dụ “AI phân tích ảnh tế bào”, và bộ lọc lĩnh vực/năm nếu cần. Input dữ liệu của hệ thống là các bài báo đã có trong thư viện: tiêu đề, tác giả, năm, abstract và nguồn. Bản hiện tại30 bài thật từ arXiv, chưa5.000–20.000 bài.

**Output:** danh sách bài báo được xếp theo mức tương đồng với câu tìm, điểm cosine, các node thể hiện bài báo và các liên kết lân cận. Khi mở bài, sách hiển thị tiêu đề/tác giả/năm/ghi chú Việt/abstract gốc/link nguồn. Đây là tìm kiếm trên tài liệu đã có; không tự viết bài nghiên cứu mới hoặc tự đưa ra kết luận khoa học.

Vector384D và tọa độ PCA3D là dữ liệu trung gian. Backend Next.js/worker JS chạy E5 local để đổi câu hỏi thành vector; cosine xếp hạng ở384D; PCA giúp trình bày. Các hiệu ứng không thay thứ hạng và không phải bằng chứng AI trả lời đúng.

## Chữ và node trong phiên bản này

- Lúc chờ chỉ có144 **ký tự đơn**, cùng màu trung tính #d1d5ef. Không còn các từ dài hoặc mỗi ký tự một màu.
- Mỗi ký tự được lấy từ tiêu đề bài và giữ paperId gốc. Một ký tự không được gọi model riêng để đo “ý nghĩa”.
- Sau khi có kết quả thật, chọn tối đa12 node đang hiện có điểm cao nhất để biểu diễn truyền dữ liệu; thứ tự ký tự ưu tiên theo điểm của bài gốc. Ký tự đi vào đúng node paperId, không bay ngẫu nhiên vào node khác.
- Ký tự chưa phóng và các ký tự đứng ngoài luồng vẫn trung tính. Ký tự đang truyền nhận màu cùng dải điểm với node; sau khi thoát và tản ra thì trở về trung tính.
- Khi có câu tìm, màu node luôn so với **câu tìm**, kể cả lúc đang đọc bài. Khi không tìm mà trực tiếp chọn bài, màu so với bài được chọn. Đường lân cận vẫn tính cosine giữa các bài.

Ngưỡng giao diện hiện tại nằm ở một nguồn SIMILARITY_BANDS: xanh ngọc ≥0.82, xanh lam từ0.79 đến dưới0.82, tím dưới0.79. Đây là dải hiển thị của prototype, chưa hiệu chuẩn bởi chuyên gia; không phải xác suất hay phần trăm độ chính xác. Các mốc0.85/0.75 trong docs06 là lịch sử0.3, đã thay ở0.5. Điểm thật không bị sửa để tạo màu.

## Các nhịp thực thi

| Phase | Giây | Điều nhìn thấy |
|---|---:|---|
| waiting | Chờ dữ liệu | Không truyền chữ bằng điểm cũ; không có kết quả thì trở về chờ |
| vortex |5.0| Chữ đi đến node: một ký tự, rồi hai, sau đó dày dần |
| charging |2.1| Node tích sáng đúng3 nhịp lên/xuống |
| channeling |3.8| Hố đen mở trên sách; node phát ký tự có màu xuống đó |
| sealing |1.0| Vùng xoáy co lại, khép và biến mất |
| closing |0.75| Sách khép sau khi portal đã hết |
| settling |1.0| Sách hạ xuống bục và nằm một bên |
| zooming |0.9| Chuyển đến góc nhìn đọc, chừa chỗ cho bìa dựng lên |
| opening |1.2| Một mặt sách giữ ổn định, mặt kia mở ra; camera về gần khi sách đã phẳng |
| reading | Theo người dùng | Trang lớn; chọn trái/phải/hai trang |
| turn-framing |0.55| Lùi camera trước khi lá giấy chuyển động |
| turning |1.05| Lá giấy uốn quanh gáy; mặt trước và sau có nội dung đúng |
| exit-closing |0.8| Khép sách |
| exit-zoom |1.0| Camera lùi |
| exit-reopen |1.1| Mở lại sách hoàn toàn, chưa nhả chữ |
| exit-release |2.6| Sách đã mở; chữ đi từ sách về node rồi trở lại không gian |
| exit-opening |0.8| Sách tiếp tục mở nhẹ và lơ lửng |

Chuỗi vào sách khoảng15.75s sau khi có kết quả, chưa gồm thời gian model/API. dt giới hạn0.05s/frame, máy chậm có thể thấy lâu hơn. Có pause và reduced motion; reduced motion bỏ các đoạn chuyển cảnh nhưng vẫn tìm/đọc/lật/thoát được. Nhấn tìm mới hủy chuỗi trước; Escape hủy quyền tự mở kết quả đang chờ.

## Công thức và góc nhìn

`launchDelay(rank,N)=3.7×(rank/(N−1))^0.3`: khoảng cách giữa các lần phóng giảm dần. Mỗi chuyến đến node kéo dài1.05s, nên tất cả hoàn tất trước hết nhịp5s. Arc là nội suy giữa hai đầu cộng `4×lift×t×(1−t)` ở độ cao.

Nhịp tích sáng: `sin²(π×age/0.7)` trong2.1s, tạo3 đỉnh. Màu điểm không thay vì nhịp sáng; chỉ độ sáng/quầng thay đổi. Luồng vào portal dùng cung cong và một vòng xoáy nhỏ bằng số phức ở đoạn cuối.

Node lơ lửng phía trên và sau sách: CLOUD_SCALE=2, tâm (0,4.1,-4.2). Toàn bộ đám mây cùng quay/nâng hạ quanh tâm này, không xoay quanh gốc sách làm trôi cả cụm về một bên. Mobile cùng scale0.7 cho cả đám mây. Ranking vẫn ở384D. Camera tổng thể yawπ/2 nhìn giữa cụm, tâm nhìn(0,2.8,-1.8); chuyển theo vòng cung khi đưa chữ xuống sách rồi sang góc đọc. Sách scale nền1.2, đọc1.6.

Liên kết nền là tối đa24 cạnh, mỗi node tối đa2 nhánh để bớt rối; thuật toán chọn từ lân cận cosine thật và loại cạnh trùng/tự nối/bị lọc. Có điểm sáng chạy dọc các cạnh. Chọn hoặc hover vẫn có tối đa5 cạnh liên quan. Không còn đường buộc cố định từ node xuống gáy sách; chỉ đoạn channeling mới có tia truyền vào portal. Trong lúc đọc, mạng nền dịu đi để không che chữ. Link arXiv gốc nằm ngay cạnh nút Trang trái/phải và vẫn có trong Góc đọc; mở link nguồn cần Internet.

**PAGE_WIDTH_SCALE=1.22** nới thêm22% bề ngang cả trang/bìa, giữ tỷ lệ chi tiết trong sách. Camera fit dùng cùng hệ số để không cắt ngang giấy; một trang mobile có tâm X ±1.25×1.22. Chữ trên texture44px, trang≤13 dòng và vẫn giữ đủ abstract.

## Sửa lỗi sau khi chụp lúc mở/lật

Đã chụp ở opening0.15/0.6/1.0s và turning0.22/0.58/0.84s, không chỉ sau khi xong. Lượt đầu phát hiện lá giấy dựng lên bị cắt phía trên và lớp giấy có thể ưu tiên vẽ quá sớm.

- Camera lùi và nâng điểm nhìn khi mở/lật, giữ thêm36% khoảng cách ở đoạn cần chỗ cho lá dựng. Trên điện thoại tạm xem cả cuốn trong lúc lật, sau đó trở lại focus đã chọn.
- Mặt chữ chỉ ưu tiên khi đang đọc/chuẩn bị lật/lật, không xuyên bìa khi sách còn khép.
- Lá lật có hai material FrontSide/BackSide, texture sau riêng và lật UV ngang để tránh chữ ngược.
- Giữ cặp trang cũ trong turn-framing; chỉ đổi trang nằm dưới khi lá giấy bắt đầu chuyển động. Hoàn tất mới chốt spread.
- Nút đọc nền kính tối, không bị chìm trên giấy sáng.
- Portal thay các vòng trắng chồng thành một vùng tối, viền gradient mềm, một vòng mảnh và hai nhánh xoáy dịu. Đây là mô tả mỹ thuật, không mô phỏng vật lý hố đen.

Ảnh và report ở .local/screenshots/qa-*.png và .local/book-visual-qa.json; script scripts/capture-book-qa.mjs. Ảnh QA không được dùng làm nền/texture ứng dụng.

## Hàm và quy tắc dữ liệu

| File | Trách nhiệm |
|---|---|
| ritual.ts | BookRitual.start/resolve/close/turn/tick/sample; DURATIONS và SIMILARITY_BANDS |
| letter-flight.ts | launchDelay, flightProgress, arcPoint, orderLetters; dữ liệu thật quyết định kế hoạch bay |
| knowledge-portal.ts | createKnowledgePortal và update; geometry/Canvas tự tạo, không ảnh tải sẵn |
| semantic-links.ts | sparseSemanticLinks(rows,visible,limit=24); giới hạn2 nhánh/node, giữ score và ID thật |
| create-book-scene.ts | planLetters, paintPage/paintPages, clearLeaf; worldNodes/scoreValues/baseColors; camera, raycast và cleanup |
| spatial-layout.ts | toLibraryPoint, readingCamera; CLOUD_SCALE và PAGE_WIDTH_SCALE |
| book-pages.ts | Chia đủ văn bản, vẽ giấy44px |
| App/MagicBook | Input/filters/results/selected paper, bảng kính, nhãn các phase và các thao tác |

`rank` là thứ tự phát ký tự, không phải độ tự tin AI. `paperId` giữ nguồn ký tự. `scoreValues` giữ cosine thật. `worldNodes` là vị trí hiện tại sau phép biến đổi chung, để ký tự không bay hụt node đang di chuyển. `baseColors` dùng lại màu, không tạo màu/texture mỗi frame. `pendingSpread` chưa phải spread đã chốt; `turnFrontTexture/turnBackTexture` được dispose khi kết thúc hoặc hủy. `pendingScores` giữ cập nhật trong lúc giải phóng chữ để không đổi màu giữa chuyến.

`null`: chủ động không chọn/chưa có điểm/không có texture lá lật. `undefined`: lookup không có, kiểm tra trước dùng. Điểm0 hợp lệ, không thay điểm vắng mặt thành0. Danh mục hàm/tham số/return và biến cập nhật bằng scripts/document-code.mjs; không nhập tay số hàm theo kế hoạch.

Ứng dụng/script JS/TS; hình học, quỹ đạo, Canvas tự sinh. Không Python, ảnh/video/model3D ngoài hay shaderGLSL tự viết. Backend Next.js, Mongo, E5 local và API/schema giữ nguyên. App/web lên0.5.0 cho tính năng mới; không nâng dependency/model. Kiểm chứng cuối xem verification.md. Giới hạn corpus30, HTTPS/auth và benchmark20.000 bài vẫn như mốc cơ bản trước.
