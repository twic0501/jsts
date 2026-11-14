# FR19 — phạm vi backend độc lập

Bản backend để review và tích hợp: một Search API tìm chung paper/study trong quyền, xếp hạng cosine với câu hỏi, trả danh sách có loại tài liệu/version/evidence. Giao diện hiện tại chưa gọi API này.

## Ranh giới bàn giao

- Chỉ thêm module `apps/api/src/modules/search`, hai route searches v4 và test backend. Dùng lại DTO từ `packages/core/src/unified-search.ts`, HTTP/Principal/fingerprint từ FR13; không thêm bản sao các thành phần này.
- Không sửa App, main, Header, ResultsPanel, scene/camera/màu, model/data, API v1–v3 hoặc barrel `packages/core/src/index.ts`.
- Không làm FR12, FR13 hoặc FR18; không tự cấu hình phiên, tạo Mongo pool, nhập file, chạy model khác hay thêm store RAM cho ứng dụng.
- Test repository RAM chỉ ở `tests/helpers`, không nằm trong runtime.
- Phụ thuộc FR13: nhánh `feature/fr13-search-history`, commit `910df32b359ccfa2909d40f1f5cb494581c8d2d7`. DTO và các helper dùng chung của FR13 cần có trước khi ghép FR19 vào nhánh khác.

## Phần giữ lại

1. `createDocumentSources`: ghép paper và nguồn study tùy chọn do FR18 cung cấp.
2. `createSearchService`: dùng embedding được inject, lọc quyền/metadata/model, cosine ranking chung, kiểm lại tài liệu hiện tại trước trả và khi đọc lại SearchRun.
3. Policy: public/chủ sở hữu, deleted/ready, kind/subject/year/documentIds. Không tin owner từ request.
4. Controller: schema/body/key/HTTP status/Location và GET SearchRun.
5. Mongo adapter: lưu SearchRun và thông tin retry theo chủ thể/queryId, nhận Db được cấp; không sở hữu nội dung hay tài khoản. SearchRun hết hạn sau 15 phút; Mongo giữ thêm 24 giờ trước khi TTL dọn.
6. `createPaperSource`: adapter đọc corpus hiện có; không đổi file corpus/embedding. Mapping canonical ID phải được module Documents/frontend thống nhất khi ghép.

## Điểm ghép cho bootstrap chung của nhóm

```ts
import { createSearchModule } from './search.module';
import { createDocumentSources } from './ports/document-sources';
import { configureSearchIntegration } from './integration';

const search = createSearchModule(
  db,                               // pool hiện có
  createDocumentSources({paper, study}), // bỏ study khi FR18 chưa sẵn sàng
  embedQuery,                       // E5 hiện có, dùng prefix/pipeline đúng
  revisions,                        // model/pipeline/projection của index
  projectQuery,                     // tùy chọn, cùng PCA
);

configureSearchIntegration({
  principal: resolveSession,         // FR12, trả principal hoặc null
  authorizeMutation: sharedGuard,    // guard hiện có
  runtime: async () => search,
});
```

Đường dẫn import ở ví dụ tính từ thư mục module Search; điều chỉnh theo vị trí bootstrap. Các dependency trong ví dụ do ứng dụng cung cấp, chưa được cấu hình sẵn. Cấu hình một lần trong bootstrap server; không cấu hình theo từng request hoặc lấy owner từ header client. `embedQuery` phải dùng đúng E5 query prefix/pipeline của index. Mỗi nguồn cung cấp một vector đại diện cho mỗi document; `candidates()` giới hạn phạm vi trước truy xuất, `current()` đọc lại nội dung/quyền/version có thẩm quyền. Lỗi của nguồn study đã cấu hình được trả thành lỗi, không âm thầm báo kết quả đầy đủ.

Route mới: POST `/api/v4/searches`, GET `/api/v4/searches/{id}`. Chưa ghép thì trả 503 SEARCH_INTEGRATION_REQUIRED; không tự chuyển giao diện sang v4. API v1 và UI cũ giữ nguyên hoạt động. Đây là chủ đích của bản bàn giao độc lập, không phải tuyên bố đã tích hợp FR12/FR18/UI.

POST nhận header `Idempotency-Key` và JSON `{queryId, query, topK, filters}`, trả `201` cùng `Location` của SearchRun. GET kiểm lại quyền hiện tại, trả `410` khi SearchRun hết hạn. Cosine được tính trong 384 chiều, không lấy khoảng cách 3D làm điểm tương đồng; point chỉ trả khi projection revision khớp.

## Hạn chế cần xử lý khi tích hợp

1. Chưa nối bootstrap, phiên thật, Mongo thật hoặc UI; chưa kiểm thử end-to-end với E5. Bộ corpus hiện có đủ cho giai đoạn này, chưa cần nhập bộ 7.000 bài.
2. Evidence hiện gán `start=0`, `end=text.length`, phù hợp abstract đầy đủ. Trước khi dùng trích đoạn study giữa trang/mục, cần nhận và giữ offset thật từ FR18/Documents; không dùng offset này để highlight study tùy ý.
3. Contract hiện có version tài liệu và model/pipeline revision, chưa có index generation riêng. Đọc lại SearchRun chưa phát hiện việc đổi vector nếu giữ nguyên các revision và nội dung. Khi ghép cơ chế re-index, cần bổ sung quy tắc generation/vô hiệu hóa kết quả; không thay vector âm thầm dưới cùng định danh phiên bản.

Hai điểm cuối là giới hạn của FR19/contract tích hợp, không phải các chức năng đã hoàn tất ở FR12 hay FR18.

## Kiểm chứng

```sh
pnpm exec vitest run tests/history.unit.test.ts tests/fr19.unit.test.ts tests/fr19-http.unit.test.ts
pnpm --filter @paper-galaxy/core typecheck
pnpm --filter @paper-galaxy/api typecheck
pnpm --filter @paper-galaxy/api build
```

18 test backend FR19 và 7 test FR13 history dùng vector/identity/repository fixture và corpus đóng gói để kiểm contract, ranking, quyền, retry, read-back và điểm ghép. Không chứng minh E5/Mongo/session thật chạy hoặc chất lượng retrieval.

Kiểm trên baseline FR13 nêu trên: 25 test FR13/FR19 qua; core và API typecheck qua; build production API qua. Chưa xác nhận build toàn bộ ứng dụng: frontend có hai lỗi TypeScript ở App/MagicBook props và `PropertyDescriptor.enumerable` trên các file baseline không sửa. Các file đó không thuộc thay đổi FR19.
