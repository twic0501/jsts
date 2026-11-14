# Đặc tả và phân tích bài toán

## Bài toán

Paper Magic hỗ trợ khám phá bài báo nghiên cứu theo ý nghĩa của câu hỏi và mối liên hệ giữa các bài thuộc nhiều lĩnh vực. Người tìm có thể chưa biết tên bài hoặc thuật ngữ tiếng Anh. Kết quả cần thể hiện tài liệu nào liên quan, đoạn nào làm căn cứ và giới hạn của cách diễn giải.

Kho dữ liệu mục tiêu gồm5.000–20.000 abstract về AI, sinh học, y sinh và vật lý. Bản triển khai hiện có corpus gốc30 bài thật cùng các bài truy xuất thêm từ arXiv/OpenAlex. Mục tiêu20.000 chưa được nghiệm thu; số bài cache có thể thay đổi theo các lượt tìm.

## Định nghĩa

| Khái niệm | Giải thích cơ bản trong dự án |
|---|---|
| Paper | Hồ sơ bài báo: ID, tên, tác giả, năm, abstract, nguồn |
| Abstract | Tóm tắt gốc của bài, không phải toàn bộ PDF |
| Embedding | Dãy384 số biểu diễn nội dung để so sánh ngữ nghĩa |
| Cosine | Điểm so hướng của hai vector; không phải phần trăm đúng |
| PCA3D | Phép chiếu vector nhiều chiều xuống3 tọa độ để vẽ |
| Chunk | Một đoạn nhỏ của abstract, giữ vị trí trong văn bản gốc |
| BM25 | Điểm khớp thuật ngữ giữa câu tìm và tài liệu |
| RRF | Cách kết hợp nhiều danh sách theo thứ hạng |
| Reranker | Model đọc trực tiếp cặp câu hỏi–đoạn để đánh giá lại |
| RAG | Truy xuất đoạn nguồn trước, rồi đưa chúng cho model diễn giải |
| DTO | Dữ liệu nhận/trả qua API, chỉ gồm trường được công bố |
| Entity/document | Bản ghi lưu trong MongoDB; có thể có _id nội bộ |
| Schema | Quy tắc kiểm tên trường, kiểu, độ dài, phạm vi |
| Offline | Không gọi Internet cho nhiệm vụ dùng dữ liệu/model đã cài |

## Input và output

Input chính gồm câu hỏi2..300 ký tự, phạm vi thư viện/trực tuyến/kết hợp, topK và bộ lọc lĩnh vực/năm. Query rỗng ở APIv1 có nghĩa duyệt thư viện. Nguồn ngoài được coi là dữ liệu không đáng tin cho tới khi qua schema; bài thiếu abstract được đánh dấu chỉ có tiêu đề.

Output gồm danh sách bài được xếp hạng, điểm cosine, node3D, liên kết bài gần nhau, hồ sơ/tóm tắt trên sách, kế hoạch tìm, đoạn dẫn chứng nguyên văn và diễn giải có citation nếu model trả hợp lệ. Tên nguồn, trạng thái kết nối và cảnh báo được hiển thị. Không có tài liệu thì không tạo câu trả lời giả.

## Yêu cầu chức năng

| ID | Yêu cầu | Hiện trạng và nghiệm thu |
|---|---|---|
| FR01 | Tìm ngữ nghĩa bằng câu hỏi tự nhiên | Có E5/planner; chất lượng còn phụ thuộc model nhỏ và tập ứng viên |
| FR02 | Tìm thư viện, trực tuyến hoặc cả hai | Có scope rõ ràng, trạng thái từng nguồn |
| FR03 | Lọc lĩnh vực/năm, giới hạn kết quả | Có schema strict; lọc sai trả422 |
| FR04 | Hiển thị vector3D trong cùng cảnh sách | Có PCA của vector thật, không vẽ tọa độ ngẫu nhiên làm semantic |
| FR05 | Màu phản ánh mức liên quan | Có dải cosine; không gọi là xác suất hoặc đánh giá chất lượng bài |
| FR06 | Mở/lật/đóng sách và chọn bài | Có state machine, giảm chuyển động, camera và nút điều khiển |
| FR07 | Đọc abstract, nguồn/PDF và sao chép trích dẫn | Có; PDF mở nguồn ngoài, chưa dựng toàn văn vào sách |
| FR08 | Lưu bài và giữ sau reload | Có IndexedDB trên cùng trình duyệt, chưa đồng bộ tài khoản |
| FR09 | RAG có đoạn minh chứng | Có offsets/citation; ID hợp lệ chưa chứng minh entailment |
| FR10 | Hoạt động khi mất mạng | Thư viện/model local hoạt động; bài mới trên Internet không lấy được |
| FR11 | Log AI theo module và log prompt runtime | Có README/log phát triển; runtime ghi plan/synthesis và accepted |
| FR17 | Lưu vị trí đọc | Thiết kế đích. Lưu theo tài khoản và tài liệu, đọc lại đúng phiên bản, xử lý xung đột theo revision. |
| FR20 | Quản lý tài liệu đã nhập | Thiết kế đích. Sửa metadata, thay file có tiến độ xử lý, xóa chặn tất cả phiên bản. |
| FR24 | Lưu thiết lập | Thiết kế đích. Theme, cỡ chữ, giảm chuyển động và chất lượng cảnh lưu theo hồ sơ trình duyệt. |

Chi tiết yêu cầu đích của ba FR trong [phạm vi tính năng](20-feature-scope.md) và [hợp đồng API v4](design/README.md).

## Yêu cầu phi chức năng

| ID | Yêu cầu | Điều kiện đánh giá |
|---|---|---|
| NFR01 | Mã JS/TS | Source app, AI runtime wrapper và test JS/TS; weights/ONNX/WASM là tài nguyên thư viện |
| NFR02 | Dựng3D bằng toán | Geometry/Canvas; số phức, sin/cos, nội suy và trạng thái theo dt; không dùng video hoạt họa |
| NFR03 | Có backend và MongoDB | Next Route Handlers; storage trả đúng mongodb hoặc json/memory, không giả nguồn |
| NFR04 | Có dữ liệu ngay trong web | Corpus/vector đóng gói, IndexedDB, service worker và modelE5 local |
| NFR05 | Kiểm input nghiêm | JSON hợp lệ, field đúng schema, kiểu số nghiêm, hữu hạn, nguyên và trong khoảng |
| NFR06 | Bảo vệ quá tải | v3 tối đa2 request đang chạy,20lượt/phút/tiến trình; trả429 và tiếp tục phục vụ health |
| NFR07 | Giao diện đọc được | Desktop/mobile, không tràn ngang; HTML đọc được khi thiếuWebGL |
| NFR08 | HTTPS443 | Web server đã kiểm loopback443/TLS1.3; public cần DNS/chứng chỉ/host thực tế |
| NFR09 | Bí mật và mã hóa | Env/key không vào Git; TLS truyền; thiết kế mã hóa ổ đĩa/backup ở host |
| NFR10 | Tái lập kiểm chứng | Lockfile, revision/hash model, script test, raw report và README từng module |

## Điều kiện offline cho nhiệm vụ quan trọng

| Tình trạng | Backend | Trình duyệt |
|---|---|---|
| Mất Internet, local/LAN còn | scope library dùng Mongo+model local; RAG có thể hoạt động | Vẫn gọi backend local/LAN |
| Mất Internet khi host ở xa | Host có thể tiếp tục xử lý tại nơi đặt host, nhưng client không truy cập được host | Dùng dữ liệu/cache và E5 trong browser, không gọi đây là RAG đầy đủ |
| Mất API | Không có đáp ứng backend tới client | Tìm vector tài liệu đã lưu; báo fallback, giữ bookmark |
| Chưa cài model/cache lần đầu | Không cam kết inference | Không cam kết reload offline |
| Cần bài mới từ nguồn ngoài | Không thể lấy mới khi offline | Hiện cảnh báo và dùng dữ liệu đã có |

Không đánh đồng “backend xử lý local không Internet” với “truy cập được máy chủ ở xa khi đường truyền đã mất”. Đây là hai điều kiện khác nhau và cần kiểm riêng.

## Trình tự triển khai theo phụ thuộc

1. Chốt yêu cầu, input/output, DTO và schema.
2. Viết toán/vector/chunk, quy tắc số/null/undefined và unit test.
3. Chuẩn bị corpus có nguồn, manifest model, snapshot và Mongo seed.
4. Xây repository/API với kiểm input, lỗi và giới hạn tải.
5. Nối luồng RAG, kiểm đoạn gốc, citation và fallback.
6. Nối React/Vite, scene toán học, trang sách và lưu trong web.
7. Kiểm cache/offline, E2E, tải, quá tải và độ bền.
8. Cấu hình host, TLS443, quyền DB, backup và kiểm từ máy bên ngoài.

Đây là thứ tự phụ thuộc kỹ thuật, không phải lịch làm việc hoặc phân công.
