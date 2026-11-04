# Scene — thư viện phép thuật toàn màn hình0.4

Canvas phủ toàn viewport; sách, ngoại cảnh và điểm PCA luôn cùng cảnh. Không còn setMode hoặc nút book/map. Những bảng kính nổi thuộc React/CSS; geometry và quỹ đạo do JS/TS tính. Không ảnh/video/GLB tải sẵn, Python, shaderGLSL tự viết hay thư viện animation.

Tài liệu chính: [luồng, công thức, hàm/biến0.4](../../../../docs/08-input-output-ritual.md). State machine xem docs/06 (giá trị camera/giấy0.3 đã được thay).

- create-book-scene.ts: dựng sách, table, mapNodes thật, cạnh theo cosine, raycast, camera và cleanup. Handle12 phương thức: select/startSearch/empty/turn/setScores/setPaused/zoom/reset/focusPage/filter/setQuery/dispose.
- spatial-layout.ts: toLibraryPoint(p) và readingCamera(aspect,focus). Dùng chung phép quay + uniform scale2 + tịnh tiến cho cả corpus/query để giữ tỷ lệ khoảng cách PCA.
- MagicBook.tsx: điều khiển React, trạng thái phase/spread, focus trang trái/phải/hai trang và hover bài. Không đưa tọa độ từng frame vào React state.
- book-pages.ts: word wrap, chia mọi phần ≤13 dòng/trang, vẽ44px trên texture768×1280, không cắt mất abstract.
- atmosphere.ts:6 dải sáng mềm,4 quầng gradient,420 bụi màu; update theo sin/cos và thời gian.
- enchanting-table.ts: bàn geometry nguyên gốc.
- ritual.ts: thứ tự bay/xoáy/đóng/chờ/zoom/mở/đọc/lật/thoát, reduced motion và ngưỡng màu.

Sách scale1.1 lúc chờ,1.5 khi đọc; focus auto ưu tiên trang trái ở canvas hẹp. Node có paperId thật, hover tên và bấm mở đúng bài. Mạng nền nối2 lân cận/corpus; chọn bài làm nổi5 lân cận, chỉ vẽ cạnh nếu2 đầu hiện sau lọc. Mặt giấy ưu tiên khi đọc để giữ chữ rõ, raycaster không chọn xuyên sách. Chưa có điểm dùng màu lĩnh vực, có điểm dùng cosine384D. Vị trí PCA không quyết định ranking.

`null` là không chọn/chưa có điểm. `undefined` là tra cứu không có phần tử, phải kiểm trước dùng. QA screen projection cập nhật200ms; pixel ratio tối đa1.6; dispose hủy RAF/listener/observer và toàn bộ geometry/material/texture/renderer. Tham số/return và số hàm thực tế xem docs/function-catalog.md, giá trị gán xem code-catalog.json.

Kiểm chứng:83 unit /13 E2E đã đạt; kết quả thực chạy xem docs/verification.md. Ảnh QA nằm .local/screenshots, không được dùng làm texture/nền. Chưa benchmark FPS/GPU nhiều thiết bị. AI log mới ghi ai-development-log.jsonl.
Mốc0.5: ký tự đơn sắc khi chờ; letter-flight.ts lập lịch tăng tốc theo nguồn paperId và điểm query. knowledge-portal.ts vẽ vùng xoáy mềm; semantic-links.ts chọn tối đa24 cạnh,2 nhánh/node. Node quay quanh tâm(0,4.1,-4.2), tách sách. Exit có bước reopen1.1s trước release; chỉ truyền chữ khi góc thực<0.82. Lật có bước framing0.55s và mặt trước/sau riêng, trang rộng thêm22%. Xem docs08 và ảnh QA mở/lật/thoát.


Cập nhật0.6: docs/10-online-running.md mô tả v2 search thật arXiv/OpenAlex, IDoa, projection/vector chung, IDBv2 và Node webserver. Kiểm chứng hiện96unit/16E2E, live nguồn/model/Mongo riêng; xem docs/verification.md. Không tự train hoặc public giả. Catalog hàm/tham số/biến sinh bằng scripts/document-code.mjs.

Thiết kế giấy mới: book-pages.ts có6 hàm có tên. Canvas768×1280 vẽ bìa hồ sơ, ghi chú và abstract với kiểu chữ Georgia, số trang, nguồn và nhãn không phải toàn văn. Abstract chia13 dòng/trang, không giới hạn6 trang và không nhân đôi nội dung. Trang hướng dẫn nguồn chỉ bổ sung khi cần hoàn thành cặp trang. Chuyển động/geometry giữ nguyên. Xem docs11 và ảnh dossier-*.png; regression97unit/17E2E đạt.
