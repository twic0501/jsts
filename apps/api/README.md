# API — Next.js Route Handlers / TypeScript

6 endpoint: health, corpus, POST semantic search, GET paper, neighbors và graph. `lib/repository.ts` đọc corpus/vector từ JSON hoặc MongoDB; kiểm textHash, dimension, norm, PCA và model revision. `lib/http.ts` chuẩn hóa response và lỗi, không lộ stack.

`lib/embedding.ts` điều phối worker Node. `embedding-worker.mjs` chạy model E5 Q8 bằng Transformers.js, chỉ đọc model local đã kiểm SHA256. Prefix query, mean pooling, L2; không Python. Mọi xếp hạng dựa vector gốc384D, không dựa tọa độ3D.

MONGODB_URI chỉ đọc ở backend. Không cấu hình thì dùng JSON và báo rõ nguồn. Đã cấu hình nhưng không đọc được DB thì trả 503. Corpus đọc xong được cache trong tiến trình ở bản cơ bản; seed lại cần restart API để nhận corpus mới.

Schema strict: query tối đa 300 ký tự, topK là integer 1..50, year 1900..2100, body tối đa 8192 bytes. Bản đầu chưa có auth / API ghi dữ liệu. Chỉ bind loopback khi dev/preview.

Theo AGENTS.md sinh bởi Next.js, đã đối chiếu guide Route Handlers trong package Next đúng version cài đặt.

Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.


Mốc0.7: POST /api/v3/research dùng module lib/rag; giữv1/v2 tương thích. Model sinh và reranker chạy local bằng Transformers.js, khôngPython hoặc dịch vụAI ngoài. Cache Mongo có onlinePapers/onlineEmbeddings và ragRunsTTL7ngày. Xem lib/rag/README.md và docs12. Log prompt runtime cục bộ có input/output thật; không có endpointpublic. Không tự train model.
