# Tổng quan và trình tự triển khai

Paper Magic là web3D khám phá bài báo bằng ngữ nghĩa, có React/Vite, Next.js, MongoDB và dữ liệu lưu trong trình duyệt. Source dùng JS/TS; hình sách/portal/ký tự được tạo bằng geometry/Canvas và chuyển động toán học.

Tài liệu chuẩn hiện tại: [yêu cầu](13-requirements.md), [kiến trúc/API/CSDL](14-architecture-api-database.md), [RAG](12-rag-architecture.md), [kiểm thử](15-testing-resilience.md), [hosting](16-hosting-https.md). Bản trước được giữ trong archive.

Thứ tự kỹ thuật: contract và schema → toán/vector/chunk → corpus/model/Mongo → API/repository → RAG và validator → UI/sách → cache/offline → E2E/tải/TLS → hosting và kiểm từ bên ngoài. Mỗi bước chỉ được gọi là đã đạt khi có bằng chứng tương ứng.

Bản hiện tại có corpus gốc30 bài và cache online; chưa phải nghiệm thu5.000–20.000 bài. RAG hiện đọc abstract/tiêu đề, chưa toàn vănPDF. Các APIv1/v2 được giữ khi thêmv3. Không tự train model hoặc gọiE5inference làtraining.
