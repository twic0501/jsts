# Bản demo HTTPS truy cập qua Internet

## Trạng thái đã kiểm chứng

Ứng dụng đầy đủ đã được truy cập qua một URL Cloudflare Quick Tunnel, không chỉ trang tĩnh. Evidence ở [public-demo.json](evidence/public-demo.json) và [ảnh browser](evidence/public-demo-browser.png).

URL tại thời điểm đo:

https://representative-obtained-championships-amendment.trycloudflare.com

URL này là **demo tạm thời**. Nó ngừng hoạt động khi tunnel hoặc các tiến trình trên máy nguồn dừng, và hostname thay đổi khi tạo tunnel mới. Đây không phải dịch vụ production có tên miền ổn định hoặc cam kết uptime. Hướng triển khai lâu dài vẫn là [VPS + Nginx + chứng chỉ CA](16-hosting-https.md).

## Luồng mạng thực tế

```text
Browser
  HTTPS443, kiểm chứng chỉ public bình thường
Cloudflare edge
  Tunnel mã hóa
cloudflared trên máy nguồn
  HTTPS443, tin CA của origin được chỉ định rõ
Nginx local: TLS + Basic Auth + rate limit
  loopback8080 → Node web server
  loopback3001 → Next.js API
  loopback27017 → MongoDB, model đọc từ ổ đĩa
```

Cloudflare kết thúc TLS public và là một thành phần được tin cậy trong đường truyền, không phải kênh mà nhà cung cấp hoàn toàn không đọc được. Cloudflared kiểm chứng chỉ origin bằng origin-ca-pool; không bật no-tls-verify. Tài khoản/mật khẩu demo được tạo ngẫu nhiên và chỉ lưu trong `.local/demo-host/access.json` trên máy nguồn. File này bị Git bỏ qua; không đăng credential trong repository hoặc slide.

## Bằng chứng qua URL public

| Kiểm tra | Kết quả |
|---|---|
| Chưa đăng nhập | HTTP401 |
| Trang có đăng nhập | HTTP200, HTML thật của ứng dụng |
| Health API có đăng nhập | HTTP200, storage=mongodb |
| Tìm U-Net qua APIv3 | HTTP200, đúngID1505.04597,6evidence, modeextractive |
| RAG câu tự nhiên qua Internet | HTTP200, grounded-generation,6evidence,26.06giây; cần đối chiếu nội dung với nguồn |
| Browser3D qua Internet | Sách mở đúng U-Net,12node, không lỗiJS, không tràn ngang |
| Burst8request đã đăng nhập |3HTTP200,5HTTP429; không cóstatusngoài200/429 |
| Phục hồi sau10giây | HealthpublicHTTP200 |

Burst dùng cùngquery đã làmấm, quaedgevàNginx; không phải8lượt sinh câu trả lời mới hoặc chứng nhận năng lực hệ thống. Request bị429 là bảo vệ quá tải, không được tính là tìm kiếm thành công. Rawreport có latency và byte của từng lượt, không chỉ số tổng.

## Vận hành và tái lập

MongoDB, Next3001, Node8080 vàNginx443 phải đang hoạt động. Cloudflared binary chính thức đã kiểm SHA256 của release2026.10.7; binary ở.local, không vàoGit. Nginx chạy với cấu hìnhprivate tham chiếu certificate và filehashmật khẩu private; mẫu public trongdeploy/nginx.conf không chứa các giá trị thật.

Sau khi chuẩn bị origin tương đương, lệnh tunnel đã dùng là:

```text
cloudflared tunnel --url https://127.0.0.1:443 --origin-ca-pool PATH_TO_ORIGIN_CERT --origin-server-name localhost --http-host-header localhost --protocol http2 --loglevel info
```

Bản demo dùng Basic Auth tại Nginx. Không đưaaccess.json/privatekeyvàGitHubtokenvào commandlinepublic hoặcGit. Dừngcloudflared thìURLhết tác dụng; Nginx riêng củademo cóthểdừng bằngnginx-squit vớiđúngprefix/configđãtạo, không dừng cácservicekhác trênmáy.

Nếu máy nguồn mấtInternet, backendlibrary vẫn cóthể chạy local vớiMongo/model, nhưng tunnelpublic không còn đường truyền. Browser đã cài đủcache cóthể dùngE5/IndexedDB dựphòng theo thiết kế; không nói URLpublic vẫn dùngđược khi máy nguồn đãoffline.

Nguồn: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) xác định đây là dịch vụ testing/development, hostname tạm và không có cam kết uptime. Không thay bằng chứng choVPS/backup/RBACproduction.
