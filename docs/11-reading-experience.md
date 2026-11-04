# Đọc bài báo: hồ sơ, abstract và toàn văn

Ngày 04/11/2026. Bổ sung giao diện cho mốc 0.6; giữ nguyên API, CSDL, model và dependency. Chương trình JS/TS, hình trang sách được vẽ bằng Canvas rồi đưa lên geometry Three.js. Không thêm hình nền tải sẵn hoặc công thức khoa học giả.

## Vì sao có bài chỉ sáu trang?

Backend hiện lấy metadata (tên, tác giả, năm, nguồn) và abstract, chưa tải và dựng toàn bộ PDF vào cuốn sách. `readingPages` chia nội dung này thành các trang 13 dòng. Vì vậy, sáu trang là số trang của hồ sơ đang xem, không phải số trang PDF. Không có giới hạn cứng sáu trang; abstract dài tạo thêm trang. Nếu thiếu một trang để hoàn thành cặp trái/phải, trang cuối giải thích cách mở toàn văn. Không thêm trang trống hoặc nhân đôi nội dung để làm số trang lớn hơn.

Trang đầu thiết kế như bìa hồ sơ: tên bài, lĩnh vực, tác giả, năm và nguồn. Trang tiếp theo có ghi chú/trích đoạn và abstract nguyên văn. Mỗi trang ghi rõ **Hồ sơ & tóm tắt · Không phải toàn văn**. Ghi chú tiếng Việt trong corpus gốc là ghi chú đã có trong dữ liệu, không phải kết luận mới được AI tạo lúc tìm.

Góc đọc HTML trình bày cùng bài theo các phần: bìa hồ sơ → phạm vi dữ liệu → ghi chú → abstract có thể mở rộng → toàn văn ở nguồn → sao chép trích dẫn → các bài liên quan. Bài thiếu abstract được đánh dấu chỉ có tiêu đề; không tạo abstract thay thế.

## Các lựa chọn tìm kiếm

| Lựa chọn | Tìm ở đâu | Mạng |
|---|---|---|
| Thư viện | Corpus và các bài đã tải vào trình duyệt | Dùng offline sau khi cài/cache đủ |
| Trên mạng | Ứng viên mới từ OpenAlex và arXiv, xếp hạng bằng E5/cosine | Cần Internet để lấy bài mới |
| Cả hai | Kết hợp dữ liệu sẵn có với các ứng viên trực tuyến | Phần lấy mới cần Internet |

Đây là phạm vi tìm kiếm, không phải hai mô hình AI hoặc hai tài khoản thư viện. Dòng giải thích xuất hiện ngay dưới lựa chọn. Mất API/mạng thì giao diện báo dùng dữ liệu đã có; không tuyên bố đã tìm bài mới trên Internet.

## Toàn văn và trích dẫn

Nếu provider cung cấp `pdfUrl`, hiện nút **Đọc PDF đầy đủ**. Với bài arXiv có URL `https://arxiv.org/abs/…`, tạo liên kết PDF chuẩn từ ID của bài. Nguồn OpenAlex không có PDF không được tự tạo URL PDF; hiện **Trang bài gốc**, có thể cần quyền truy cập nhà xuất bản. Các link mở tab mới. PDF chưa được tải/cache hay hiển thị trong cuốn sách; mở nguồn cần Internet.

Nút sao chép tạo chuỗi tác giả, năm, tên và URL. Đây là trích dẫn đơn giản để tra cứu, không cam kết đúng đầy đủ chuẩn APA/BibTeX. Clipboard thành công mới báo đã sao chép; bị từ chối thì báo rõ và giữ link nguồn để người dùng mở.

## Hàm và biến

`apps/web/src/PaperDossier.tsx` có 4 hàm được đặt tên:

| Hàm | Input | Output / tác dụng |
|---|---|---|
| paperSource | Paper | Nhãn OpenAlex hoặc arXiv |
| paperCitation | Paper | Chuỗi tác giả/năm/tên/link |
| PaperDossier | Paper, saved, neighbors, các callback | JSX hồ sơ; gọi callback lưu/chọn bài/thông báo |
| copyCitation | Đọc paper từ component | Promise; ghi clipboard và báo kết quả thật |

`book-pages.ts` có 6 hàm: `wrapLines`, `readingPages`, `line`, `block`, `orbitMark`, `createPageTexture`. Ba hàm vẽ đường/khối chữ/quỹ đạo là helper Canvas; không thay đổi vector hoặc điểm tương đồng.

| Biến/tham số | Giá trị / quy tắc |
|---|---|
| hasAbstract | false khi provenance.abstractAvailable === false |
| words | Số từ abstract; 0 khi nguồn đánh dấu thiếu abstract |
| pdfUrl | Link provider, link arXiv chuẩn, hoặc null nếu xác định không có |
| source | Nhãn nguồn từ paperSource |
| saved | Boolean từ bookmark thật |
| neighbors | Các kết quả cosine thực tế; mảng rỗng nếu chưa có |
| width trong wrapLines | 34 mặc định, nội dung trang dùng 27 ký tự gần đúng |
| Canvas | 768 × 1280 pixel; texture sRGB, mỗi trang tối đa 13 dòng abstract |

`null` thể hiện đã xác định không có PDF. `undefined` là trường provenance tùy chọn chưa có ở corpus gốc; kiểm tra bằng optional chaining. Không dùng undefined làm chuỗi URL. Catalog AST toàn dự án sau cập nhật: 162 hàm có tên và 793 giá trị gán ngắn được ghi nhận. Quy tắc đếm/loại trừ xem code-catalog.json; không phải số mọi callback/biến trong ứng dụng.

## Kiểm chứng

Chạy unit giữ đủ toàn bộ từ abstract sau chia trang, kiểm số trang tăng theo nội dung và không tạo abstract cho nguồn thiếu. E2E kiểm nhãn phạm vi hiện thật, online cần mạng, hồ sơ không bị gọi là toàn văn, không hiện nút PDF giả cho bài OpenAlex không có PDF, đọc đúng abstract và không tràn ngang mobile. Các test cũ tiếp tục kiểm lật trang, chọn bài, lưu, API, camera và offline.

`node scripts/capture-dossier.mjs` chụp bìa sách, cặp abstract, Góc đọc, liên kết toàn văn và hai góc mobile. Báo cáo raw: `.local/dossier-browser.json`; ảnh: `.local/screenshots/dossier-*.png`. Ảnh là bằng chứng QA, không được dùng làm hình trong ứng dụng. Kết quả chạy cuối ghi trong verification.md.
