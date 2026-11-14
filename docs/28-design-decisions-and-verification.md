# Quyết định thiết kế và kiểm chứng

Cập nhật 14/11/2026. Đây là hồ sơ thiết kế và tiêu chí kiểm chứng FR17, FR20 và FR24.

## Đối chiếu nhận xét giảng viên

| Nhận xét | Cách áp dụng trong Paper Magic |
|---|---|
| API là hợp đồng | Tài nguyên, request/response, quyền, status, Location, precondition và retry đều có quyết định |
| Bắt đầu từ nghiệp vụ | Document/Version/Chunk là lõi; bookmark/collection/note có quan hệ tới Document |
| Method thể hiện hành vi | GET đọc, POST tạo, PUT đặt trạng thái, PATCH sửa một phần, DELETE logical delete/thu hồi |
| Không tạo trùng khi retry | Idempotency receipt gắn principal/route/payload; lệnh offline replay cùng key |
| Status đúng | 201 resource + Location, 202 job + Location, 412 revision cũ, 409 conflict nghiệp vụ |
| Version có kiểm soát | v4 là contract kế tiếp, không đặt version theo feature hoặc hybrid ranking; v1–v3 giữ tương thích tạm |
| Chốt database và cấu trúc trước code | Tài liệu 26/27 và registry là baseline; API DTO chi tiết hoàn thiện trước triển khai route |
| Test/staging/production | Contract/unit trước; staging DB/model/file thật; production cùng build đã kiểm |
| Hiểu và giải thích | Có lý do dùng hai cấp vector, job, local-first, receipt và generation, không chỉ liệt kê tên công nghệ |

Không diễn giải nhầm rằng đặt entity vào URL đã chứng minh áp dụng đầy đủ DDD, hoặc trình duyệt tuyệt đối không thể dùng gRPC-Web. Những chỉnh lý này giữ mục đích bài giảng và làm phát biểu kỹ thuật chính xác hơn.

## Thứ tự hoàn thiện theo phụ thuộc

1. Pilot dữ liệu bốn lĩnh vực, nguồn và quyền sử dụng; Document/Version/Chunk, phân loại và bộ câu hỏi đối chiếu.
2. Các bất biến: ownership, hash/revision/generation, vector cấp bài/đoạn và content coverage.
3. Chi tiết DTO/API theo resource registry: request, response, error, status, retry và ETag.
4. Service/domain tests, repository/transaction/index contract; kiểm Cassandra phiên bản thực tế trước CQL.
5. Route/controller dùng service; một write path cho online và replay offline.
6. DataService/IDB migration, search/replay/conflict; sách Three.js nhận view model.
7. Staging kiểm toàn luồng và có số liệu; rollback/migration rồi mới chuyển production.

Đây là thứ tự kỹ thuật, không là phân công hoặc lịch nhóm. Ưu tiên hoàn thành một lát cắt có thể kiểm: nhập một tài liệu → tìm đúng đoạn → hiển thị nguồn → mất mạng tìm lại → reconnect không nhân bản. Không scaffold hàng chục route trống để tính là hoàn thành.

## Kiểm gì trước khi chốt

| Nhóm kiểm | Ví dụ có ý nghĩa |
|---|---|
| Data quality | Nhãn ngành, nguồn, trùng/phiên bản, đủ abstract, PDF parsing, hash/offset |
| Unit | Policy, CAS, conflict, state machine, chunking, score, mapper và generation |
| API contract | Method, media, schema, limit, 201/Location, 202/job, error envelope |
| Integration | Mongo transaction, Cassandra scope/generation, file store, worker recovery |
| Retry/offline | Server commit rồi mất response, replay không tạo collection/history thứ hai; revision conflict không mất note |
| E2E | Đăng nhập → nhập PDF → job ready → search → mở đúng đoạn; người khác bị chặn |
| Prompting | Context đúng quyền, citation sai, không đủ evidence, injection và model fallback |
| Performance/security | Latency, byte, CPU/RSS/heap, queue/burst/soak, FPS, ACL/CSRF/file quota |

Không cộng số nhóm test thành số testcase. Test thiết kế registry/schema không chứng minh có API đang chạy. Kết quả data audit 7.500 bài không thay evaluation ngữ nghĩa hoặc E2E 7.500 node.

## Ca nghiệm thu FR17 FR20 và FR24

| Ca | Thao tác và kết quả chờ |
|---|---|
| FR17 tạo và cập nhật đồng thời | Hai client gửi `If-None-Match: *` và key riêng. Một request trả 201 + Location, request kia trả 412. Cả hai đọc cùng ETag rồi cập nhật. Một request trả 200, request còn lại trả 412 và giữ bản nháp. GET trả mốc với revision mới và ETag. Cả hai phản hồi PUT thành công có revision trong body. |
| FR17 lỗi 404 và 422 | Trỏ tới bản thuộc tài liệu khác hoặc bản bị thu hồi quyền trả 404. Với bản đã xác thực quyền, chunk sai bản, trang ngoài miền hoặc progress ngoài 0–1 trả 422. |
| FR17 đọc lại bản A | Lưu mốc của A rồi thay bằng B. Khi B đã kích hoạt, GET mốc vẫn trỏ A. Đọc chunk hoặc nguồn theo đường dẫn có version A mở đúng đoạn/trang. Nếu A hết khả dụng, client cho chọn mở B từ đầu khi còn quyền đọc tài liệu. |
| FR20 kiểm revision multipart | Thiếu part trả 428. Revision rỗng, lặp, dạng file, phân số hoặc ngoài miền số an toàn trả 422. Giá trị cũ trả 409. Các trường hợp này không tạo version/job. PATCH và DELETE vẫn dùng If-Match và trả 412 khi ETag cũ. |
| FR17 và FR20 mất phản hồi sau commit | Gửi lại cùng key, payload và điều kiện. FR17 trả lại 201 hoặc 200 với revision cũ đã commit. FR20 trả lại cùng 201, Location và jobId dù Document revision đã tăng. Đổi revision hoặc file với cùng key trả 409. Khi quyền đã bị thu hồi, receipt không được dùng để trả dữ liệu riêng. |
| FR20 worker hoàn thành sai thứ tự | A đang phục vụ. Chấp nhận B rồi C với revision mới tương ứng. Chạy cả hai thứ tự hoàn thành. Chỉ C có thể kích hoạt. B chưa từng kích hoạt kết thúc với VERSION_SUPERSEDED. Nếu C lỗi thì A vẫn phục vụ. Lượt xử lý hết lease không có quyền kích hoạt. |
| FR20 xóa trong lúc chạy job | Sau 204, thử đọc Document, bản hiện hành và lịch sử, chunk, file gốc, job và dẫn chứng đã lưu. Server chặn các request đọc mới hoặc lọc dữ liệu đã xóa. Cho worker tiếp tục để kiểm nó không thể phục hồi tài liệu. Retry DELETE cùng yêu cầu trong TTL trả 204 cho chủ cũ. Thiết bị đã tải dữ liệu xử lý tombstone khi sync lại. |
| FR24 hồ sơ trình duyệt | Thay bốn thiết lập, reload và đổi tài khoản trong cùng hồ sơ. Giá trị vẫn giữ qua các lần mở. Hồ sơ khác có thiết lập riêng. Theo dõi network và sync feed để xác nhận thao tác thiết lập chỉ lưu cục bộ. |

Các ca trên là tiêu chí cho kiểm thử runtime sau triển khai. Lượt cập nhật này chạy kiểm registry, OpenAPI, JSON Schema và ví dụ DTO.

## Phiên bản và Git

Lưu docs trước triển khai. Branch triển khai dùng prefix codex/, commit theo module/lát cắt; không trộn artifact sinh lại với sửa nghiệp vụ mà không nêu lý do. Pull/fetch và kiểm worktree trước merge, không reset mất thay đổi cục bộ. Lần cập nhật tài liệu này không push/merge GitHub hoặc tạo branch mới.

Ghi package/lockfile, revision model/parser/pipeline và migration cùng evidence. Patch sửa lỗi tương thích; minor thêm tính năng tương thích; major có thể phá tương thích. Trước 1.0 vẫn phải công bố thay đổi contract, không suy rằng mọi minor đều an toàn. Phiên bản dataset và HTTP API có vòng đời riêng.

Mỗi module triển khai có README mô tả contract, entrypoint, lỗi, dữ liệu/đơn vị/null/undefined, offline, test và AI development log. Catalog hàm/biến chỉ sinh từ code đã có, không dùng số hàm dự kiến làm số đã viết. Runtime prompt log chỉ ghi lượt model thực sự chạy.

## Hồ sơ chính thức của lần thiết kế

- [26: Data và mô hình nghiệp vụ](26-data-domain-baseline.md).
- [27: Backend, module và API](27-backend-domain-baseline.md).
- [Resource API registry](design/resource-api.registry.json): danh mục hành vi HTTP dự kiến.
- [Data contract](design/data-domain.contract.json): entity/quan hệ/bất biến thiết kế.
- [Validation](design/domain-baseline-validation.json): chỉ kiểm tính nhất quán hồ sơ.

Tài liệu 21–24 và OpenAPI 45 endpoint ngày 12/11 là đề xuất lịch sử. `/sync/push` không còn trong write path đích. API v1–v3 đang chạy không bị sửa trong bước này. Các slide hiện có là snapshot đã tạo, chưa được cập nhật tự động theo baseline mới.
