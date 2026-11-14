# Danh mục API tài nguyên

Thiết kế ngày 2026-11-14. 54 thao tác HTTP. Xem [OpenAPI](software-api.openapi.json) để biết DTO và quyền trên từng tài nguyên.

| Method | Path | Quyền | Thành công | Retry key | Precondition | Location |
|---|---|---|---|---|---|---|
| POST | `/api/v4/users` | public | 201 | required | none | /api/v4/users/me |
| GET | `/api/v4/users/me` | user | 200 | none | none | — |
| PATCH | `/api/v4/users/me` | user | 200 | required | If-Match | — |
| POST | `/api/v4/sessions` | public | 200 | none | none | — |
| GET | `/api/v4/sessions/current` | optional | 200 | none | none | — |
| DELETE | `/api/v4/sessions/current` | user | 204 | none | none | — |
| GET | `/api/v4/documents` | optional | 200 | none | none | — |
| POST | `/api/v4/documents` | user | 201 | required | none | /api/v4/documents/{id} |
| GET | `/api/v4/documents/{id}` | optional | 200 | none | none | — |
| PATCH | `/api/v4/documents/{id}` | user | 200 | required | If-Match | — |
| DELETE | `/api/v4/documents/{id}` | user | 204 | required | If-Match | — |
| GET | `/api/v4/documents/{id}/chunks` | optional | 200 | none | none | — |
| GET | `/api/v4/documents/{id}/source` | optional | 200 | none | none | — |
| GET | `/api/v4/documents/{id}/neighbors` | optional | 200 | none | none | — |
| POST | `/api/v4/documents/{id}/versions` | user | 201 | required | baseDocumentRevision (multipart) | /api/v4/documents/{id}/versions/{versionId} |
| GET | `/api/v4/documents/{id}/versions/{versionId}` | optional | 200 | none | none | — |
| GET | `/api/v4/documents/{id}/versions/{versionId}/chunks` | optional | 200 | none | none | — |
| GET | `/api/v4/documents/{id}/versions/{versionId}/source` | optional | 200 | none | none | — |
| POST | `/api/v4/searches` | optional | 201 | required | none | /api/v4/searches/{id} |
| GET | `/api/v4/searches/{id}` | optional | 200 | none | none | — |
| GET | `/api/v4/graph` | optional | 200 | none | none | — |
| POST | `/api/v4/answers` | user | 202 | required | none | /api/v4/jobs/{jobId} |
| GET | `/api/v4/answers/{id}` | user | 200 | none | none | — |
| GET | `/api/v4/jobs/{id}` | user | 200 | none | none | — |
| GET | `/api/v4/users/me/bookmarks` | user | 200 | none | none | — |
| PUT | `/api/v4/users/me/bookmarks/{documentId}` | user | 200 | required | If-Match or If-None-Match:* | — |
| DELETE | `/api/v4/users/me/bookmarks/{documentId}` | user | 204 | required | If-Match | — |
| GET | `/api/v4/collections` | user | 200 | none | none | — |
| POST | `/api/v4/collections` | user | 201 | required | none | /api/v4/collections/{id} |
| GET | `/api/v4/collections/{id}` | user | 200 | none | none | — |
| PATCH | `/api/v4/collections/{id}` | user | 200 | required | If-Match | — |
| DELETE | `/api/v4/collections/{id}` | user | 204 | required | If-Match | — |
| PUT | `/api/v4/collections/{id}/items/{documentId}` | user | 200 | required | If-Match or If-None-Match:* | — |
| DELETE | `/api/v4/collections/{id}/items/{documentId}` | user | 204 | required | If-Match | — |
| GET | `/api/v4/notes` | user | 200 | none | none | — |
| POST | `/api/v4/notes` | user | 201 | required | none | /api/v4/notes/{id} |
| GET | `/api/v4/notes/{id}` | user | 200 | none | none | — |
| PATCH | `/api/v4/notes/{id}` | user | 200 | required | If-Match | — |
| DELETE | `/api/v4/notes/{id}` | user | 204 | required | If-Match | — |
| GET | `/api/v4/users/me/search-history` | user | 200 | none | none | — |
| POST | `/api/v4/users/me/search-history` | user | 201 | required | none | /api/v4/users/me/search-history/{id} |
| GET | `/api/v4/users/me/search-history/{id}` | user | 200 | none | none | — |
| DELETE | `/api/v4/users/me/search-history/{id}` | user | 204 | required | If-Match | — |
| GET | `/api/v4/users/me/reading-states` | user | 200 | none | none | — |
| GET | `/api/v4/users/me/reading-states/{documentId}` | user | 200 | none | none | — |
| PUT | `/api/v4/users/me/reading-states/{documentId}` | user | 201 tạo / 200 cập nhật | required | If-Match or If-None-Match:* | /api/v4/users/me/reading-states/{documentId} (chỉ khi tạo) |
| GET | `/api/v4/sync/bootstrap` | optional | 200 | none | none | — |
| GET | `/api/v4/sync/changes` | optional | 200 | none | none | — |
| GET | `/api/v4/capabilities` | public | 200 | none | none | — |
| GET | `/api/v4/health/live` | public | 200 | none | none | — |
| GET | `/api/v4/health/ready` | public | 200 | none | none | — |
| POST | `/api/v4/datasets` | admin | 201 | required | none | /api/v4/datasets/{id} |
| GET | `/api/v4/datasets/{id}` | admin | 200 | none | none | — |
| POST | `/api/v4/documents/{id}/index-jobs` | admin | 202 | required | none | /api/v4/jobs/{jobId} |

FR17 lấy ETag qua GET mốc trước lần cập nhật kế tiếp. FR20 dùng revision của Document trong multipart khi thay file. FR24 lưu theo hồ sơ trình duyệt và không có endpoint server.

Đăng nhập/session không được offline replay hoặc lưu password/session token trong receipt. POST search dùng snapshot TTL, không là GET ghi dữ liệu ngầm.
