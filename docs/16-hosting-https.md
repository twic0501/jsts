# Hướng dẫn hosting với Nginx và HTTPS443

## Kiến trúc triển khai thống nhất

```text
Trình duyệt
    HTTPS TCP443
Nginx: TLS, cổng đăng nhập demo, nén, giới hạn request
    HTTP loopback8080
Node web server: Vite dist và proxy /api
    HTTP loopback3001
Next.js: API và model cục bộ
    MongoDB loopback27017, TLS + tài khoản ứng dụng
```

Chỉ cổng443 phục vụ web public; không có serverblock listen80 trong mẫu. Cổng8080,3001,27017 không được mở ra Internet. SSH quản trị giới hạn IP. Bản triển khai hướng tới một máy chủ Linux có ổ đĩa lưu model và dữ liệu, phù hợp hơn với modelCPU/cache dài hạn so với chỉ upload thư mục Vite dist lên static hosting.

Mẫu cấu hình nằm deploy/nginx.conf, hai service systemd, app.env.example và mongod.conf.example. Đây là cấu hình hạ tầng, không thêm ngôn ngữ lập trình ứng dụng khác ngoài JS/TS. Nginx1.30.6 đã được kiểm syntax và chạy thử trênWindowsloopback443 với chứng chỉ thử; môi trường Linux/public cần kiểm lại theo đúng binary/chứng chỉ đang cài.

## 1. Chuẩn bị host

Một cấu hình khởi đầu để đo tiếp là4vCPU,16GBRAM và tối thiểu30GBdisk. Đây không phải cam kết năng lực/SLA: phép thửlocal đã thấy RSSprocess đỉnh khoảng3.47GiB trong lúc nạp model, ngoài ra cònOS/Mongo/cache và quá trình build. Không chọn máy1–2GBRAM rồi suy ra có thể chạy đầy đủ RAG.

Cài Node24.x, pnpm đúng phiên bản khóa trong packageManager, MongoDB8.0.x phù hợp, Nginx ổn định và OpenSSL từ nguồn chính thức. Ghi lại phiên bản thực bằng node--version, pnpm--version, mongod--version, nginx-v; không mặc định version trên host giống máy phát triển.

Tạo userdịch vụ papermagic và thư mục /srv/paper-magic. Owner cần đọc source/models, ghi.local và.next cache; không chạy application bằngroot. Các service mẫu giả định Node ở/usr/bin/node; nếu cài tại vị trí khác, sửa ExecStart và chạy systemd-analyze verify trước.

## 2. Lấy source và cài tài nguyên

```text
git clone --branch codex/paper-magic https://github.com/twic0501/jsts.git /srv/paper-magic
cd /srv/paper-magic
pnpm install --frozen-lockfile
pnpm ai:setup
pnpm ai:rag:setup
```

Lần đầu cần Internet để tải package/model. Các script tải theo modelrevision, ghiSHA256 và runtime kiểm hash. Không sao chép node_modules từWindows sangLinux. Có thể dựng kho package/model nội bộ để cài offline sau đó; không đưa weights, Mongo binary hoặc dữ liệu riêng vàoGit.

## 3. MongoDB và cấu hình bí mật

TạoDB paper_galaxy, bật authorization, bindloopback. Tạo tài khoản riêng cho ứng dụng với quyềnreadWrite trênDB này, không dùng tài khoảnrootDB cho request. Ví dụ lệnh trongmongosh khi khởi tạo quản trị đúng quy trình:

```javascript
use paper_galaxy
db.createUser({user: "paperapp", pwd: passwordPrompt(), roles: [{role: "readWrite", db: "paper_galaxy"}]})
```

File deploy/mongod.conf.example yêu cầu TLS. Chuẩn bị CA và servercertificate cóSANlocalhost hoặc tên dùng trongURI; key/CA đặt ngoàirepo, quyền chỉ usermongod đọc. Ứng dụng tin CA qua tlsCAFile trongURI; không bật tlsAllowInvalidCertificates. Cấu hìnhTLS mẫu chưa được dùng để thay cấu hìnhMongo đang phát triển.

Tạo /etc/paper-magic/app.env từdeploy/app.env.example; nhập mật khẩu đãURL-encode vàoURI, PUBLIC_ORIGIN chính xác và optionalOPENALEX_API_KEY. Phân quyền0600, không commit filethật. Service systemd đọc EnvironmentFile; `.env`local không tự có trênhost. Chạy seed với environment đã cấp cho tiến trình:

```text
pnpm db:seed
pnpm test
pnpm typecheck
pnpm build
```

db:seed đồng bộ lại các collection seed papers/embeddings/datasets; cầnbackup trước khi thay dữ liệu đã vận hành. Seed không phải migration đa tài khoản hoặc backup.

## 4. Khởi động hai service

Sao chép hai file.service vào/etc/systemd/system, kiểm đường dẫn và user. app.env giữSERVER_HOST=127.0.0.1,SERVER_PORT=8080,API_ORIGIN=http://127.0.0.1:3001. Không đặt TLS_CERT_FILE choNode khi Nginx đang kết thúcTLS.

```text
systemd-analyze verify /etc/systemd/system/paper-magic-api.service /etc/systemd/system/paper-magic-web.service
systemctl daemon-reload
systemctl enable --now paper-magic-api paper-magic-web
systemctl status paper-magic-api paper-magic-web
curl --fail http://127.0.0.1:8080/api/v1/health
```

Model/runtime cần đọc đúng/srv/paper-magic/.local/models; APIWorkingDirectory phải làapps/api vì worker và dữ liệu được resolve theo cấu trúc hiện tại. Logxử lý model ở.local cần writable; serviceđặtUMask0077. Nếu ProtectSystem/ReadWritePaths không khớp pathcài, sửa cấu hình thay vì cấp quyền ghi toànổđĩa.

## 5. DNS và chứng chỉ không cần cổng80

Tạo bản ghiA/AAAA cho research.example.com trỏ vềhost thật. DNS và publicTCP443 phải kiểm từ máy ngoài. Dùng ACME DNS-01 để cấp chứng chỉ bằng bản ghiTXT, không phụ thuộcHTTP80. Ví dụ thao tác cấp thủ công bằng Certbot:

```text
certbot certonly --manual --preferred-challenges dns -d research.example.com
```

Certbot là công cụ hạ tầng của nhà cung cấp, không phải servicePython trong ứng dụng. Lệnhmanual cần cập nhậtTXT theo hướng dẫn và **không tự gia hạn nếu không có hook**. Để vận hành lâu dài, cấu hình DNSplugin/API của nhà cung cấp hoặc dịch vụ quản lý chứng chỉ, kiểm renew-dry-run và reloadNginx sau gia hạn. TokenDNS chỉ cấp đúngquyền/vùngDNS, lưu ởfileprivate; không bỏ vàoVite hoặcGit. Không dùng self-signed local làm chứng chỉ public cho người dùng.

Nguồn: [Certbot: DNS và manual](https://eff-certbot.readthedocs.io/en/stable/using.html#manual), [Nginx SSL module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html).

## 6. Nginx443 và cổng bảo vệ demo

Tạo mật khẩu bằng công cụhtpasswd vớibcrypt trênLinux, nhập tương tác để không để mật khẩu trong commandhistory. File ở/etc/nginx/paper-magic.htpasswd, quyền đọc tối thiểu choNginx. BasicAuth tạiproxy bảo vệdemo có inferenceđắt; chưa thay thế tài khoản/RBAC củaứng dụng.

Chỉnhserver_name và đường dẫnfullchain.pem/privkey.pem trongdeploy/nginx.conf. Đặtfile trongconf.d từhttpcontext. Kiểm defaultsite của bản cài: gỡ cấu hìnhlisten80không dùng; không chỉ thêmfile443rồi mặc định cho rằng80đãđóng. Firewall/securitygroup chỉ mởwebTCP443.

```text
nginx -t
systemctl reload nginx
ss -lntp
curl -I https://research.example.com
curl --user demo --fail https://research.example.com/api/v1/health
```

Không dùngcurl-kđể báoTLSđạt. Requestchưađăngnhập kỳvọng401; requestcóđăngnhập trả200. Kiểmcertchain/SAN/ngàyhết hạn. Mẫu córate15lượtAPI/phút/IP, burst2; backend cònlimit2requestv3và20lượt/phút/tiến trình. 429 làtừchối cókiểmsoát, khôngphải kếtquảtìmthànhcông. Proxyđặt120stimeout nhưngbackendvẫn phảiđoCPU/queue, khôngcoi tăngtimeoutlàsửa hiệu năng.

Nguồn: [Nginx limit_req](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html), [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

## 7. Mã hóa và bảo mật

TLS1.2/1.3 bảo vệ dữ liệu truyền, không mã hóa Mongo/IndexedDB trên ổđĩa. Targethosting cần ổđĩa mã hóa, backup mã hóa, key tách bảnbackup, quyềnfilevàquytrìnhkhôiphục. MongoCommunity có thể dùng mã hóa filesystem/device; không tự ghi đã bật Enterpriseencryption khi đang dùngCommunity.

SHA256 của model là kiểmtoànvẹn, khôngphảimãhóa bí mật. bcryptcủaBasicAuth làhashmậtkhẩu, khôngphảimãhóacóthểgiảimã. IndexedDB thuộc browserprofile, không phải két chứa secret; không lưuDBpassword/providerkey ởđó. TLSprivatekey/env/promptlogkhôngpublic; runtimepromptlogcóretention50stage, ragRunsTTL7ngày.

APIstrictschema/bodylimit, sourcehostcốđịnh, HTTPSURLvalidated, Reactrendertext, khôngthựcthiHTMLmodel, dotfile/pathtraversalguard vàrate limit làcác biệnphápđãcó. Khôngcótuyênbốđãpentest, chốngmọipromptinjection hoặc hoànthiệnauthđauser.

Nguồn: [MongoDB security checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/), [MongoDB encryption](https://www.mongodb.com/docs/manual/core/security-data-encryption/).

## 8. Nghiệm thu public và cập nhật

Từmáybênngoài, kiểm443/TLStrust,401/200/422/429, tìm vàmởsách, đọcnguồn,lưu/reload, mobile, logkhônglộsecret, rate/quá tải, restart/backuprestore. TắtInternetphía client để kiểmbrowsercache; chặnegressphíahost đểkiểmbackendlibrary, khôngđánhđồnghai thửnghiệm.

Trướccậpn hật: backupMongo vàconfig, giữreleasecommit, cài frozenlock, chạytest/build trongthưmụcreleasemới, chuyểnservice vàkiểmhealth. Nếu lỗi thì quaylại source/build trước và chỉrestoreDB theo kếhoạch tươngthích. Khôngxóa dữliệuđểchữa healthfail. Gia hạncert vàlịchbackup cần đượcgiámsátngoàiluồngAI.

Tìnhtrạnghiện tại: source/config/tài liệu đãchuẩnbị; NodeHTTPS443 vàNginx443 đãkiểmloopback, TLS1.3 vàBasicAuth401/200. **Chưacótênmiềnpublic/chứngchỉCA/hostthật đượcnghiệmthu trongphiên này.** UploadGitHubkhôngtựđộngtạo hosting.
