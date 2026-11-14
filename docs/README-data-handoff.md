# Bàn giao dữ liệu JSTS cho nhóm trưởng

Nhánh review dữ liệu là `data/jsts-data-engineering`. Nhánh `data/arxiv-7500` lưu phiên bản nguồn. Hai JSON chuẩn trong `datasets/arxiv-7500/` chứa metadata, title và abstract của 7.500 bài, cùng snapshot embedding 384 chiều và tọa độ PCA.

## Đọc và kiểm

1. Đọc [hướng dẫn tái lập](data-engineering-handoff.md) để biết lệnh xuất, import review MongoDB, rollback và kiểm trên trình duyệt.
2. Đọc [schema artifact](data-02a-arxiv-artifacts.md) để kiểm checksum, thứ tự hàng và cách ghép `id` với `paperId`.
3. Với một thư mục đích mới, chạy từ gốc repo:

```sh
node scripts/export-arxiv-artifacts.mjs --out-dir .local/data-review/run-1
node scripts/validate-arxiv-artifacts.mjs --artifact-dir .local/data-review/run-1
node --test tests/arxiv-artifacts.test.mjs
```

Để kiểm ứng dụng, dùng replica set MongoDB review riêng và chạy dry-run trước khi import. `GET /api/v1/dataset` trả corpus và snapshot cùng phiên bản, kèm graph top-20 khi cấu hình đúng artifact. Dữ liệu xuất, toàn văn tải về và model chạy cục bộ nằm dưới `.local` hoặc theo cấu hình trong hướng dẫn tái lập.

## Phạm vi dữ liệu

Bundle chính phục vụ tìm kiếm trên title và abstract, cùng đồ thị PCA. Pilot toàn văn ar5iv trong báo cáo có 103 bài và 6.475 đoạn. Phiên bản gốc arXiv của pilot chưa được xác minh. Benchmark hiện đo truy xuất title và abstract. Dữ liệu này đi qua API v1. Mapping từ ID corpus sang Document UUID của FR17 và FR20 vẫn là phần tích hợp riêng.
