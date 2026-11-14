# JSTS Data Engineering · Tái lập và bàn giao

Commit nền `bfb4b63324310cd5486e53f3e0833e80962d51c7` trên `data/audit-script`. Nguồn `data/arxiv-7500` tại `d3a9d31044bdaf78e65e42c0bef93d259318562b`. Bằng chứng DATA-01 chốt baseline LF; `source-before.json` và `source-after.json` ghi cả raw và LF. Patch chính gồm DATA-02A và các mục tiếp theo. Patch closeout và bằng chứng DATA-01 có trong ZIP. Thử bằng Node 24.12.0, pnpm 11.25.0 và MongoDB 8.0.16.

## DATA-02A và DATA-02B

Xem [schema DATA-02A](data-02a-arxiv-artifacts.md). Chạy các lệnh từ gốc repo, tạo thư mục cha trước và dùng đích mới cho mỗi lần chạy.

~~~powershell
$root = '.local/data-engineering'
New-Item -ItemType Directory -Path $root -Force
node scripts/export-arxiv-artifacts.mjs --out-dir "$root/export-a"
node scripts/validate-arxiv-artifacts.mjs --artifact-dir "$root/export-a"
node scripts/export-arxiv-artifacts.mjs --out-dir "$root/export-b"
node scripts/validate-arxiv-artifacts.mjs --artifact-dir "$root/export-b"
node scripts/export-arxiv-neighbors.mjs --artifact-dir "$root/export-a" --out-dir "$root/neighbors"
$env:JSTS_NEIGHBOR_GRAPH = "$root/neighbors/neighbors-7500.json"
$env:JSTS_NEIGHBOR_EMBEDDINGS = "$root/export-a/embeddings-7500.f32le"
node --test tests/arxiv-artifacts.test.mjs tests/arxiv-neighbors.test.mjs
~~~

Đồ thị top-K có hướng với **K = 20**, theo giới hạn cao nhất của endpoint neighbors v1. Hàng `{paperId, neighbors: [{paperId, cosine}]}` theo thứ tự snapshot. Loại chính bài trước khi xét cạnh. Xếp cosine giảm dần, khi bằng nhau xếp ID đích tăng dần theo thứ tự ordinal. Cosine tính trên vector Float32 little-endian 384D với norm riêng mỗi hàng và tích lũy bằng Number. Một cặp được tính một lần rồi xét độc lập cho mỗi chiều. Giữ đủ 20 kết quả mỗi hàng. Điểm PCA 3D dành cho hiển thị.

Header đồ thị ghi hash input, embeddings, manifest DATA-02A, phiên bản corpus và quy ước xếp hạng. Test đối chiếu cosine và full sort độc lập trên fixture và 12 hàng trải toàn corpus, kiểm ID/độ dài/thứ tự ở mọi hàng. `manifest.json` trong ZIP ghi byte, SHA-256 và lệnh tái tạo file lớn.

## DB-01 và DB-02

Giữ tên collection và DTO repository. BSON Binary subtype 0 lưu vector đúng 1.536 byte. Server-side validators kiểm shape và kích thước vector. Importer kiểm 2.880.000 thành phần Float32, textHash và PCA, rồi đọc lại toàn bộ hàng trong transaction trước khi đặt active. `fetchedAt` của bao corpus dùng `createdAt` snapshot vì metadata gốc thiếu thời gian cấp corpus.

| Collection | Nội dung và khóa |
| --- | --- |
| `datasets` | `_id: "jsts-active"`, unique partial trên `active: true`. `storageSchema`, `version`, `count`, fingerprint, model, PCA và snapshot metadata. |
| `papers` | DTO từ `paperSchema`, cùng `datasetVersion` và `row` nội bộ. Unique `(datasetVersion, id)` và `(datasetVersion, row)`. Index `(datasetVersion, group, year DESC)`. |
| `embeddings` | `paperId`, `textHash`, vector, `point`, `datasetVersion` và `row`. Unique `(datasetVersion, paperId)` và `(datasetVersion, row)`. |

Một review database chứa một bản active. Corpus đã import được xác minh lại và trả `unchanged`. Dữ liệu ngoài bộ, collection unrelated hoặc cấu trúc legacy bị từ chối khi import. BM25 DATA-03 chạy độc lập trên title + abstract. Collection online/RAG không thuộc thao tác import.

Hãy dùng replica set loopback riêng với URI `mongodb://127.0.0.1:<port>/jsts_data02_review_<name>`. Harness tạo replica set tạm và không đọc `MONGODB_URI` để chọn đích. Đặt `--system-binary` nếu đã có mongod 8.0.16.

~~~powershell
node scripts/check-arxiv-mongo-integration.mjs --artifact-dir "$root/export-a" --neighbor-graph "$root/neighbors/neighbors-7500.json" --out-dir "$root/integration"
# Với URI từ replica set review tự khởi động
node scripts/import-arxiv-mongo.mjs --artifact-dir "$root/export-a" --uri $reviewUri --dry-run
node scripts/import-arxiv-mongo.mjs --artifact-dir "$root/export-a" --uri $reviewUri
node scripts/import-arxiv-mongo.mjs --artifact-dir "$root/export-a" --uri $reviewUri --rollback
node scripts/import-arxiv-mongo.mjs --artifact-dir "$root/export-a" --uri $reviewUri
node scripts/import-arxiv-mongo.mjs --artifact-dir "$root/export-a" --fallback-out "$root/fallback"
~~~

Chạy dry-run trước. Sao lưu bằng hai JSON nguồn và artifact đã xác minh cùng fingerprint. Transaction lỗi hủy hai bộ hàng và active pointer. Index và collection rỗng có thể còn lại để thử lại. Rollback xác minh fingerprint và nội dung, rồi xóa đúng phiên bản đang active trong một transaction. Import lại từ artifact để khôi phục. Quy trình dành cho DB review khởi đầu trống. Repository vẫn đọc seed legacy. Chế độ JSON mặc định dùng `data/`. Khi thử 7.500 bài, đặt `JSTS_DATASET_DIR` về thư mục fallback mới. Khi đã cấu hình Mongo mà đọc thất bại, API trả lỗi theo hợp đồng hiện có.

## DATA-03 · Benchmark title và abstract

~~~powershell
node scripts/evaluate-arxiv-ir.mjs --artifact-dir "$root/export-a" --out "$root/ir-report.json"
~~~

20 chủ đề, mỗi chủ đề một truy vấn EN và một truy vấn VI. Nhãn cấp paperId được chọn từ title/abstract trước khi chạy ranker. Điểm 2 là phù hợp trực tiếp, điểm 1 là bổ trợ hoặc gần chủ đề. Mục chưa chắc có trường `uncertain`. Đây là đánh giá thăm dò do một tác nhân gán nhãn, có truy vấn tra cứu bài đã biết và đề tài gợi từ corpus. Recall đo trên các bài đã gắn nhãn; trong phép tính, bài chưa có nhãn nhận gain 0. Hai bản ngôn ngữ dùng chung nhãn. Đọc kết quả tách EN/VI trong JSON. Corpus chỉ có hai tháng và title/abstract chủ yếu bằng tiếng Anh. Qrels chưa đo chunk hoặc chất lượng trả lời.

BM25 dùng title + abstract, `k1=1.2`, `b=0.75`, token Unicode chuyển thường và bỏ dấu. Dense dùng E5 q8 local theo revision của snapshot, prefix `query: ` và cosine 384D. Hybrid dùng weighted RRF, `k=60`, độ sâu 100 mỗi nhánh, trọng số Dense 1 và BM25 0,5 theo tỉ lệ hiện dùng trong RAG. Benchmark chỉ lập chỉ mục title và abstract. JSON ghi Recall/nDCG tại K = 3, 5, 10, MRR toàn danh sách ranker và MRR ở các cutoff, hạng từng query và hash của qrels, nguồn, embeddings.

## DATA-04 · Toàn văn thí điểm

Pipeline giữ HTML, PDF, text chuẩn hóa và chunk trong `.local`. Manifest ghi paperId, nguồn, phiên bản, checksum và mapping chunk. Chunk theo section, ưu tiên biên đoạn, tối đa 180 từ, overlap 35 từ, offset UTF-16. Parser PDF dùng text layer. Fixture kiểm HTML/PDF, 404/429, provenance, offset và canonical ID.

`export.arxiv.org` trả robots cấm cả hai định dạng. ar5iv xuất HTML đến hết tháng 10/2026 và công bố một bản chuyển đổi mỗi ID. Robots cho phép truy cập HTML. Pipeline chạy tuần tự, cách ít nhất 3 giây hoặc theo Crawl-delay cao hơn. Lần bổ sung chọn từ các bài tháng 10 chưa thử trong cùng corpus. URL canonical phải khớp paperId. Khi HTML thiếu revision, manifest ghi `versionVerified: false` và định danh nội dung bằng SHA-256. Toàn văn nằm ngoài ZIP. [ar5iv](https://ar5iv.labs.arxiv.org/) · [robots](https://ar5iv.labs.arxiv.org/robots.txt)

S3 chính thức dành cho PDF bulk yêu cầu AWS Requester Pays. Probe ẩn danh trả HTTP 403. Bản Cornell trên Kaggle cung cấp tệp metadata JSON. [Bulk PDF S3](https://info.arxiv.org/help/bulk_data_s3.html) · [Kaggle](https://www.kaggle.com/Cornell-University/arxiv?select=arxiv-metadata-oai-snapshot.json)

~~~powershell
npm install --prefix "$root/fulltext-tools" --no-audit --no-fund --ignore-scripts --save-exact unpdf@1.4.0 node-html-parser@7.0.1
node scripts/pilot-arxiv-fulltext.mjs --source ar5iv --out-dir "$root/ar5iv-pilot" --tools-dir "$root/fulltext-tools" --contact 'https://github.com/twic0501/jsts' --limit 100
node scripts/pilot-arxiv-fulltext.mjs --source ar5iv --backfill-from "$root/ar5iv-pilot/pilot-manifest.json" --out-dir "$root/ar5iv-backfill" --tools-dir "$root/fulltext-tools" --contact 'https://github.com/twic0501/jsts' --limit 45
$env:JSTS_FULLTEXT_TOOLS = "$root/fulltext-tools"
node --test tests/arxiv-fulltext.test.mjs
~~~

Có thể copy package.json và package-lock.json từ `fulltext-tools/` trong ZIP rồi chạy `npm ci --prefix "$root/fulltext-tools" --ignore-scripts`.

## INT-01 · Tích hợp dữ liệu

Route `/api/v1/dataset` trả corpus và snapshot trong một response. Harness chạy MongoDB và fallback JSON qua hai process Next, đối chiếu đủ 7.500 ID, tọa độ và 2.880.000 thành phần Float32 trên mỗi backend. Đặt `JSTS_NEIGHBOR_GRAPH` tới artifact DATA-02B cùng corpusVersion và SHA-256 embeddings để trả kèm đồ thị. Đồ thị được cache theo snapshot trong process. Restart API khi đổi dataset hoặc file đồ thị.

~~~powershell
node scripts/check-arxiv-browser-integration.mjs --fallback-dir "$root/integration/fallback" --neighbor-graph "$root/neighbors/neighbors-7500.json" --out "$root/browser-integration.json" --browser 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
~~~

Frontend chỉ kích hoạt bundle sau khi kiểm version, ID, vector và tọa độ. IndexedDB lưu nguyên bundle theo một key. Nếu API không dùng được, browser đọc bundle cache đã kiểm hoặc cặp đóng gói 30 bài. Browser smoke kiểm scene PCA 7.500 điểm, tìm kiếm E5, reload khi chặn API và từ chối một cặp sai version. Scene lấy kết nối từ đồ thị sparse để tránh quét toàn tập cho từng bài khi dựng cảnh. Bộ lọc hiện tại chi phối số node nhìn thấy. Payload JSON đầy đủ lớn, xem byte và thời gian tải trong report. Cold ở chế độ dev bao gồm biên dịch route.

Next có thể tái sinh `apps/api/next-env.d.ts` khi chạy smoke vì repo đang track file này. Giữ bản gốc của checkout sau khi đo.


## Bàn giao cho tích hợp

Nhánh bàn giao `data/jsts-data-engineering` được dựng trên `origin/main` tại `28056dd363bf74250b44e305bf61abb07b486723`. Các PR #6 và #7 cùng nhắm `main` và các PR tích hợp giao diện gần đây đã merge vào nhánh này. Snapshot dữ liệu được lấy từ nhánh nguồn `data/arxiv-7500` và kiểm lại với DATA-01. Commit bàn giao gồm hai JSON nguồn chính thức đã track trong nhánh nguồn. Các bản export, PDF/HTML tải về, model, ZIP và log chạy cục bộ nằm ngoài Git. Quy tắc LF trong `.gitattributes` lấy từ commit DATA-01 để bảo toàn baseline trên checkout mới.

### Hợp đồng dữ liệu để review

- Corpus `arxiv-selected-7500-c84a222b198a` đi cùng snapshot `semantic-e5-q8-v1`. Ghép `id` với `paperId`, theo thứ tự snapshot khi đọc artifact. Tìm kiếm và đồ thị dùng cosine của vector 384D. PCA 3D phục vụ hiển thị.
- `GET /api/v1/dataset` trả `{ dataset: { corpus, snapshot }, storage, neighbors? }`. `neighbors` là mảng sparse top-20 theo thứ tự snapshot khi server cấu hình đúng `JSTS_NEIGHBOR_GRAPH`. `storage` là `json` hoặc `mongodb`. Các route v1 hiện có giữ hợp đồng cũ.
- API đọc MongoDB khi có `MONGODB_URI`. Chế độ JSON đọc cặp mặc định trong `data/` hoặc cặp cùng phiên bản trong `JSTS_DATASET_DIR`. Browser kiểm bundle trước khi sử dụng và lưu trọn bundle vào IndexedDB. Khi API không dùng được, browser đọc lại cache đã kiểm hoặc cặp 30 bài đóng gói.
- File API để review gồm `apps/api/app/api/v1/dataset/route.ts`, `apps/api/lib/repository.ts` và `apps/api/next.config.ts`. File frontend gồm `apps/web/src/App.tsx`, `apps/web/src/library-dataset.ts`, `apps/web/src/storage.ts`, `apps/web/src/scene/MagicBook.tsx` và `apps/web/src/scene/create-book-scene.ts`.

### Dữ liệu cho bước thiết kế API

Bundle JSON đầy đủ đo được khoảng **85 MB** và thời gian tới cảnh 3D đầu tiên khoảng **10,7 giây** trong môi trường dev trước tích hợp. Mốc browser là 10.741,7 ms. Kích thước JSON được đo từ response, gồm corpus, snapshot và graph. Đây là mốc dev để thiết kế API. Thiết kế API mới và tối ưu tải lần đầu thuộc công việc tiếp theo.

DATA-04 là pilot HTML ar5iv với **103 bài**, **6.475 chunk** và **0 phiên bản gốc arXiv được xác minh**. Manifest xác nhận paperId và SHA-256 của nội dung tải. Phạm vi là HTML chuyển đổi đã thu được và có thể kiểm lại cục bộ. S3 chính thức cần AWS Requester Pays để làm bước xác minh phiên bản gốc.
