# POST /api/v3/research

Route module có 1 hàm có tên: POST(request: Request). runtime=nodejs. Request strict JSON: query2..300, scope library|online|combined, topK1..20, group/year tùy chọn. Chặn Content-Type sai415, JSON lỗi400, field/kiểu/năm sai422, body>8192byte413, tải vượt giới hạn429, embedding/dataset không chạy được503. Thành công200 với dataset/result/providers/research/storage/warnings.

active là số request đang chạy, tối đa2; requests là timestamps của20lượt/phút gần nhất, tự loại phần tử quá60s. Giới hạn theo tiến trình, chưa theo tài khoản/phân tán. finally giảm active kể cả lỗi. Model sinh/planner/rerank lỗi có thể trả fallback trung thực; lỗi embedding không bị đổi thành lexical thuần.

Không nhận URL nguồn tùy ý hoặc credential từ client. Không gọi Python hoặc train trong HTTP. Kiến trúc và persistence ở lib/rag/README.md, docs/12-rag-architecture.md. Unit và E2E validation/RAG nằm tests; kết quả docs/verification.md. Nhật ký phát triển ở apps/api/ai-development-log.jsonl; prompt runtime ở .local/rag-prompts.json.
