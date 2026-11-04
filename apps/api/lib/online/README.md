# Online search — Next.js / TypeScript

`providers.ts`: gọi2 API nguồn cố định, không nhận URL tùy ý; timeout10s, body≤2MB, cache nguồn15phút tối đa80 key, coalesce request giống nhau, arXiv đặt lịch≥3.1s/lượt trong tiến trình. OpenAlex key tùy chọn OPENALEX_API_KEY chỉ trên backend. Lỗi/429 được trả thành trạng thái từng nguồn, không lộ raw exception/key. Group là nhãn suy đoán để hiển thị, không metadata chuyên ngành do chuyên gia xác nhận.

Hàm: cleanText, reconstructAbstract, guessGroup, normalizeOpenAlex, normalizeArxiv, deduplicatePapers, searchProvider. Helper limitedText chặn phản hồi quá lớn. DOI chuẩn hóa để gom trùng; OpenAlex trỏ arXiv dùng chung ID. Tiêu đề trùng không đủ để gộp. Thiếu abstract đánh dấu false và embedding chỉ title.

`search.ts`: runOnlineSearch(input,deps) dễ kiểm với adapter giả; onlineSearch(input) dùng nguồn/model/Mongo thật. Lấy tối đa8 bản ghi mỗi nguồn, đan xen rồi gom trùng/lọc/giữ≤12 bài mới; dùng passage embedding theo batch2, query embedding, projection PCA của corpus gốc. Không fit PCA mới mỗi lần tìm. Chỉ trả ứng viên mà nguồn truy xuất được, không tuyên bố tìm toàn bộ Internet.

scope online chỉ ID được nguồn tìm thấy; combined thêm thư viện gốc. Một nguồn lỗi không làm mất nguồn kia, cả2 lỗi trả cảnh báo/rỗng hoặc thư viện tùy scope. Model lỗi503, không gọi lexical là semantic. Bài được lưu vào onlinePapers và onlineEmbeddings khi có MONGODB_URI; lỗi DB ghi warning và storage=memory. Collections online tách khỏi corpus seed để không phá v1/snapshot gốc. Chưa có endpoint tải lại toàn bộ online Mongo thành thư viện tài khoản; FE dùng bản cache IDB của máy đó để tìm lại.

POST /api/v2/search: JSON≤8192B; query2..300, scope online|combined, topK1..20; group/year tùy chọn, kiểm năm đảo, không nhận field thừa. Chặn đồng thời3 request và20 lượt/phút toàn tiến trình. Đây là giới hạn prototype, chưa phải rate limit phân tán theo tài khoản. Chưa public deployment hay auth quản trị. Không đưa DB loopback không auth ra mạng.

Không train trong HTTP. E5 Q8 có sẵn tạo384D, cosine rank. Chưa tự train reranker; không tạo fake prompt training logs. Mỗi file chỉ JS/TS, XML/JSON là dữ liệu. Danh mục hàm/biến sinh AST ở docs; kiểm unit + E2E + live source smoke, report docs/verification.md.

Nguồn đối chiếu: https://help.openalex.org/api/ ; https://info.arxiv.org/help/api/index.html . Điều kiện tài khoản/hạn mức ngoài có thể đổi;503/429 phải được hiển thị, không né giới hạn hoặc scrape Google Scholar.
