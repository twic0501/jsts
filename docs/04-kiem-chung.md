# Quy trình kiểm chứng và vận hành

Tài liệu hiện tại: [15-testing-resilience.md](15-testing-resilience.md), [17-version-verification.md](17-version-verification.md), [verification.md](verification.md), [evidence](evidence). Không dùng số kiểm thử dự kiến hoặc số lịch sử làm kết quả cho mã mới.

Trình tự: chạy thử → đọc tài liệu đúng phiên bản → kiểmruntime/package/modelrevision → unit/typecheck/build → E2E/API/data → offline → tải/quá tải/soak/TLS → xemrawreport vàảnh → ghiAIlog/hash → đồng bộdocs → kiểmcommit/hosting.

Có8nhóm kiểm theo mục đích, có thể chồng lặp testcase. Report ghi điều kiệncache/cold/warm, sốmẫu, status, latency, byte, RSS/heap/CPU và giới hạn. 429 làphảnứngbảovệ, không phải tìmthànhcông. Ba phútsoak không chứngminh vậnhành dài hạn hoặc khôngleak.

Backendoffline được kiểm khi chặnfetch ngoài loopback, scope library vàmodelcục bộ. Browseroffline được kiểm riêng saucàiđủasset. Host ởxa khôngtruycậpđượckhiclientmấtmạng; khiđóbrowserchỉcó dữliệu đãlưu. TLSlocalself-signed không phải chứngchỉpublicCA. Hướngdẫn bảo mật/hosting: [16-hosting-https.md](16-hosting-https.md).
