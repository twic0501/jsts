# Semantic client — JS/TS, không Python

`client.ts` quản worker, giới hạn queue, timeout và cache query. `embedding.worker.ts` chạy Transformers.js4.3.2 E5 Q8 bằng WASM từ cùng origin. Remote models và cache riêng của Transformers đều tắt; service worker chịu trách nhiệm cache app/model/WASM theo phiên bản để tránh trộn model cũ.

Prefix query: `query: `; mean pooling + L2. Corpus passages được chuẩn bị bằng cùng model và có prefix `passage: `. Tokenizer giới hạn512 token theo cấu hình model. Không có dịch từ khóa thay embedding.

Lần cài đầu cần mở bản build khi còn kết nối tới máy phục vụ để cache129MiB model và runtime. Nếu thiếu asset, worker báo lỗi; không giả kết quả semantic bằng TF-IDF. Worker inference không chặn luồng vẽ Three.js.

Test model thật: scripts/check-browser-semantic.mjs và E2E “mất API” / “production offline”. Log phát triển xem ai-development-log.jsonl; không có LLM sinh câu trả lời trong module này.
