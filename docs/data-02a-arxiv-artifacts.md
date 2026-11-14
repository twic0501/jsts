# DATA-02A · Xuất artifact từ arXiv-7500

Chạy từ thư mục gốc repo với Node.js 22.12 trở lên. Exporter và validator dùng thư viện chuẩn của Node.js và đọc hai JSON trong `datasets/arxiv-7500`. Cả hai kiểm SHA-256 chuẩn hóa LF theo baseline DATA-01 trước khi xử lý dữ liệu, rồi kiểm số lượng, ID thiếu/thừa/trùng, tọa độ và vector đầu vào. Exporter yêu cầu thư mục đích mới và trả exit `1` khi gặp lỗi.

```sh
node scripts/export-arxiv-artifacts.mjs --out-dir .local/data-02a/run-a
node scripts/validate-arxiv-artifacts.mjs --artifact-dir .local/data-02a/run-a
node scripts/export-arxiv-artifacts.mjs --out-dir .local/data-02a/run-b
node scripts/validate-arxiv-artifacts.mjs --artifact-dir .local/data-02a/run-b
node --test tests/arxiv-artifacts.test.mjs
```

Mỗi lệnh thành công trả exit `0`. Hai lần xuất từ cùng byte đầu vào phải có cùng SHA-256 cho cả bốn file. So sánh các digest trong stdout của hai lần xuất hoặc dùng `Get-FileHash -Algorithm SHA256` trên Windows. Dùng tên thư mục mới mỗi lần chạy lại.

## Quy ước hàng và schema `arxiv-artifacts-v1`

Hàng `i` là bản ghi `semantic-snapshot-selected.json` tại `papers[i]`, với `i` bắt đầu từ `0`. Ghép `paperId` của hàng với `id` trong metadata để đọc `title` và category chính `categories[0]`. File metadata có thể có thứ tự khác snapshot.

| File | Nội dung |
| --- | --- |
| `visualization-7500.json` | Mảng 7.500 hàng theo thứ tự snapshot. Mỗi hàng có `paperId`, `title`, `primaryCategory` và `point` với `x`, `y`, `z` lấy từ snapshot. |
| `embeddings-7500.f32le` | 7.500 hàng × 384 giá trị IEEE 754 Float32 little-endian, không header, không padding. Mỗi hàng 1.536 byte, tổng 11.520.000 byte. |
| `embedding-index.json` | Object ánh xạ `paperId` tới `{ "row": i, "byteOffset": i * 1536 }`. Lấy thứ tự hàng từ `row`. |
| `artifact-manifest.json` | Phiên bản schema, corpus và snapshot, model, cấu hình xuất, số lượng, kích thước và SHA-256 của hai input và ba file dữ liệu. |

JSON đầu ra là UTF-8, ghi bằng `JSON.stringify` với một LF ở cuối. Manifest dùng tên file và phiên bản cố định theo đầu vào, không có timestamp hay đường dẫn tuyệt đối. `rawBytes` và `rawSha256` đo byte input trên đĩa. `lfBytes` và `lfSha256` đo byte UTF-8 sau khi đổi CRLF thành LF. Với input có cùng nội dung LF nhưng khác xuống dòng, ba file dữ liệu có cùng hash và manifest phản ánh hash raw của từng checkout. SHA-256 của bản thân manifest được in ra cùng kích thước trong stdout của exporter.

Validator có thể chạy trực tiếp trên thư mục artifact từ một lần xuất khác. Nó kiểm checksum input và output, đối chiếu từng hàng với snapshot và metadata, rồi đọc 384 giá trị từ `byteOffset` bằng Float32 little-endian. Mỗi giá trị phải khớp `Math.fround` của nguồn. Report ghi cả sai lệch so với `Math.fround` và sai số làm tròn cực đại so với số gốc.

Dùng vector 384D cho tìm kiếm ngữ nghĩa và tọa độ PCA 3D cho hiển thị. Frontend, API, MongoDB và đồ thị láng giềng thuộc các bước sau.
