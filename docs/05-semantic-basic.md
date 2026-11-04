# 05 — Tìm kiếm ngữ nghĩa và bàn phù phép: bản 0.2.0

Ngày: 04/11/2026. Frontend **React/Vite**, backend **Next.js**, mã JS/TS. Không có script hoặc dịch vụ Python.

## Luồng đã triển khai

1. Đọc title + abstract gốc từ corpus 30 bài arXiv.
2. Gắn prefix `passage: `, chạy model `Xenova/multilingual-e5-small` Q8 bằng Transformers.js, mean pooling theo attention mask rồi L2 normalize.
3. Lưu vector **384 chiều** và textHash; MongoDB lưu float32 binary 1.536 byte/bài. Manifest khóa revision model và SHA256 từng file.
4. Query dùng prefix `query: ` và cùng model/pipeline. Không thay query bằng bảng từ khóa trong luồng semantic.
5. Lọc chuyên ngành/năm trước, tính cosine ở **384 chiều**, sắp score giảm dần rồi ID để ổn định. Điểm là [-1,1], không phải phần trăm chính xác.
6. PCA rút vector xuống 3 tọa độ: fit trên corpus, lưu mean/components/center/scale. Query dùng chính phép chiếu đã fit, không fit lại.
7. Bản đồ hiển thị mỗi bài bằng một điểm có tọa độ PCA, màu theo nhóm. Chọn điểm/list dùng cùng paper ID; cạnh nối lấy theo cosine gốc.
8. Chuyển sang bàn phù phép để mở bài: sách lơ lửng trên bàn khối đá tối/mặt đỏ/góc sáng; ký tự bay và thu về sách bằng toán số phức.

PCA hiện giữ tổng khoảng **24,12% phương sai** trong 3 trục. Giảm chiều mất thông tin: không kết luận liên ngành hoặc xếp hạng từ khoảng cách 3D. Phần “Lân cận liên ngành” chỉ đếm nhóm của 10 neighbors theo vector gốc.

## Chạy offline

- Mất Internet, backend còn: Next.js gọi model từ `.local/models` bằng worker Node; `allowRemoteModels=false`.
- Mất API: web worker chạy cùng model Q8 qua ONNX/WASM, không gọi dịch vụ AI trực tuyến. Dùng cùng snapshot vector/PCA và lọc/ranking TypeScript.
- Reload khi toàn mạng offline: dùng bản production đã cài cache lần đầu. SW giữ app, model và WASM cùng phiên bản. Không có fallback TF-IDF âm thầm; nếu model thiếu sẽ báo rõ chưa tìm được.
- TF-IDF vẫn còn trong code để so sánh baseline và các unit test cũ, không phải phương pháp hiển thị hiện tại.

## Các file dữ liệu

| File | Ý nghĩa |
|---|---|
| data/model-manifest.json | ID/revision, pipeline, SHA256 và bytes từng asset |
| data/semantic-snapshot.json | Vector, textHash, tọa độ và phép chiếu PCA |
| .local/models/Xenova/multilingual-e5-small | File model Node đã cài |
| apps/web/public/models | Cùng file model phục vụ trình duyệt |
| apps/web/public/wasm | WASM runtime local |

Model + tokenizer khoảng **129,1 MiB**; WASM là tài nguyên riêng. Chỉ bước setup cần mạng. Không commit model/runtime lớn vào Git; bản clone mới cần chạy setup trước.

Revision đã khóa: `761b726dd34fb83930e26aab4e9ac3899aa1fa78`. Backend kiểm SHA256 assets khi khởi tạo model, kiểm textHash corpus và model revision khớp snapshot. Snapshot ở browser được validate ID, norm, dimension, version và tọa độ PCA.

## Hàm chính mới

| Hàm | Trách nhiệm / giá trị quan trọng |
|---|---|
| normalizeVector(input, dimensions) | L2; reject zero / NaN / sai chiều |
| cosineSimilarity(a,b) | Dot chuẩn hóa, clamp sai số [-1,1] |
| fitPca3(vectors, seed=42) | Power iteration covariance, deflation trực giao, 100 vòng tối đa/trục |
| projectPca(vector, projection) | (x-mean)×components, trừ center và nhân cùng scale |
| validateSnapshot(corpus, raw) | 384D, norm≈1, unique ID, version và phép chiếu khớp |
| SemanticIndex.search(input, queryVector) | Filter / cosine / topK; query khác rỗng bắt buộc có embedding |
| SemanticIndex.neighbors(paper, limit) | Cosine passage–passage, loại chính paper |
| SemanticIndex.bridgeEvidence(paper) | Phân bố nhóm / entropy neighbors, chỉ gợi ý |
| embedQuery(query) | Worker Node, timeout45s, tối đa12 pending, cache100 query |
| embedQueryLocal(query) | Worker browser, timeout90s, tối đa8 pending, cache100 query |
| createEnchantingTable() | Geometry nguyên gốc; không tải asset Minecraft |
| scene.setMode(book/map), filter(ids), setQuery(point) | Đồng bộ hai chế độ, bộ lọc và điểm query |

Vector dimension384 không phải tọa độ chuyển động. Yaw/pitch/radius điều khiển camera; point.x/y/z là nội dung được giảm chiều. Glyph bay là hiệu ứng riêng, không giả làm các bài trên bản đồ.

## API Next.js hiện có

- GET /api/v1/health: nguồn dữ liệu, model, dimension và explained variance.
- GET /api/v1/papers: corpus.
- POST /api/v1/search: query, topK1..50, group?, yearFrom?, yearTo?; trả method semantic và queryPoint nếu có query.
- GET /api/v1/papers/[paperId]: chi tiết /404.
- GET /api/v1/papers/[paperId]/neighbors?topK=5: 1..20 neighbors, loại self và bridge evidence.
- GET /api/v1/graph: tọa độ PCA + model/version; không trả document nội bộ.

Tìm kiếm request sai trả400/413/415/422; model hoặc dữ liệu chưa sẵn sàng trả503. Bản cơ bản chưa auth/admin/HTTPS443; vẫn chỉ bind loopback, không tự mở Internet.

## Chất lượng ban đầu

Đã chạy 6 câu smoke bằng model thật với mọi lệnh gọi mạng bị chặn: MRR≈0,778; bài mong đợi nằm top3 ở5/6 câu. Câu về mạng đối kháng bằng tiếng Việt đứng hạng6, vẫn là hạn chế thực tế. Đây là bộ thử phát triển nhỏ, không phải tập đánh giá độc lập để cam kết chất lượng nghiên cứu. Raw output ở `.local/semantic-evaluation.json`.

## Nguồn kỹ thuật

- https://huggingface.co/Xenova/multilingual-e5-small
- https://huggingface.co/docs/transformers.js/en/custom_usage
- https://huggingface.co/docs/transformers.js/api/env
- Guide feature-extraction trong package Transformers.js4.3.2: tokenizer truncation mặc định, mean pooling dùng attention mask.
- Next.js Route Handlers guide đã đọc trong package16.4.5.
