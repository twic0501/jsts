# Script Node.js

Tất cả là `.mjs` chạy bằng Node, không Python.

| Script | Việc làm |
|---|---|
| dev.mjs | Chạy Vite và Next dev trên loopback, dừng các tiến trình con khi thoát |
| preview.mjs | Chạy bản Vite build và Next production |
| fetch-papers.mjs | Lấy metadata arXiv và tạo corpus, cần Internet khi chạy lệnh này |
| mongo.mjs | Tải lần đầu rồi chạy MongoDB local, giữ file dữ liệu |
| seed.mjs | Upsert corpus vào MongoDB, ID unique |
| build-sw.mjs | Sinh cache app/assets có version cho bản offline |
| document-code.mjs | Đọc AST TS, tạo catalog hàm/giá trị biến thực tế |
| capture.mjs | Chụp UI desktop / mobile bằng Playwright |
| debug-offline.mjs | Chẩn đoán request khi reload offline |

Dev/preview không phải dịch vụ public. `db:start` dùng MongoDB loopback không auth cho profile local ban đầu; chưa phải profile bảo mật HTTPS443 cuối môn.

capture-liquid.mjs: chụp idle/vortex/reading/abstract/mobile, báo lỗi console và overflow để kiểm tra giao diện 0.3.


capture-book-qa.mjs chụp giữa opening/turning và exit-reopen/release; report .local/book-visual-qa.json. capture-ritual.mjs chụp từng nhịp nhận chữ/portal; PAPER_MAGIC_MOBILE=1 kiểm mobile. log-ritual.mjs ghi log0.5 với hash và evidence đã chạy.


Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.

capture-dossier.mjs: chụp6 góc giao diện đọc U-Net trên desktop/mobile qua production8080, ghi lỗi JS/overflow/link PDF vào .local/dossier-browser.json. Chụp với reduced motion để kiểm layout; chuỗi chuyển động vẫn được kiểm trong E2E đầy đủ. Ảnh dossier-*.png không dùng làm asset sản phẩm.


Mốc0.7: setup-rag-model.mjs tải Qwen3Q4 hoặc --reranker MiniLMQ8 theo commit, sinh manifestSHA256. check-research.mjs kiểmv3 nguồn/model/Mongo thật, lưu .local/research-live.json. check-offline-ai.mjs chặn globalfetch và chạy3model local; không tương đương ngắt mạng toànOS. check-proxy-cancellation.mjs dùng upstreamchậm/12requesthủy, kiểm server sống. capture-research.mjs chụp3góc desktop/mobile dùngAPI/modelthật (topK6); ảnh chỉQA. Proxy đã xử lý responseđóng trước upstreamtrả, tránh crash pipeline.


Cập nhật hồ sơ: document-code thu mọi biểu thức khởi tạo biến, document-modules sinh số lượng/README/log theo module. test-resilience chạy processNext riêng với mạng ngoài bịchặn; test-https vàtest-nginx kiểm443local. Rawreport ởdocs/evidence, không có secret/model trongGit.
