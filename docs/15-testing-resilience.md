# Kiểm thử, tải, quá tải và độ bền

Ngày chạy 04/11/2026, Windows, Node24.22.1. Các kết quả mới có raw JSON trong docs/evidence. Kiểm thử độ bền chạy ở process Next.js riêng, cổng3102, dùng Mongo/model thật. Luồng trên5173/3001 không bị dùng để tạo tải.

## Các nhóm kiểm thử

Có8nhóm theo mục đích; một testcase có thể thuộc nhiều nhóm, không cộng các nhóm thành một số tổng khác.

| Nhóm | Mục tiêu và bằng chứng |
|---|---|
| Unit | 116case/9file ở mốc0.7: toán, vector, PCA, chunk, schema, trạng thái, nguồn, fallback, citation |
| End-to-end | 21case qua webserver8080: browser→API→data→sách, lưu/reload, offline và RAGUI |
| Integration | ModelE5/Qwen/reranker và arXiv/OpenAlex/Mongo thật, tách khỏi fixture |
| Prompt contract | Định dạng plan, payload tài liệu, citation ngoài nguồn, template sai; log accepted không phải xác nhận đúng nghĩa |
| Offline | Browser sau cài cache; runtime chặn fetch; backend library trong process chặn fetch ngoài loopback |
| Performance/load/endurance | Đo warm/cold điều kiện rõ, concurrent requests, 180ssoak, quá tải và phục hồi |
| Security/input smoke | JSON/type/field/body, path traversal, dotfile, proxy cancellation, TLS và cổng bảo vệ |
| Visual QA | Ảnh desktop/mobile, mở/lật sách, text fit, overflow và lỗiJS |

Fixture giúp test tái lập; không gọi fixture là dữ liệu nguồn/model thật. Unit không thay E2E; E2E không thay đánh giá chất lượng ngữ nghĩa độc lập. Không có con số %coverage vì chưa đo coverage và chưa cam kết bắt mọi lỗi.

## Thiết kế phép thử mới

scripts/test-resilience.mjs mở Next trên127.0.0.1:3102 với preloadtest-network-guard.mjs. Mọi globalfetch ra host ngoài loopback bị chặn. Mongo dùng localURI, model chỉ đọc file đã cài. Guard này không phải firewall củaOS và không ngăn mọi thư viện sử dụng socket riêng; các nguồn của ứng dụng hiện sử dụngfetch.

Các pha theo thứ tự: warm-up → load120request/concurrency8 → input sai80request → soak180s → burst12request → healthphục hồi → RAG câu tự nhiên trong scope library. Điều kiện pass: load/soak200, input422, burst chỉ200hoặc429 và có429, health200, offlineRAG200. Report ghi lỗi chứ không bỏ request thất bại.

## Kết quả tải và độ bền thực tế

| Phép thử | Số request | Đồng thời | Kết quả |
|---|---:|---:|---|
| Searchv1 sau warm-up |120|8|120HTTP200; p50=10.36ms, p95=14.94ms, p99=17.85ms |
| Inputv3 topK là chuỗi sai |80|8|80HTTP422, không gọi model |
| Soakv3 trong180s |45|1, cách4s|45HTTP200; p50=18.45ms, p95=33.77ms, p99=35.24ms |
| Burstv3 |12|12|2HTTP200,10HTTP429 |
| Health sau burst |1|1|HTTP200,1.89ms |
| RAG library khi chặn fetch ngoài |1|1|HTTP200,31.90s; grounded-generation,6evidence, providers=[] |

Searchload dùng4query đã làmấm. Soak lặp mộtquery, chủ yếu responsecache; không phải45lượt sinh văn bản mới. Kết quả429 thể hiện từ chối tải có kiểm soát, không được tính là tìm kiếm thành công. Phép thử này đánh giá prototype cục bộ, không chứng minh khả năng phục vụ20k bài, SLA, tải sinh văn bản đồng thời hoặc không rò bộ nhớ dài hạn.

## Bộ nhớ, CPU và event loop

Lấy216mẫu, mỗi1giây. RSS đầu≈113.01MiB, cuối≈2018.27MiB, đỉnh≈3548.47MiB; heapJS đỉnh≈75.24MiB. Bộ nhớ tăng bao gồm nạp weights, ONNXnative và cache, không thể suy ra leak chỉ từ chênh lệch đầu/cuối. Cần soak hàng giờ với nhiềuquery và chu kỳ nạp/giải phóng để kết luận lâu dài.

Eventloop p99 lớn nhất trong một cửa sổ đo≈317.72ms. Đây là dấu hiệu có giai đoạn vòng lặp bị chậm, không phải độ trễ HTTP của mọirequest. CPU lớn nhất≈340.50% theo quy ước100%=mộtlogicalCPU; lớn hơn100% có thể do nhiều thread. Chưa đoGPU hoặc renderFPS. RSS bao gồm bộ nhớ process/native/worker, heapUsed chỉ phần heapJS.

## Chỉ số dung lượng và thời gian

| Chỉ số | Ý nghĩa |
|---|---|
| ms | Mili giây,1/1000giây |
| p50 | Trung vị latency |
| p95/p99 | Ngưỡng tương ứng95%/99%mẫu theo nearest rank |
| concurrency | Số request đang chạy cùng lúc, không phải số người dùng thực |
| HTTP200 | Request thành công theo contract |
| HTTP422 | Dữ liệu không đạt schema |
| HTTP429 | Từ chối do giới hạn tải/rate, cần thử lại sau |
| decoded bytes | Body nhận được sau đọc response; chưa phải kích thước nén truyền mạng |
| kB / KiB |1000byte /1024byte;1MiB=1024KiB |
| RSS / heapUsed | Tổng memory process / heap JavaScript |

Body searchv1 lớn nhất11669byte≈11.40KiB. Bodyv3 soak lớn nhất957767byte≈935.32KiB vì kèm corpus/vector để vẽ và cache. Không đánh đồng body này với riêng đoạn trả lời. Build trước cập nhật tài liệu: main680.34kB(gzip255.45), CSS48.58kB(gzip10.82), Three552.66kB(gzip136.19). Gzip chỉ là sốbuild; cần proxy bật nén mới giảm truyền thực.

## TLS và proxy

scripts/test-https.mjs đã phục vụ web và proxyAPI trên443, TLS1.3, HTTP200. Client kiểm chứng chỉ bằng CA thử được truyền riêng; client không tin CA bị từ chối. Không dùng rejectUnauthorized=false. Đây là chứng chỉ self-signed local, chưa phải chứng chỉ publicCA. Nginx1.30.6 đã kiểm syntax và chạy trênloopback443: TLS1.3, chưa đăng nhập401, có đăng nhập thìweb/API200. Kết quả nằmnginx-report.json; không coi đây là chứng chỉpublicCA.

Proxy cancellation có12requesthủy với upstreamchậm100ms; server vẫn trả200. Giới hạn của HTTPv3 được kiểm trực tiếp trước khi gọi model. Chưa có pentest, kiểm xâm nhập đa tài khoản hoặc chứng nhận an toàn.

## Lệnh tái lập

```text
pnpm test
pnpm typecheck
pnpm build
pnpm preview
pnpm serve
node --env-file-if-exists=.env scripts/test-resilience.mjs
node scripts/test-https.mjs
node scripts/test-nginx.mjs
```

test-resilience cần cổng3102trống, Mongo đãseed và modelđãcài. TLS script cầnOpenSSL và443trống; chỉ bindloopback. test-nginx cần binaryNginx được tải riêng trong.local, không có trongGit. Backend offline được kiểm bằngAPI thật ở processriêng; browseroffline phải chờ trạng thái sẵn sàng, không chỉ chờ serviceworkercontroller.

Tiêu chí cải thiện tiếp: benchmark câu hỏi có nhãn đúng/sai độc lập, Recall@k/nDCG, đánh giá entailment, sinh văn bản dài hạn, evictioncache và kiểm nhiều thiết bị. Chưa ghi các chỉ số này thành kết quả đã đạt.
