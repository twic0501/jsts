# Bản trình bày cập nhật dự án

Paper-Magic-Cap-nhat-du-an-0.7.pptx có26slide, nội dung mô tả dự án bằng giọng văn trung tính, không dùng đại từ ngôi thứ nhất. Có yêu cầu, kiến trúc, RAG,3D toán học, API/CSDL, hàm/biến, null/undefined,logAI,offline,test/tải/soak/TLS,Nginxhosting vàphiên bản.

PPTX chứa đối tượng chỉnh sửa và11bảng native. PDF là bản xem từ các slide đã render, giữ bố cục; chỉnh sửa nội dung ởPPTX. Renderer dùng@oai/artifact-tool vàJavaScript; PDF đóng gói bằngpdf-lib vì PDFexport trực tiếp của runtime thiếufontstandard. Không dùngPython.

Nguồn số liệu nằm docs/evidence, verification.md vàmodule-inventory.json. Ảnhtrongslide làảnh ứng dụng thật; không phải texture/ảnh dựng sẵn dùng trong app. Nginx/TLSđã kiểmloopback; chưa có hostingpublic tronglầnchốt.

Bộ dựng slide gồm build-presentation.mjs và finalize-js.mjs, dùng @oai/artifact-tool/jszip/pdf-lib trong runtime tài liệu củaCodex. Đây là công cụ tạo hồ sơ tùy chọn, không phải dependency của ứng dụng. Cần môi trường có các package đó để chạy lại; pnpm build ứng dụng không import các file này. Ảnhcover và rawreport cần thiết đã đi kèm.
