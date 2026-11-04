# Cập nhật hồ sơ và kiểm vận hành

Bằng chứng mới ở [15-testing-resilience.md](15-testing-resilience.md) và [evidence/project-update.json](evidence/project-update.json):116unit vàtypecheck chạy lại đạt;load120/120,soak45/45trong180s,burst2HTTP200+10HTTP429;backendRAGlibrary khi chặnfetchngoài trả200;NodeTLS443 vàNginx443/TLS1.3/auth401/200 đạtlocal. Bản trình bày26slide cóPPTX/PDF. Cataloghiện201hàm cótên và1148khởi tạobiến, khôngcòngiớihạnđộdài/200dòng cũ. Chưapublicdomain; sốliệu dướiđâythuộc mốc0.7 trước cậpn hật hồsơ.

# Kiểm chứng Paper Magic 0.7 — ngữ nghĩa và RAG cục bộ

Ngày 04/11/2026. Kiến trúc, luồng, API, CSDL và giới hạn: docs/12-rag-architecture.md. Root/web/API lên 0.7.0 (minor): thêm endpoint v3 và chức năng RAG, giữ v1/v2 tương thích. Dependency không đổi; không tự train model.

## Kết quả mới nhất

| Kiểm tra | Kết quả |
|---|---|
| pnpm test | 116/116 unit, 9 file; thêm 19 case RAG so với mốc đọc 97 |
| pnpm typecheck | Core/web/API đều đạt |
| pnpm build | Vite + Next production đạt; SW tạo lại; có /api/v3/research |
| E2E trên http://127.0.0.1:8080 | 21/21 đạt, 1.9 phút; không tự động retry |
| Live nguồn/model/Mongo | 3 câu tự nhiên trả HTTP 200; 2 có diễn giải hợp citation, 1 chỉ trích đoạn vì output không hợp lệ |
| Evidence | Cả 3 live case: quote đúng substring theo start/end, vector 384D, ID citation thuộc evidence |
| Offline inference | Chặn global fetch: 3 model chạy được, 0 lượt mạng, generator trả READY |
| Offline browser | Reload/tìm corpus và bài ngoài đã cache đạt; khôi phục asset bị thiếu trước khi tắt mạng đạt |
| Proxy cancellation | 12 request hủy với upstream chậm 100ms; web server vẫn trả 200 |
| Visual QA thật | 3 ảnh desktop/evidence/mobile; errors=[], không tràn ngang ở 390×844 |
| Mongo | 96 onlinePapers, 96 onlineEmbeddings, 15 ragRuns; index expiresAt có TTL |

Unit kiểm offset/overlap/chunk limit/title-only, hybrid dense/BM25/RRF, cosine tách fusion, schema, prompt payload, citation/template, model và reranker failure, library không gọi provider. E2E mới dùng fixture để tái lập UI, không gọi fixture là inference thật. Live check riêng bằng scripts/check-research.mjs. Ảnh thật dùng capture-research.mjs, topK=6 để kiểm layout. Kiểm format/citation không chứng minh mọi nhận định đúng hoặc hiểu đúng mọi câu hỏi.

Phân theo mục đích có 8 nhóm kiểm chứng đang dùng: unit; E2E; tích hợp nguồn/model/Mongo thật; hợp đồng prompt/citation; offline; performance smoke; security/input/proxy smoke; visual QA. Các nhóm có thể dùng chung testcase, không cộng các nhóm thành một tổng mới. Prompt test hiện kiểm cấu trúc, mẫu sai và citation; chưa có bộ đánh giá ngữ nghĩa độc lập. Security smoke chưa phải pentest.

## Thời gian và dung lượng đo thực

Raw .local/research-live.json, topK=6:

| Câu hỏi | HTTP roundtrip | Body decoded | Mode |
|---|---:|---:|---|
| Nhận diện vùng bệnh trong ảnh y tế | 136ms | 967015 byte ≈944.35KiB | grounded-generation; response cache đã ấm |
| Giảm lỗi truyền thông tin lượng tử | 42933ms ≈42.93s | 1099281 byte ≈1073.52KiB | grounded-generation |
| Chạy mô hình lớn khi thiếu VRAM | 28233ms ≈28.23s | 1057594 byte ≈1032.81KiB | extractive; không giả có câu trả lời AI |

Roundtrip gồm HTTP qua 8080, lookup Mongo, model/truy xuất và serialize. Nguồn/embedding/response có thể đã có cache; 136ms không phải thời gian sinh câu trả lời mới. Quantum có 29 ứng viên/67 đoạn, GPU có 14 ứng viên/38 đoạn trong lần đo. Ba phép thử không phải benchmark chất lượng. Nguồn có thể trả bài sai ngành hoặc chưa được đánh giá khoa học; ứng dụng chưa kiểm chứng chất lượng xuất bản.

Sau 1 lượt làm ấm, 5 request giống nhau tuần tự (library/topK=6, response cache): p50=34.91ms, p95=p99=41.72ms; max body decoded 963334 byte ≈940.76KiB. p50 là trung vị. Percentile dùng nearest rank; chỉ 5 mẫu nên p95/p99 cùng giá trị lớn nhất, không đủ đánh giá tail latency. Body là JSON chưa nén, gồm cả corpus/vector cho scene và offline, không phải riêng câu trả lời. kB=1000 byte; KiB=1024 byte; ms=1/1000 giây. Chưa thử tải đồng thời, FPS, 20k bài hoặc đo GPU.

Build cuối: main680.34kB (gzip255.45), scene37.47kB (14.79), Three552.66kB (136.19), CSS48.58kB (10.82). Gzip là thống kê build, không thành kích thước truyền nếu server chưa bật nén. Còn warning chunk>500kB. Model bổ sung Qwen3≈885.2MiB và reranker≈22.8MiB chỉ ở backend; SW browser vẫn dùng E5≈129.1MiB.

## Lỗi phát hiện và cách sửa

- Qwen2.5 thử nghiệm bỏ sót ý và sai JSON: chọn Qwen3 local theo revision cố định. Đây là đổi model có sẵn, không phải tự train.
- Model chép chuỗi mẫu: đổi prompt synthesis sang văn bản có [E…], chặn placeholder và citation bịa, thêm unit. Ví dụ GPU trả [O1] ngoài context bị loại, giữ mode extractive.
- Tìm theo từ nhầm chữ viết tắt sang ngành khác: prompt yêu cầu giữ ngữ cảnh và mở rộng acronym; thêm cross encoder đọc cặp query–passage. Reranker vẫn có thể sai; chưa coi mọi trường hợp đã được giải quyết.
- Proxy dừng khi response đóng trước upstream trả: kiểm destroyed/writableEnded và hủy upstream theo client. Phép thử 12 cancellation đã đạt.
- Bài đã lưu biến mất sau reload vì danh sách bị giới hạn topK: khi chưa tìm, lấy bookmark trực tiếp từ activeCorpus. E2E lưu/reload đã đạt lại.
- Một lượt E2E có 18/20 đạt: lỗi bookmark trên và offline 503 vì cache thiếu shell. Thêm handshake kiểm đủ asset, sửa cache thiếu trước khi báo sẵn sàng offline; UI thể hiện trạng thái thật. Test chủ động xóa index rồi kiểm phục hồi. Bộ cuối 21/21 đạt, không bỏ test offline.

## Giới hạn và bằng chứng

RAG hiện đọc abstract/title, chưa đọc full PDF. Model nhỏ có thể trả tiếng Anh, hiểu sai điều kiện hoặc diễn giải quá mức. Citation đúng ID không chứng minh entailment (nội dung thực sự được đoạn nguồn hỗ trợ). Chưa có benchmark độc lập, fine-tune hoặc nghiệm thu 5.000–20.000 bài. Chưa public domain/HTTPS443/auth/RBAC.

Offline AI check chặn fetch trong 3 runtime, không ngắt mạng toàn OS hoặc kiểm toàn bộ backend offline từ browser. Browser offline dùng E5 dự phòng và ghi rõ chưa chạy model sinh/cross encoder. Scope library ở backend không gọi provider.

Raw local: research-live.json, research-browser.json, research-performance.json, rag-offline.json, rag-mongo.json, proxy-cancellation.json. Prompt thật: .local/rag-prompts.json. Self review, chưa reviewer độc lập. Catalog AST cuối: 195 hàm có tên và 964 giá trị gán ngắn; không tính mọi callback vô danh. Các phần mốc0.6 bên dưới là lịch sử.

## Cập nhật giao diện đọc, 04/11/2026

Đã chạy lại sau khi thay thiết kế trang sách và Góc đọc; chi tiết docs/11-reading-experience.md.

| Kiểm tra mới nhất | Kết quả |
|---|---|
| pnpm test | 97/97 unit, 8 file |
| pnpm typecheck | Core/web/API đều đạt |
| pnpm --filter @paper-galaxy/web build | Đạt, tsc + Vite; sau đó tạo lại SW |
| E2E_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e | 17/17 đạt, 1.2 phút; production Node web server |
| Ảnh QA | 6 ảnh desktop/mobile; pageerror=[], không tràn ngang ở 390×844 |
| Link PDF seed | U-Net → https://arxiv.org/pdf/1505.04597; kiểm href, không tải/kiểm nội dung PDF |
| Thiếu PDF ở nguồn OpenAlex | Không tạo nút/link PDF giả; vẫn mở được đúng trang gốc |
| Offline regression | Reload/tìm corpus và bài ngoài đã cache đều đạt trong bộ E2E |

Thêm một unit kiểm thiếu abstract và số trang tăng theo nội dung; thêm một E2E phân biệt hồ sơ/abstract với toàn văn, nhãn online/offline và nguồn không có PDF. Đã xem trực tiếp ảnh bìa sách, Góc đọc desktop, mobile và phần mở nguồn. Phát hiện dòng giải thích bị CSS ẩn theo intro>p; đã sửa selector và chụp/chạy E2E lại, dòng này hiện được cả desktop/mobile.

Build giao diện cuối: main672.46kB (gzip253.17), scene37.47kB (14.79), Three552.66kB (136.19), CSS45.07kB (10.09). Đây là kích thước build, không phải số đo truyền qua mạng hoặc FPS; còn warning chunk>500kB. Không chạy lại benchmark mạng/API vì API/model không đổi; số đo nguồn/performance bên dưới thuộc lần kiểm mốc0.6 trước cập nhật giao diện. Chưa dựng PDF đầy đủ trong sách. Catalog AST mới:162 hàm có tên,793 giá trị gán ngắn. Raw .local/dossier-browser.json; ảnh .local/screenshots/dossier-*.png. Self review, chưa reviewer độc lập.

## Bằng chứng tích hợp mốc0.6 trước cập nhật giao diện

Ngày04/11/2026. Dự án C:\Users\TrngTrn\paper-magic. Tài liệu chức năng/API/CSDL: docs/10-online-running.md. Đây là kết quả đã chạy, không phải test plan. Self review, chưa reviewer độc lập.

## Kết quả chính

| Kiểm tra | Kết quả |
|---|---|
| pnpm test |96/96 unit,8 file|
| pnpm typecheck / build |Core/web/API typecheck và Vite+Next production build đạt|
| E2E bản cuối |16/16 đạt, khoảng1.4phút, Edge/Chromium, E2E_BASE_URL=http://127.0.0.1:8080|
| Nguồn thật |arXiv và OpenAlex đều200/ok,8 bản ghi mỗi nguồn|
| Inference thật |E5 Q8 local tạo384D, L2 chuẩn hóa, cosine và PCA từ projection gốc|
| MongoDB thật |onlinePapers và onlineEmbeddings upsert; lần kiểm cuối14 bài tích lũy trong cache Mongo|
| Query live |graph neural networks;12 ứng viên hợp nhất,8 kết quả được yêu cầu|
| Live URL ví dụ |The Graph Neural Network Model → https://doi.org/10.1109/tnn.2008.2005605|
| Offline |Bài ngoài corpus có thể lưu IDB, reload không mạng và tìm lại; mất API chạy browser model thật|
| Web server |Static assets+proxy Next trên8080; /.env404, traversal403, missing asset404, nosniff|
| HTTPS443 |Có code nhận cert/key, chưa có chứng chỉ/tên miền để nghiệm thu; KHÔNG tuyên bố đã public|
| Training |Chưa tự train model riêng. E5 pretrained, không gọi tạo vector là training|

16E2E chạy qua web server Node mới, không chỉ Vite preview.13 luồng cũ về API/book/camera/filter/offline/scene/phase vẫn đạt;3 luồng mới kiểm input v2, bài ngoài corpus/node/link/offline và online rỗng. E2E nguồn ngoài dùng fixture khai báo để tái lập; live smoke là phép thử khác, dùng Internet/model/Mongo thật.

## Các loại kiểm thử và phạm vi

1. Unit96case:math/vector/PCA/search/contracts/state machine/link graph và13case mới cho chuẩn hóa provider/DOI/missing abstract/URL/input/cache/429/partial failure/merge dataset.
2. E2E16case:browser→web server→API→data→book; luồng online deterministic kiểm render/schema/cache/selection bằng fixture, không gọi fixture là model thật.
3. Live integration: scripts/check-online.mjs gọi2 API thật, model thật, kiểmnorm/dimension và đọc countMongo; raw .local/live-online.json, .local/online-report.json. Cần Internet, không phù hợp chạy liên tục trong CI không mạng.
4. Performance smoke:5 warm request tuần tự cùng query qua8080; đo ms/bytes, điều kiện bên dưới. Chưa load/concurrency20k hay GPU/FPS.
5. Security/input smoke:strictDTO/body8KiB/type/media; URL nguồn cố định, nguồn trả≤2MB/timeout10s; route v2 đồng thời≤3/20lượt mỗi phút/process; static/proxy traversal/dotfiles/nosniff. Đây chưa phải pentest/auth/RBAC hoàn chỉnh.
6. Prompt contract:runtime chỉ query/passsage prefix embedding. Unit embeddingText kiểm passage/title-only. Chưa có generative LLM/prompt sinh trả lời nên không bịa bộ prompting test hoặc nhật ký inference chatbot.

## Kết quả đo và ý nghĩa chỉ số

Live query graph neural networks, chưa có cache nguồn sau restart API, qua Node web server8080:

- Tổng3,211.52ms (khoảng3.21s), gồm nguồn+model/query/passage+ranking+snapshot/Mongo; không phải chỉ thời gianGPU.
- arXiv213.73ms, OpenAlex1,558.02ms; hai nguồn gọi đồng thời, không cộng hai thời gian để suy ra tổng.
- Response decoded466,296byte, khoảng455.37KiB; có corpus/vector snapshot để vẽ và offline nên lớn hơn list metadata.
- Top example cosine≈0.904; không phải90.4% chính xác. Bài thiếu abstract tính chỉ title và có warning.

Warm-cache5lượt cùng query, source/model cache đều ấm, gồm Mongo upsert và transfer snapshot:

| Chỉ số | Đo |
|---|---:|
| p50 |21.37ms|
| p95 |79.68ms|
| p99 |79.68ms|
| Body decoded lớn nhất |466,272byte ≈455.34KiB|

p50 là trung vị; p95/p99 là percentile của5mẫu theo nearest rank, vì mẫu ít nên cùng max. Không suy ra độ ổn định tail latency hoặc tải thực. Không coi warm-cache21ms là thời gian lấy bài mới từ Internet. kB=1000byte,KiB=1024byte,ms=1/1000giây. Raw .local/online-performance.json; chưa nén gzip ở Node static server hiện tại.

Build cuối: main667.61kB(gzip251.80), scene35.66kB(14.01), Three552.66kB(136.19), CSS37.83kB(8.62). Gzip là thống kê build, chỉ thành kích thước truyền nếu server/proxy bật nén. Model/tokenizer129.1MiB; các WASM/cache đầu lớn. Còn warning chunk>500kB, chưa benchmark FPS/GPU/coldbrowser đa thiết bị hoặc5.000–20.000 bài.

## Các lỗi phát hiện trong phiên

- E2E loader yêu cầu JSON import attribute: sửa import type=json, rồi chạy lại.
- Một lượt bộ cũ15/16 qua, offline reload net::ERR_FAILED; chạy riêng lại qua. Đã chuyển SW sang lookup đúng cache phiên bản hiện tại và báo503 nếu chưa cài đủ tài nguyên, sau đó toàn bộ16/16 qua. Không bỏ testcase offline.
- Smoke static ban đầu /.env trả SPA index200 (không lộsecret); thêm chặn dotfile, chạy lại /.env404 và encoded traversal403 đềuđúng.
- Trang giấy còn ghi arXiv cho IDOpenAlex: sửa provider label và ID thành dòng riêng.
- Điều kiện thiếu abstract không được giả rằng model đọc nội dung đầy đủ; chuẩn hóa provenance và embeddingText title-only.

Browser live: scripts/capture-online.mjs → .local/online-browser.json, không pageerror; node12, selected oa:W2116341502, linkDOI đúng. Ảnh .local/screenshots/online-book.png và online-results.png. Test động tạo đúng vector/queryPoint cho các bài ngoài corpus; validatebundle trước nhận; projection gốc giữ nguyên để điểm không đổi ngẫu nhiên mỗi truy vấn.

## Phạm vi đã có và chưa có

Có chọn Thư viện/Trên mạng/Cả hai, source status/warnings, chuẩn hóa arXiv/OpenAlex, cache/rate/error, dedupID/DOI, passage embedding thật, v2 search, Mongo online cache, IDB v2 giữ bookmark cũ, offline sau cài, link nguồn/PDF nếu có, Node web server phục vụdist/proxy.

Chưa tự train/reranker, chưa SemanticScholar adapter/GoogleScholar scraping, chưa5.000–20.000 bài/quality benchmark độc lập, chưa account sync/auth/RBAC/backup nghiệm thu, chưa publicdomain/chứng chỉHTTPS443. Mongo hiệnloopback khôngauth/TLS; không đưa cấu hình này public. Cache Mongo online chưa có endpoint đồng bộ toàn bộ sang tài khoản; reload trên cùng browser dùngIDB. Phân loại lĩnh vực ngoài là heuristic, cần cải thiện riêng.

Tối đa8 bản ghi/nguồn và12 bài mới mỗi query; recall giới hạn bởi API ứng viên. Chế độcombined thêm corpusgốc; offline dùng dữ liệu đã có. NếuAPIv2mất, UI báo fallback nội bộ; không thể lấy bài mới khi backend/nguồn mất mạng. CacheIDB hiện tăng theo dữ liệu đã tìm, quota lỗi có cảnh báo; chưa eviction theo tài khoản.

Mã chương trình/application scripts JS/TS, khôngPython. Node nativeONNX/WASM/modelweights làruntime/asset đã cài, không code train từ đầu. App/web/API lên0.6.0; dependency/modelrevision giữ nguyên. Mỗi module mới cóREADME/logAI, catalogAST ghi hàm/biến thực tế. Không tự đánh đồng96unit+16E2E với252kịch bản kế hoạch cuối môn.
