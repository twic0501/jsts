# Hàm, biến, công thức và quy tắc dữ liệu

Danh mục được sinh từ AST của mã JS/TS hiện có. function-catalog.md liệt kê từng hàm có tên, file/dòng, tham số và kiểu trả về khai báo hoặc inferred. variable-catalog.md giữ mọi biểu thức khởi tạo biến, scope và kiểu khai báo; không còn giới hạn biểu thức160ký tự hoặc200dòng như catalog cũ. code-catalog.json dùng để đọc bằng chương trình. Các số tổng theo module ở18-module-inventory.md.

Phạm vi đếm là apps, packages, scripts; không gồm node_modules, dist, publicassets hoặc.next. Anonymouscallback không được tính là hàm có tên. Biến nhận arrowfunction được tính ở danh mục hàm; một lần tái gán không tạo biến mới. Giá trị trong catalog là biểu thức mã nguồn, không phải credential hoặc giá trị môi trường khi chạy.

## Các hàm theo trách nhiệm

| Nhóm | Hàm tiêu biểu | Input → output |
|---|---|---|
| Toán | Complex.rotate, rotatePoint3D, orbitPosition | Tọa độ/góc hữu hạn → tọa độ quay |
| Thời gian | damp, stepAngle, smooth | dt và hệ số → giá trị nội suy/góc |
| Vector | normalizeVector, cosineSimilarity, fitPca3, projectPca | Dãy số → vector chuẩn hóa, điểm tương đồng hoặc point3D |
| Tìm kiếm | SemanticIndex.search/neighbors | Query/filter/vector → danh sách paper+score |
| Nguồn ngoài | normalizeArxiv, normalizeOpenAlex, searchProvider | XML/JSON/query → Paper đãvalidate và status |
| RAGcore | chunkPaper, rankPassages, validateGroundedClaims | Paper/vector/context → đoạn/score/claim hợp contract |
| RAGorchestrator | runResearch, researchSearch | DTO → dataset/result/research/provider/warning |
| Prompt | planningPrompt, parsePlan, synthesisPrompt, parseSynthesis | Câu hỏi/evidence/output → messages hoặc dữ liệu đãkiểm |
| Model | embedBatch, embedQuery, generate, rerankLocal | Văn bản → vector, diễn giải hoặc logit |
| Storage | getDataset, loadResearchDataset, saveResearch | Mongo/snapshot → dataset hoặc persistence |
| Weblocal | saveCorpus, loadCorpus, saveOnlineDataset, loadBookmarks | Dữ liệu đãkiểm ↔ IndexedDB |
| Sách | BookRitual, readingPages, createPageTexture | Trạng thái/paper → phase, trang và texture |
| UI | App, PaperDossier, ResearchPanel | State/data/callback → JSX và tương tác |

Bảng trên giải thích vai trò, không thay catalog đầy đủ. Không nói chỉ tồn tại các hàm nêu ví dụ.

## Giá trị và biến quan trọng

| Biến/hằng | Giá trị hoặc nguồn gán | Ý nghĩa |
|---|---|---|
| MODEL_ID | Xenova/multilingual-e5-small | Modelembedding đa ngôn ngữ |
| dimensions |384| Số chiều vector tìm kiếm |
| SIMILARITY_BANDS.high/medium |0.82/0.79| Ngưỡng hiển thị prototype, chưa hiệu chuẩn xác suất |
| conceptual | query có≥5từ | Bật planner/synthesis cho câu dài |
| plan.method | local-llm hoặc original | Phân biệt diễn đạt lại với giữ câu gốc |
| maxWords / overlap |100/20| Cửa sổchunk mặc định |
| start/end | Match vị trí từ gốc | quote phải đúng substring |
| cosine | -1..1 từ vector | Màu tương đồng, không phần trăm đúng |
| fusionScore | Tổng điểm thứ hạng | Dùng xếp hạnghybrid, không phải cosine |
| rerankScore | Rawlogit nếu chạy model | Không tự biến thành phần trăm |
| active |0 lúc modulekhởi tạo | Requestv3 đang chạy, chặn khi≥2 |
| requests | Mảngtimestamp | Giới hạn20lượt/phút/tiến trình |
| busy |false lúc khởi tạo | Generator không nhận thêm khi đang chạy |
| pending | MaprequestID | Ghép phản hồi worker với request vàtimeout |
| traceId | crypto.randomUUID() | Liên kết API, run và promptaudit |
| source / storage | Trạng thái thực của dữ liệu | Không báoMongo khi đangfallback |
| corpus/snapshot | Từ packaged/Mongo/IDB | Metadata và vector phải cùngmodel/PCA |
| selected | Paper hoặcnull | Bài đang đọc hoặc chưa chọn |
| query/draft/completedQuery | Statechuỗi | Tách câu nhập, câu đãgửi và kết quả hoànthành |
| saved | string[] từbookmarkstore | IDbài đãlưu trêntrìnhduyệt |
| offlineReady | Handshakecache trảtrue | Không suy ra từcontroller đơn thuần |
| dt | Thời gian khung hình | Chuyển động không gắn cứng vào sốFPS |
| radius/yaw/pitch | Statecamera | Khoảng cách và góc nhìn, có chặnbiên |
| PAGE_WIDTH_SCALE |1.22| Tăng rộng mặttrang |
| CLOUD_SCALE / center |2 và(0,4.1,-4.2)| Đặtđámnode cao/sau sách, quayquanh tâmriêng |
| context/evidence | Cácđoạn thật đãtruyxuất | Giới hạnnguồn modelđược dùng đểtrảlời |

Các giá trị chính xác ở catalog và source là chuẩn khi tài liệu giải thích bị lệch sau thay đổi. Phải sinh lại catalog và rà soát các hằng khi sửa mã.

## Toán của không gian3D

Số phức z=x+iy quay gócθ bằng z′=z(cosθ+i sinθ). Tọa độ mới: x′=xcosθ−ysinθ, y′=xsinθ+ycosθ. rotatePoint3D áp dụng quay lần lượt trong các mặt phẳng để xử lý3chiều; Three.js vẫn dùng ma trận/camera để kết xuất. Không nói mọi phép tính đều chỉ dùng số phức: portal/quỹ đạo dùng thêm sin/cos, scale và phép nội suy.

Damping theo thời gian: value′=value+(target−value)(1−exp(−λdt)). Góc cập nhật theo speed×dt, chuẩn hóa vào0..2π. smooth(t)=t²(3−2t), sau khi chặn t vào0..1. BookRitual điều khiển thứ tự chờ→vortex→tích sáng→truyền chữ→đóng→zoom→mở→đọc; khi thoát sách phải mở lại trước khi nhả chữ.

Cosine(a,b)=(a·b)/(||a||||b||). Vector tìm kiếm384D; PCA3D làm mất thông tin nên khoảng cách hiển thị không thay thế phép so384D. Hình sách, giấy, quỹ đạo và ký tự được tạo bằng geometry/CanvasJS; không dùng video hoặc ảnh dựng sẵn làm hoạt họa.

## null và undefined

| Tình huống | Quy tắc |
|---|---|
| Chưa chọn bài | selected=null, đã xác định là không có lựa chọn |
| Không có PDF/DOI từnguồn | pdfUrl/doi=null trong contract cónullable |
| Không có model sinh diễn giải/trace ởfallback | model/traceId=null |
| Bộ lọc tùy chọn chưa truyền | undefined, bỏ trường khỏiJSON |
| Tra cứu không tìm thấy | Map.get/Array.find trảundefined, kiểm trước khi dùng |
| Chưa có rerankScore | undefined/omit, không gán0 giả |
| Danh sách không có phần tử |[], khôngnull |
| Dữ liệu sai hoặc hệ thốnglỗi | Throw/lỗiHTTP/status; không dùngnull chelỗi |

tsconfig bậtstrict, strictNullChecks, exactOptionalPropertyTypes, noUncheckedIndexedAccess. Không épunknown sangtype chỉ đểnévalidation. Chuỗi"undefined" hoặc"null" không được dùng làmURL.

## Chuỗi và số

Chuỗi input cần kiểm độdài/rỗng trước. APIJSON nhậnnumber nghiêm; không épchuỗi"12abc" thành12 hoặcNumber("")thành0. UIselect cógiátrị"all" phải táchtrườnghợp đó rồi mớiNumber(year). Sau chuyển số cần kiểmNumber.isFinite, sốnguyên nếu yêu cầu và khoảng/hướng(yearFrom≤yearTo). Hàm toán từchốiNaN/Infinity, dtâm và radius≤0 theo contract. Không tựquyđổi mọi thôngbáolỗi thành0.

DTO, entity vàschema cóvai tròkhác nhau: DTO làdữliệu truyền, entity làbảnghi lưu, schema làquytắc kiểm. Cấu trúcôngdụngkhông chỉlàtênclass; quan hệmodule, field, quyềnvàflow phải được ghi ở14-architecture-api-database.md.
