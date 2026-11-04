# Hosting một máy chủ, HTTPS cổng 443

Tài liệu thao tác: docs/16-hosting-https.md. Đây là cấu hình mẫu để rà soát trước triển khai, chưa phải bằng chứng đã có dịch vụ public. Source ứng dụng vẫn JS/TS; Nginxfile, systemd và YAML là cấu hình hạ tầng.

- nginx.conf: HTTPS443, chứng chỉ CA qua DNS-01, Basic Auth cho bản demo, nén, giới hạn body/rate; không có listener80.
- paper-magic-api.service: Next.js chỉ nghe 127.0.0.1:3001, chạy bằng user riêng.
- paper-magic-web.service: Node phục vụ Vite build và proxy API ở loopback8080.
- app.env.example: mẫu env riêng, không phải credential thật.
- mongod.conf.example: Mongo loopback, xác thực và requireTLS. Chứng chỉ Mongo được cấp riêng, không bật allowInvalidCertificates.

Không mở public 3001/8080/27017. Chỉ TCP443 phục vụ web; SSH quản trị giới hạn IP. Tên miền/chứng chỉ thật, quyền máy chủ, DNS và thông tin đăng nhập cần được điền trên host. Basic Auth là cổng bảo vệ bản demo, chưa phải tài khoản/RBAC/sync của ứng dụng. Không đưa model, Mongo data, key TLS hoặc env vào Git.


Nginx1.30.6 đã được kiểm syntax và chạyloopback443 bằngcertlocal:401khi thiếuđăngnhập và200cho web/API cóđăngnhập. Cấu hìnhLinux/systemd/MongoTLS/certCA cần đượckiểm tại hostthật trướcpublic.
