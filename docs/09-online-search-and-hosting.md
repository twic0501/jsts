# Mở rộng: tìm nghiên cứu nhiều nguồn, tự train JS/TS và chạy Internet

Đây là đặc tả bước tiếp theo, **chưa phải tính năng đã triển khai/deploy**. Ứng dụng hiện tại chạy local với30 bài và E5 có sẵn; chưa có model xếp hạng tự train. Mã mới vẫn JS/TS, FE React/Vite, BE Next.js, MongoDB.

## Điều người dùng nhận được

Input ví dụ: “AI phát hiện ung thư từ ảnh”. Cho chọn Thư viện / Trên mạng / Cả hai. Output là các bài thật, tên/tác giả/năm/abstract/nguồn/DOI hoặc ID nguồn, điểm cosine và điểm xếp hạng học máy nếu model đã được nghiệm thu. Chọn node mở bài trong sách; nút nguồn mở trang của nhà xuất bản/kho nghiên cứu; PDF chỉ hiện khi có link truy cập phù hợp, không hứa tải mọi bài miễn phí.

Train model không thay thế bộ kết nối nguồn, không tự cập nhật bài mới và không biến toàn Internet thành dữ liệu đã học. Mình lưu metadata/vector trong MongoDB; model lưu trọng số học từ các cặp truy vấn/bài được đánh giá.

## Luồng tìm kết hợp

1. Kiểm tra câu hỏi/bộ lọc và giới hạn request.
2. Tìm nội bộ ngay; đồng thời gọi các adapter nguồn đã bật, mỗi nguồn có timeout/cache/rate limit.
3. Chuẩn hóa kết quả, gom trùng theo DOI trước, ID nguồn sau; không gom hai bài chỉ vì tên giống. Giữ provenance gồm tất cả nguồn tìm thấy.
4. Bài có abstract: tạo embedding từ title+abstract, dùng cùng model/version và query embedding để chấm cosine. Bài thiếu abstract: ghi rõ chỉ title, không bịa abstract hoặc đánh đồng mức bằng chứng.
5. Model xếp hạng tự train (khi đã có) chấm lại tập ứng viên, không duyệt toàn web. Không hứa tìm được bài ngoài tập ứng viên API trả về.
6. Trả kết quả nội bộ và bổ sung nguồn ngoài; báo trạng thái từng nguồn và cho hủy truy vấn. Một nguồn lỗi không làm mất toàn bộ kết quả nội bộ.
7. “Lưu vào thư viện” lưu metadata/vector/provenance; bản offline dùng dữ liệu đã lưu. Không tự train lại mỗi lần nhấn tìm.

## Nguồn ưu tiên

| Nguồn | Cách lấy | Phạm vi |
|---|---|---|
| OpenAlex | API works/search | Metadata đa ngành, DOI, nguồn và liên kết truy cập |
| arXiv | API metadata | Preprint/title/abstract/tác giả/link gốc |
| Semantic Scholar | Academic Graph API | Tìm paper/abstract/IDs/citations tùy trường được cung cấp; cấu hình key và hạn mức |
| Google Scholar | Nút mở truy vấn trên Scholar | Không coi là API tự động của ứng dụng, không crawl/né CAPTCHA |

Người dùng nói “scholarship”; trong ngữ cảnh này hiểu là Scholar/tìm học thuật, không phải tìm học bổng. Nguồn ngoài không đảm bảo phủ mọi website, mọi abstract hoặc full text. API key/hạn mức tùy nguồn, cần kiểm tra lại khi triển khai; không nhúng key vào FE, bundle, log hay query người dùng nhìn thấy.

Nguồn tham khảo chính thức đã đối chiếu04/11/2026:

- https://help.openalex.org/api/
- https://help.openalex.org/api/authentication/
- https://info.arxiv.org/help/api/index.html
- https://api.semanticscholar.org/api-docs
- https://scholar.google.com/intl/en/scholar/help.html (không cung cấp bulk access; yêu cầu tôn trọng robots)

## Model tự train bằng JS/TS

Đề xuất model nhỏ reranker nhận đặc trưng từ cặp vector query/paper và điểm cosine, học điểm liên quan từ nhãn người đánh giá. E5 giữ cố định, không tuyên bố tự train/fine-tune toàn bộ E5. Nếu giảng viên đòi toàn bộ encoder tự học từ đầu thì phải đổi phạm vi và đánh giá riêng; reranker không đáp ứng yêu cầu đó.

Training Node.js script TypeScript + @tensorflow/tfjs backend CPU JavaScript, tránh phụ thuộc tfjs-node/node-gyp có thể cần Python trong build. Chạy job riêng, không trong HTTP request Next.js. Sau train lưu model+weights+feature schema+version+data split hash+metrics. Inference đọc artifact local; model chưa có hoặc không đạt chất lượng thì giữ cosine và hiển thị rõ phương pháp đang dùng.

Dữ liệu học gồm câu hỏi, bài và nhãn liên quan. Tách train/validation/test theo query và kiểm tra paper/duplicate leakage. Không dùng điểm E5 gán nhãn rồi gọi đó là chất lượng đã được con người xác nhận. Chọn hard negatives trong cùng chủ đề, giữ nhãn và nguồn đánh giá. So sánh Recall@K/MRR/nDCG với cosine baseline trên tập kiểm độc lập. Không bảo đảm reranker tốt hơn trước khi đo.

Phân biệt điểm: cosine [-1,1] khác score reranker; không đổi nhãn một score thành cosine hay phần trăm chính xác. Nếu dùng màu theo reranker phải công bố quy tắc mới và version, không tái dùng ngưỡng cosine hiện tại một cách âm thầm.

Tài liệu TensorFlow.js: https://www.tensorflow.org/js/guide/nodejs và https://www.tensorflow.org/js/tutorials.

## API/dữ liệu cần thiết kế thêm

API đề xuất riêng v2, không sửa âm thầm contract v1 đang chạy:

- POST /api/v2/search: query, scope=library|online|combined, filters, sources, topK; kết quả gồm papers, scores, source statuses và warnings có nghĩa.
- POST /api/v2/library/papers: lưu bài đã chuẩn hóa, cần xác thực/quyền ghi.
- POST /api/v2/relevance-labels: ghi queryId/paperId/label cho người đánh giá, phân quyền; không coi mọi click là nhãn đúng.
- GET /api/v2/models/active: version và chất lượng có thể công bố, không lộ đường dẫn/key.

Collections đề xuất: papers (canonicalId/DOI/providerIds/title/abstract|null/sourceUrls/provenance/fetchedAt), embeddings (paperId/modelRevision/textHash/vector), searchCache (queryHash/provider/expiry), relevanceLabels, modelVersions. Schema runtime xác thực URL https/độ dài/năm/ID, HTML hiển thị dưới dạng text; abstract vắng là null, field chưa truyền trong DTO là undefined, không bịa nội dung.

Hiện corpus/snapshot được nhúng tĩnh và validate cùng version, repository cache toàn bộ dataset trong process. Vì vậy dữ liệu online không thể chỉ append vào một array rồi coi là hoàn tất. Cần tách index sống, snapshot offline có version và cơ chế refresh; dùng chung PCA projection hoặc công bố lần fit lại. Cần tổng quát ID arXiv sang canonical/provider IDs trước khi nhận DOI/OpenAlex. Ảnh hưởng tới core, Mongo indexes, API DTO, storage, graph và UI đọc, nên phải kiểm hợp đồng và offline thật.

## Host thật

Phương án đề xuất: một VPS/máy chủ chạy thường trực, có lưu trữ bền vững. Web server phục vụ Vite dist, reverse proxy /api đến Next.js Node nội bộ; MongoDB có user/quyền, nằm mạng riêng/loopback, không mở public27017. Model/weights cài trước và giữ trên đĩa, worker inference riêng. Training/job nhập dữ liệu chạy tách với API; không train lại khi server khởi động.

Internet → tên miền HTTPS443 → web server → Vite assets hoặc Next.js API → Mongo/worker → API nguồn bên ngoài.

Next.js khuyến nghị reverse proxy khi self-host: https://nextjs.org/docs/app/guides/self-hosting. Vite preview chỉ preview local, không dùng làm web server production: https://vite.dev/guide/static-deploy.html.

Caddy có thể quản lý HTTPS/chứng chỉ: https://caddyserver.com/docs/automatic-https. Cấu hình cuối phải khớp tên miền/DNS và cách cấp chứng chỉ. Yêu cầu phục vụ web chính là443; nếu không cho mở80 thì chọn TLS-ALPN443 hoặc DNS challenge phù hợp và kiểm chứng, không giả định cấu hình mặc định đã đáp ứng. Web server/DB là phần mềm hạ tầng; mã ứng dụng/train vẫn JS/TS. Không đưa service Mongo hiện tại không auth ra Internet.

Trước public: rate limit/quota theo người dùng, auth cho ghi/train/admin, request/body/time limits, provider backoff, secret server-side, CSP và kiểm URL, backup/restore, health/logs không chứa secret, quản lý version và rollback. Mở link nguồn sang tab mới với rel phù hợp. Offline vẫn tra thư viện/cache đã tải; chưa tải PWA lần đầu thì không thể dùng offline, mất mạng không thể lấy bài mới từ nguồn ngoài. Máy client mất mạng và backend mất mạng là hai tình huống cần kiểm riêng.

Để deploy thực tế còn cần lựa chọn/tài khoản máy chủ, tên miền hoặc URL public và quyền cấu hình DNS/secret. Chưa mua tài nguyên hay xuất bản ở mốc này, chưa có URL production. Dung lượng RAM/CPU/storage phải đo với worker/model/query thật trước khi chốt gói; không đưa cam kết giá/FPS/latency chưa kiểm.

## Thứ tự thực hiện

1. Tổng quát schema/ID, adapter nguồn đầu tiên và hợp đồng v2, kiểm dữ liệu thật + nguồn lỗi/429/cache/trùng bài.
2. FE chế độ Library/Online/Combined, node/sách dùng kết quả động, link gốc/PDF đúng, hủy request cũ và offline.
3. Tập nhãn có người đánh giá, baseline, train JS/TS và kiểm chất lượng trên held-out test.
4. Tích hợp model có version vào pipeline; chạy regression/E2E/performance trên dữ liệu lớn hơn.
5. Chuẩn bị bundle production, cấu hình máy chủ/DB/HTTPS443, kiểm restore và public smoke rồi deploy.

Mỗi module mới có README, catalog hàm/biến và log AI phát triển thực; runtime prompting test chỉ áp dụng nơi thực sự có prompt. Huấn luyện và tìm nguồn độc lập nên có thể phát triển song song về mặt module; không cần chờ train để xây online search hoặc deploy bản E5 baseline.
