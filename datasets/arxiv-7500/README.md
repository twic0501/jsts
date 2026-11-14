# Bộ dữ liệu bài báo JSTS — 7.500 bài

Dữ liệu phục vụ đồ án **phân tích độ tương đồng và tìm kiếm ngữ nghĩa trên tập tài liệu bằng không gian vector 3D**.

## File bàn giao

| File | Nội dung | Kích thước (LF) | SHA-256 (Canonical LF) |
|---|---|---|---|
| `papers-selected-7500-with-summary.json` | Mảng bài báo: mã, tiêu đề, abstract, tác giả, năm, lĩnh vực, nguồn và summary tiếng Việt | 16.438.820 bytes (~15,68 MB) | `d1b721a077b674e6da19d7e8e0e6b9b48019d105e8f1f1aeba2c9ad00abeff16` |
| `semantic-snapshot-selected.json` | Thông tin model, cấu hình PCA và mảng `papers` chứa vector/tọa độ từng bài | 61.494.018 bytes (~58,65 MB) | `c3038dd8ef0ebd02b9b475fef461794af279a1632bc0babb0f2b25117c698a8f` |

*Lưu ý về mã băm:* Giá trị SHA-256 chuẩn hóa (Canonical) được tính dựa trên định dạng ký tự xuống dòng LF (`\n`). Trên hệ điều hành Windows, `.gitattributes` đã được thiết lập `datasets/arxiv-7500/*.json text eol=lf` để đảm bảo file luôn giữ định dạng LF khi checkout, tránh lệch hash do chuyển đổi sang CRLF (`\r\n`).

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

- [ ] File bài có đủ 7.500 mã duy nhất và summary không rỗng; báo cáo tạo summary có `completed: 7500`, `complete: true`.
- [ ] Đã đọc mẫu để kiểm tra summary đúng abstract, không trộn bài; xem lại các summary ngoài khoảng độ dài yêu cầu.
- [ ] Snapshot có đủ 7.500 ID tương ứng, vector hợp lệ và tọa độ hữu hạn; hash nội dung khớp.

**Chưa có kết quả xác nhận hoàn tất toàn bộ summary trong cuộc trò chuyện tại lúc soạn README.** Người bàn giao kiểm tra các mục trên trước khi gửi; file có 7.500 bản ghi chưa chứng minh đủ 7.500 summary.

## Phạm vi và lưu ý

- Hai file là dữ liệu **cấp bài từ metadata + abstract**, chưa chứa toàn văn, chunk hoặc embedding toàn văn cho RAG.
- Đã kiểm tra API đọc/tìm kiếm trên bộ 7.500 bài; chưa phải đánh giá chất lượng tìm kiếm đầy đủ hoặc nghiệm thu giao diện 3D.
- Frontend cần corpus/snapshot cùng phiên bản và tối ưu dựng liên kết khi hiển thị tập lớn. File bài là mảng, không thay trực tiếp cho `data/corpus.json` có object bao ngoài.
- Snapshot lớn có thể là JSON một dòng; đọc bằng code, không cần format toàn bộ trong VS Code.
- Gửi thêm `summary-provenance.json` và báo cáo xử lý nếu cần truy vết model tạo summary từng bài.
- Không gửi API key, `.env`, `node_modules` hoặc model weights trong gói bàn giao.

## Data card

### 1. Nguồn dữ liệu (Data Source)
- **Nguồn gốc:** arXiv (thu thập metadata và abstract qua arXiv API).
- **Quy mô mẫu:** 7.500 bài báo được lấy mẫu ngẫu nhiên từ 10.000 bản ghi arXiv gốc với seed ngẫu nhiên cố định là `42`.
- **Mã băm kiểm tra (Canonical LF SHA-256):**
  - `papers-selected-7500-with-summary.json`: `d1b721a077b674e6da19d7e8e0e6b9b48019d105e8f1f1aeba2c9ad00abeff16` (16.438.820 bytes).
  - `semantic-snapshot-selected.json`: `c3038dd8ef0ebd02b9b475fef461794af279a1632bc0babb0f2b25117c698a8f` (61.494.018 bytes).
- **CẦN BỔ SUNG: Truy vấn/danh mục arXiv và ngày thu thập 10.000 bản ghi gốc.**

### 2. Phạm vi thời gian (Temporal Scope)
- **Mã định danh (YYMM):** Toàn bộ bài báo mang mã định danh tháng 10 và tháng 11 năm 2026:
  - **Mã 2610 (tháng 10/2026):** 4.605 bài (~61,4%).
  - **Mã 2611 (tháng 11/2026):** 2.895 bài (~38,6%).
- **Năm xuất bản:** 100% thuộc năm 2026 (7.500/7.500 bài).

### 3. Thành phần và Phân bố chủ đề (Dataset Composition)
- **Phân loại lĩnh vực (`group`):** 100% bài báo (7.500/7.500) được gán nhãn `group: "ai"`. Nhãn này là một nhóm gộp đại diện cho nhiều danh mục chuyên sâu liên quan đến trí tuệ nhân tạo, tính toán và khoa học dữ liệu.
- **Category chính (`categories[0]`):** Tổng cộng có **94 category chính** khác nhau.
- **Top category chính:**
  1. `cs.LG` (Machine Learning): 2.368 bài
  2. `cs.CV` (Computer Vision): 2.100 bài
  3. `cs.CL` (Computation and Language): 1.225 bài
  4. `cs.AI` (Artificial Intelligence): 450 bài
  5. `cs.RO` (Robotics): 219 bài
  6. `stat.ML` (Machine Learning - Statistics): 214 bài
  7. `cs.CR` (Cryptography and Security): 108 bài
  8. `eess.IV` (Image and Video Processing): 73 bài
  9. `cs.SD` (Sound): 60 bài
  10. `cs.IR` (Information Retrieval): 52 bài
  11. `cs.SE` (Software Engineering): 48 bài
  12. `math.OC` (Optimization and Control): 43 bài
  13. `cs.DC` (Distributed Computing): 43 bài
  14. `quant-ph` (Quantum Physics): 34 bài
  15. `cs.HC` (Human-Computer Interaction): 27 bài
- **Bài ngoài nhóm `cs.*`:** Có **630 bài** có category chính không bắt đầu bằng tiền tố `cs.` (thuộc các ngành như `stat.ML`, `eess.IV`, `math.OC`, `quant-ph`, `physics.*`, v.v.), được gộp vào nhóm `"ai"` do tính chất ứng dụng liên ngành.

### 4. Thông số Mô hình Embedding và Phép chiếu PCA 3D (Embedding & Projection)
Dữ liệu snapshot được trích xuất trực tiếp từ `semantic-snapshot-selected.json`:
- **Embedding Model:**
  - `model.id`: `Xenova/multilingual-e5-small`
  - `model.revision`: `761b726dd34fb83930e26aab4e9ac3899aa1fa78`
  - `model.dtype`: `q8`
  - `model.dimensions`: `384`
  - `model.pipelineVersion`: `e5-mean-l2-512-v1`
  - **Định dạng đầu vào tài liệu:** `passage: ` + title + `\n` + abstract. Chuẩn hóa L2 vector đầu ra (chuẩn đạt 1 ± 1e-3).
- **Phép chiếu không gian 3D (PCA Projection):**
  - `projection.scale`: `10.631130937458833`
  - `projection.seed`: `42`
  - `projection.explainedVariance`: `[0.03036306420908124, 0.022902735545564903, 0.018556857242280952]`
  - **Tổng phương sai giữ lại:** `~7,18%` (khoảng `7,2%`).
- **CẢNH BÁO QUAN TRỌNG:**
  > [!WARNING]
  > Ba thành phần chính của PCA chỉ lưu giữ khoảng **7,2% phương sai** của không gian embedding 384 chiều ban đầu, chỉ phục vụ mục đích dựng tọa độ hiển thị trực quan 3D trên WebGL / Three.js. Để tính toán độ tương đồng ngữ nghĩa, xếp hạng tìm kiếm hoặc truy vấn RAG, **bắt buộc phải sử dụng vector embedding 384 chiều** (tính Cosine Similarity). Tuyệt đối không dùng khoảng cách hình học trong không gian 3D `(x, y, z)` để suy luận độ tương đồng ngữ nghĩa.

### 5. Thông tin Tóm tắt Tiếng Việt (Vietnamese Summary)
- **Phương thức tạo:** Sinh tự động bằng mô hình ngôn ngữ lớn (LLM), mục tiêu tóm tắt thành một câu tiếng Việt cô đọng.
- **Trạng thái kiểm duyệt:** Toàn bộ 7.500 summary **chưa được con người kiểm duyệt** thủ công từng bài.
- **Truy vết (Provenance):** Hiện tại chưa có file metadata truy vết để xác định chính xác mô hình nào đã sinh summary cho từng bản ghi.
- **Phân bố độ dài từ:**
  - Min: 14 từ, Max: 63 từ.
  - Trung bình: ~39,8 từ (chính xác: 39,77 từ); Trung vị: 40 từ.
  - Phân loại độ dài: 28 bài < 20 từ; 7.027 bài > 30 từ; 445 bài nằm trong khoảng mục tiêu [20, 30] từ.
- **CẦN BỔ SUNG: Model cụ thể tạo summary (danh sách mô hình LLM, phiên bản weights, cấu hình nhiệt độ temperature, và prompt sử dụng).**

### 6. Giới hạn của Tập Dữ liệu (Limitations)
- **Không có toàn văn (Full-text):** Tập dữ liệu hiện tại chỉ bao gồm tiêu đề (Title) và tóm tắt gốc (Abstract), chưa trích xuất các phần chi tiết như Phương pháp, Kết quả hay Thảo luận từ file PDF.
- **Chưa có phân đoạn (Chunking):** Chưa thực hiện chia nhỏ toàn văn thành các đoạn văn bản (chunks) cho RAG.
- **Thiếu chỉ số trích dẫn:** Chưa tích hợp `citation_count`, chỉ số ảnh hưởng học thuật hay mã định danh DOI đầy đủ.
- **Chưa có Benchmark:** Chưa có bộ câu hỏi kiểm thử chuẩn (Ground Truth Evaluation Dataset) để đo lường các chỉ số Information Retrieval như Recall@K hay nDCG.
- **CẦN BỔ SUNG: Ai chịu trách nhiệm phần nào (bảng phân công trách nhiệm cụ thể giữa các thành viên phụ trách thu thập dữ liệu gốc, pipeline nhúng vector, sinh tóm tắt tiếng Việt, và rà soát kiểm định chất lượng).**

### 7. Quy trình Tái kiểm Dữ liệu (Reproducibility & Verification)
Để kiểm tra lại toàn bộ tính toàn vẹn và tính hợp lệ của hai file dữ liệu, chạy script kiểm định:
```bash
node scripts/audit-data.mjs
```
Hoặc chỉ định cụ thể thư mục và file báo cáo:
```bash
node scripts/audit-data.mjs --dir datasets/arxiv-7500 --out audit-report.json
```
Lệnh trên kiểm tra toàn bộ 11 tiêu chí (7 lỗi ERROR chặn luồng và 4 cảnh báo WARN), đồng thời xuất thống kê phân bố và file báo cáo JSON chi tiết.
