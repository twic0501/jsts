# Kiểm thử thực thi

- `pnpm test`: Vitest, 96 trường hợp unit hiện tại về số phức, camera, tìm kiếm và input.
- `pnpm test:e2e`: 16 luồng browser/API, cần `pnpm build` rồi `pnpm preview` đang chạy. Có bài reload offline nên không chạy bộ này với dev.
- Browser mặc định Microsoft Edge trên Windows. Đặt `PLAYWRIGHT_BROWSER_PATH` nếu dùng Chromium ở vị trí khác.
- Test đọc dữ liệu snapshot hiện tại (30 bài) để phát hiện thay đổi corpus ngoài dự kiến. Nếu cập nhật snapshot có chủ ý, cập nhật expectation dựa trên dữ liệu kiểm chứng.
- E2E cố ý dùng cache/browser mới mỗi testcase. Mất API và mất toàn mạng là hai phép thử khác nhau. Bookmark được kiểm sau reload, không chỉ sau click.

Report/trace trong playwright-report và test-results (gitignored). Kết quả đã chạy ghi trong docs/verification.md. Không đồng nghĩa đã đạt toàn bộ 252 đầu mục của đặc tả cuối.

Bản 0.2 bổ sung vector/PCA/snapshot unit và model thật trong E2E offline. Scripts evaluate-semantic dùng 6 câu smoke, không coi là đánh giá độc lập.

Bản 0.3 thêm 11 unit cho chuỗi phù phép/màu/chia trang giữ đủ abstract; 3 E2E cho tự mở, lật, thoát, truy vấn mới nhất, Escape và reduced motion.

Bản0.4 kiểm chứng phép biến đổi PCA chung, fit camera và đọc từng trang; E2E điểm3D thật, cạnh liên quan và web phủ viewport. Cần mở Thư viện/Góc đọc để thao tác HTML.

Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.

Cập nhật giao diện đọc:97unit/17E2E đạt. Thêm unit thiếu abstract/số trang theo nội dung và E2E giải thích phạm vi, phân biệt hồ sơ với toàn văn, không tạo link PDF giả, không tràn mobile. capture-dossier.mjs chụp6 góc để QA; không thay kiểm thử logic bằng ảnh đẹp. Xem docs/verification.md và docs11.


Mốc0.7:116 unit / 9 file và21E2E đã đạt. RAGunit kiểmchunkoffset/overlap, sourcecoverage, hybrid/fusion, rerankfallback, schema/prompt/citation/template. E2Efixture kiểm hiển thịýđịnh/citation/quote/nguồn/mởsách, thiếuevidence, requestvalidation và sửa lạiassetcachethiếu trước offline. Model/nguồnthật đo riêng qua scripts/check-research.mjs. Không coi fixture hoặc citationđúngID là chứng minh hiểungữ nghĩa.
