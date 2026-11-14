# Thiết kế phần mềm và API hiện hành

Đọc sản phẩm/màn hình/luồng trước trong [29](../29-software-design.md), data trong [26](../26-data-domain-baseline.md), backend/policy trong [27](../27-backend-domain-baseline.md).

## Hợp đồng thiết kế

- [OpenAPI 3.1](software-api.openapi.json) mô tả request, response và ví dụ của API v4 đích.
- [Registry](resource-api.registry.json) và [matrix](resource-api-matrix.md) ghi method, quyền, status, retry, Location và điều kiện ghi.
- [Data domain](data-domain.contract.json) ghi thực thể, quan hệ và bất biến lưu trữ.
- [Kiểm OpenAPI và DTO](software-api-validation.json) và [kiểm baseline](domain-baseline-validation.json) ghi kết quả kiểm tĩnh. Xem [ca nghiệm thu](../28-design-decisions-and-verification.md#ca-nghiệm-thu-fr17-fr20-và-fr24) cho kiểm runtime sau triển khai.

Sửa nguồn chuẩn trong `scripts/design`, rồi sinh và kiểm từ repo root với dependency đã cài.

```sh
node scripts/design/domain-baseline.mjs
node scripts/design/software-openapi.mjs
node scripts/design/check-software-design.mjs
node scripts/design/domain-baseline.mjs --check
git diff --check
```

Lệnh `--check` và trình kiểm OpenAPI cập nhật báo cáo JSON trong thư mục thiết kế. Trình kiểm dùng Zod để biên dịch schema và kiểm fixture cùng ví dụ đã công bố.

## Hồ sơ trước

Hợp đồng này được đưa vào JSTS từ hồ sơ gửi nhóm ngày 13/11/2026. Các API v4 trong file là thiết kế đích. Các route FR12/FR14 ở nhánh Swagger có đặc tả triển khai riêng.
