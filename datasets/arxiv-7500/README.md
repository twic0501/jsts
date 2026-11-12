# Bộ dữ liệu bài báo JSTS — 7.500 bài

Dữ liệu phục vụ đồ án **phân tích độ tương đồng và tìm kiếm ngữ nghĩa trên tập tài liệu bằng không gian vector 3D**.

## File bàn giao

| File | Nội dung |
|---|---|
| `papers-selected-7500-with-summary.json` | Mảng bài báo: mã, tiêu đề, abstract, tác giả, năm, lĩnh vực, nguồn và summary tiếng Việt |
| `semantic-snapshot-selected.json` | Thông tin model, cấu hình PCA và mảng `papers` chứa vector/tọa độ từng bài |

Liên kết bằng **`papers[i].id` ↔ `snapshot.papers[j].paperId`**. Không mặc định hai mảng cùng thứ tự.

## Thông tin xử lý

- Bộ chính gồm 7.500 bài chọn ngẫu nhiên từ 10.000 bản ghi arXiv, seed `42`; không cân bằng đều theo lĩnh vực.
- Embedding dùng `Xenova/multilingual-e5-small`, revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, dtype `q8`.
- Pipeline: `e5-mean-l2-512-v1`, mean pooling, chuẩn hóa L2, **384 chiều**.
- Đầu vào tài liệu: `passage: ` + title + xuống dòng + abstract. Truy vấn dùng tiền tố `query: ` và cùng model/pipeline.
- `textHash` là SHA-256 của chuỗi đầu vào tài liệu trước khi cắt token.
- Có **171 bài vượt 512 token**; embedding chỉ sử dụng phần nằm trong giới hạn, abstract gốc không bị sửa.
- PCA fit chung trên bộ 7.500 vector, seed `42`, tạo tọa độ `point: {x, y, z}`. Ba thành phần giữ khoảng **7,18% phương sai**.
- Summary được sinh từ title + abstract, mục tiêu một câu tiếng Việt khoảng 20–30 từ; không phải tóm tắt toàn văn. Bộ summary có thể được tạo bởi nhiều model.

## Cách sử dụng

1. Đọc file bài báo như một mảng JSON.
2. Đọc snapshot; lấy cấu hình chung tại `model`, `projection`, `corpusVersion` và vector từng bài tại `papers`.
3. Ghép theo mã bài, kiểm tra số lượng, ID và `textHash` trước khi nhập.
4. Nếu nhập MongoDB theo ứng dụng hiện tại: lưu metadata vào `papers`; lưu `paperId`, `textHash`, vector và `point` vào `embeddings`; lưu phiên bản/model/PCA vào `datasets`.
5. Vector trong file là mảng số. Backend chuyển thành Float32 little-endian/BSON Binary khi nhập nếu giữ định dạng database hiện tại; MongoDB tự tạo `_id`.

Tính tương đồng trên **vector 384 chiều**, không dùng khoảng cách 3D thay thế. Tỷ lệ phương sai PCA không phải độ chính xác tìm kiếm. Chỉ đổi summary không cần tính lại embedding/PCA; đổi title hoặc abstract cần cập nhật dữ liệu liên quan.

## Kiểm tra trước khi nhận bàn giao

- [x] File bài có đủ 7.500 mã duy nhất và summary không rỗng.
- [ ] Đã đọc mẫu để kiểm tra summary đúng abstract, không trộn bài; xem lại các summary ngoài khoảng độ dài yêu cầu.
- [x] Snapshot có đủ 7.500 ID tương ứng, vector hợp lệ và tọa độ hữu hạn; hash nội dung khớp.

**Hai JSON đã được kiểm tra tự động:** đủ 7.500 summary không rỗng, không trùng nguyên abstract; ID/hash/vector/PCA khớp. Có 7.055 cảnh báo độ dài, không coi là lỗi bắt buộc. Chưa kiểm chứng nội dung mọi summary hoặc cập nhật MongoDB của người nhận.

## Phạm vi và lưu ý

- Hai file là dữ liệu **cấp bài từ metadata + abstract**, chưa chứa toàn văn, chunk hoặc embedding toàn văn cho RAG.
- Đã kiểm tra API đọc/tìm kiếm trên bộ 7.500 bài; chưa phải đánh giá chất lượng tìm kiếm đầy đủ hoặc nghiệm thu giao diện 3D.
- Frontend cần corpus/snapshot cùng phiên bản và tối ưu dựng liên kết khi hiển thị tập lớn. File bài là mảng, không thay trực tiếp cho `data/corpus.json` có object bao ngoài.
- Snapshot lớn có thể là JSON một dòng; đọc bằng code, không cần format toàn bộ trong VS Code.
- Gửi thêm `summary-provenance.json` và báo cáo xử lý nếu cần truy vết model tạo summary từng bài.
- Không gửi API key, `.env`, `node_modules` hoặc model weights trong gói bàn giao.

## Lấy dữ liệu từ nhánh

```bash
git fetch origin
git switch --track origin/data/arxiv-7500
node datasets/arxiv-7500/test-data.mjs
```

Nhánh chỉ bổ sung dữ liệu và công cụ kiểm tra, chưa thay data/corpus.json hay tự nhập MongoDB. Hai JSON lần lượt khoảng 16 MB và 61 MB; không cần mở/format toàn bộ trong VS Code. Bộ này chưa chứa PDF toàn văn hoặc model weights. Kiểm tra tự động hiện đạt 0 lỗi, có 7.055 cảnh báo độ dài summary; độ dài không được coi là yêu cầu bắt buộc. Hash SHA-256 nằm trong checksums.json.
