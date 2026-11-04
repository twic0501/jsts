# Corpus khởi đầu

30 bài báo thật lấy qua arXiv API ngày 04/11/2026. `arxiv-*.atom` lưu response nguồn, `corpus.json` là snapshot ứng dụng. Title/abstract/authors/year giữ từ nguồn. `summary` tiếng Việt là diễn giải biên tập ngắn, không phải bản dịch toàn bộ abstract; `group` là mapping hiển thị, `categories` giữ taxonomy gốc.

11 AI, 6 sinh học, 7 y sinh, 6 vật lý. Số lượng này là mốc cơ bản, không nói đã có 5.000–20.000. Không có paper được sinh ra chỉ để tăng số lượng. URL nguồn xem ở từng record.

`pnpm data:fetch` cần Internet để cập nhật nguồn, có khoảng chờ 3,1 giây giữa các lần gọi. Việc đọc/search corpus không gọi lại arXiv. Sau đổi corpus cần build lại web và seed/restart backend để giữ cùng version.


RAG0.7 thêm rag-model-manifest.json (Qwen3-0.6B Q4) và rerank-model-manifest.json (MiniLM cross encoder Q8). Manifest ghi modelId, commit revision, dtype, byte và SHA256 từng file. Weights thật nằm .local/models; không thêm vào corpus và không phát tán vào cache frontend. Setup bằng JS tải theo commit, runtime kiểm hash và chỉ đọc local. Corpus gốc vẫn30bài; các bài lấy thêm nằm Mongo/IDB, không tuyên bố đã có20k. Xem docs12 và verification.
