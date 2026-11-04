# Paper Magic

Web3D khám phá và kết nối bài báo theo ngữ nghĩa. Frontend React/Vite, backend Next.js, MongoDB, IndexedDB và model chạy cục bộ qua JavaScript/TypeScript.

## Chức năng hiện có

- Tìm câu hỏi tự nhiên trong thư viện, arXiv/OpenAlex hoặc kết hợp.
- E5 tạo vector384D; tìm đoạn bằng dense/BM25/RRF và cross encoder; RAG diễn giải kèm đoạn nguồn.
- Sách và node3D được dựng bằng geometry/Canvas, chuyển động dùng số phức, sin/cos và nội suy theo thời gian.
- Đọc abstract, lưu bài, mở nguồn/PDF, cache và tìm dự phòng trong browser.
- Backend dùng dữ liệu/model local khi mất Internet; browser có E5 dự phòng khi không truy cập được API.

Bản cơ bản hiện dùng corpus gốc30bài và cache ngoài, chưa nghiệm thu5.000–20.000bài. RAG chưa đọc toàn vănPDF. Không có tự training, tài khoản/RBAC hoặc sync đa trình duyệt. Màu cosine không phải %chính xác.

## Tài liệu và bản trình bày

- [Mục lục hồ sơ](docs/README.md)
- [Yêu cầu và định nghĩa](docs/13-requirements.md)
- [Kiến trúc, API và CSDL](docs/14-architecture-api-database.md)
- [Danh mục từng hàm](docs/function-catalog.md), [biểu thức khởi tạo biến](docs/variable-catalog.md), [số lượng theo module](docs/18-module-inventory.md)
- [Kiểm thử tải, quá tải và độ bền](docs/15-testing-resilience.md)
- [Hosting Nginx + HTTPS443](docs/16-hosting-https.md)
- [PPTX cập nhật dự án](docs/presentation/Paper-Magic-Cap-nhat-du-an-0.7.pptx)
- [PDF để đọc](docs/presentation/Paper-Magic-Cap-nhat-du-an-0.7.pdf)

## Cài đặt và chạy local

Node đã kiểm24.22.1; pnpm11.25.0. Cần Internet cho lần cài package/model đầu, sau đó giữ tài nguyên local.

~~~text
pnpm install --frozen-lockfile
pnpm ai:setup
pnpm ai:rag:setup
~~~

Tạo.env từ.env.example và đặt MONGODB_URI=mongodb://127.0.0.1:27017/paper_galaxy để dùngMongo. Chạy pnpm db:start ở một terminal riêng, giữ tiến trình hoạt động. Terminal khác:

~~~text
pnpm db:seed
pnpm test
pnpm typecheck
pnpm build
pnpm preview
~~~

Mở http://127.0.0.1:5173. pnpm serve ở terminal khác phục vụ bản build qua Node8080 và proxy tớiNext3001. pnpm dev dành cho phát triển; serviceworker chỉ bật ở productionbuild. Khi không cấu hìnhMongo, API báo rõJSONlocal; không gọi cấu hình đó là đã dùngMongo.

## Kiểm chứng

Mốc ứng dụng:116 unit / 9 file,21 E2E; phiên cập nhật hồ sơ đã chạy lạiunit/typecheck. Kiểm tải riêng:120requestsearch/concurrency8 đạt200,45requesttrong180sđạt200,burst12trả2×200và10×429,healthsauđó200. Kết quảcacheấm không thay kiểm sinh văn bản mới hoặc tải20kbài. Nginx1.30.6/TLS1.3 trên443loopback kiểm401/200 thành công; chưa có chứng chỉ/domainpublic.

~~~text
node --env-file-if-exists=.env scripts/test-resilience.mjs
node scripts/test-https.mjs
~~~

Rawreport và giải thích chỉ số ởdocs/evidence vàdocs/15-testing-resilience.md. Modelweights, Mongo data, env, TLSkey vànode_modules không nằm trongGit; scriptsetup tạo lại tài nguyên. AIlogphát triển nằm từngmodule, promptRAGthật nằm.local/rag-prompts.json (khôngpublic). UploadGitHub không tự tạo hostingInternet.
