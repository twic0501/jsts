# Phiên bản và quy trình kiểm chứng

## Phiên bản đã chạy

| Thành phần | Phiên bản quan sát/khóa | Nguồn xác nhận |
|---|---|---|
| Node.js |24.22.1|node--version trên máy chạy |
| pnpm |11.25.0|packageManager vàpnpm--version |
| TypeScript |5.9.3|package.json/lockfile |
| React |19.3.1|apps/web/package.json |
| Vite |8.3.5|apps/web/package.json vàbuild |
| Next.js |16.4.5|apps/api/package.json vàbuild |
| Three.js |0.187.0|apps/web/package.json |
| Transformers.js |4.3.2|web/APIpackage.json |
| MongoDBdriver |7.8.0|package.json |
| MongoDBlocalbinary |8.0.16|scripts/mongo.mjs |
| Vitest |5.1.0|package.json vàtestlog |
| Playwright |1.64.1|package.json, Edge/Chromium thực thi |
| Nginx kiểm thử |1.30.6|binary chính thức,nginx-v vàtest-nginx |
| OpenSSL kiểm thử |3.5.7|binary dùng tạo certlocal,opensslversion |

Các bản trên là phiên bản của môi trường đã đo, không tự cam kết là mới nhất hoặc không có lỗ hổng. HostLinux cần kiểm phiên bản package thực cài, điều kiện hỗ trợ, advisory và hướng dẫn tương ứng. Model có revision/hash riêng trong manifest; không dùng tênmodel thay cho phiên bản weights.

## SemVer

| Mức | Ý nghĩa và quy tắc của dự án |
|---|---|
| Patch: x.y.z+1 | Sửa lỗi/ổn định tương thích. Theo yêu cầu đề tài, giữ cấu trúc và contract đã chốt; không đổi kiến trúc dưới nhãnpatch |
| Minor: x.y+1.0 | Bổ sung chức năng hoặc endpoint tương thích; phải ghi phạm vi thêm và test |
| Major: x+1.0.0 | Có thể phá tương thích; phải có kế hoạch migration, rollback và tài liệu thay đổi |

Mốc0.7.0 bổ sung RAGv3, giữv1/v2 nên được phân loại minor của dự án. Cập nhật tài liệu, test scripts và cấu hìnhhosting lần này chưa thay đổi phiên bản ứng dụng hoặc cấu trúcAPI. SemVer không bảo đảm mọi bản0.x đều ổn định; contract vẫn phải được khóa và kiểm.

## Quy trình kiểm tra

1. **Chạy thử tối thiểu:** xác nhận health, nguồn dữ liệu, model và một câu tìm có kết quả đúngID.
2. **Đọc tài liệu:** ưu tiên tài liệu đi cùng phiên bản đang cài. VớiNext, đọcnode_modules/next/dist/docs trước khi sửa route/hosting.
3. **Kiểm phiên bản:** ghi runtime, packageManager, dependencylock, browser, modelrevision và cấu hìnhDB.
4. **Đối chiếu contract:** kiểm DTO/schema/entity; test lỗi và giá trị biên trước khi nốiUI.
5. **Kiểm mã:** pnpmtest, typecheck, build. Không sửa test để che lỗi đã phát hiện.
6. **Kiểm toàn luồng:** E2E browser→webserver→API→data→sách, lưu/reload, offline và cancellation.
7. **Kiểm vận hành:** tải, input sai, quá tải, phục hồi, độ bền, memory/CPU và TLS443.
8. **Đọc bằng chứng:** xem rawJSON, trace/screenshot và logprompt. Phân biệt fixture với nguồn/model thật.
9. **Chốt hồ sơ:** sinh lại catalog, đồng bộ README/kiến trúc, lưu AIlog/hash, ghi phần chưa nghiệm thu.
10. **Đăng source/triển khai:** kiểm file bí mật và file lớn, tạo commit, xác nhận remoteSHA; hosting kiểm riêng bằng domainpublic.

Build/test đạt chỉ xác nhận các kiểm tra đã định nghĩa. Không suy ra đã có pentest, không leak bộ nhớ dài hạn hoặc đúng ngữ nghĩa ở mọi lĩnh vực.

## Cổng kiểm trước mỗi thay đổi

- Thay công thức/vector: unit hữu hạn, biên, chuẩn hóa, chiều, PCA và quy tắc màu.
- Thay model/prompt: giữ bộ câu thử nhiều lĩnh vực, offset/citation, lỗi model và fallback; so sánh revision.
- Thay API/DB: strictinput, status, storage thật, index và khả năng tương thích.
- Thay scene: ảnh mở/lật/thoát, mobile, reducedmotion, dispose tài nguyên.
- Thay offline: cache đủ trước khi tắt mạng, reload và tìm lại; không chỉ chặnAPI.
- Thay host: configtest, certtrust,401/200/429, cổng lắng nghe, secret/backup/rollback.

## Log phát triển và log ứng dụng

ai-development-log.jsonl trong từngmodule ghi yêu cầu, contract triển khai, file/hash, phần sửa và bằng chứng. Đây là nhật ký phát triển được ghi lại; không được bịa rawoutput lịch sử chưa lưu hoặc nói mọi function có một hội thoạiAI riêng.

LogruntimeRAG ở.local/rag-prompts.json ghi prompt plan/synthesis, output thật, phiên bản và accepted. Accepted chỉ là qua parser/validator/citation, không phải xác nhận kết luận khoa học. Kho giữ tối đa50stage; dữ liệu thực cục bộ không đăngGit. Docs có thể công bố số liệu/bằng chứng đã rà soát, không công bốcredential hoặc câu hỏi cá nhân chưa được phép.
