# Core API examples

## Request ID

Client có thể gửi `X-Request-Id` gồm 1–64 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang. Core API tạo UUID mới nếu header thiếu hoặc không an toàn và luôn trả request ID trong response header.

## RFC 7807 error contract

Error response dùng `application/problem+json` và có các field:

| Field | Ý nghĩa |
|---|---|
| `type` | URN ổn định theo mã lỗi |
| `title` | Tiêu đề thân thiện |
| `status` | HTTP status |
| `detail` | Thông báo an toàn cho người dùng |
| `instance` | Request path |
| `code` | Mã lỗi máy đọc được |
| `requestId` | ID đối soát response và log |
| `timestamp` | Thời điểm UTC |
| `fieldErrors` | Lỗi theo field, chỉ xuất hiện khi có validation error |

Ví dụ validation response:

```json
{
  "type": "urn:unichat:problem:validation_error",
  "title": "Dữ liệu không hợp lệ",
  "status": 422,
  "detail": "Dữ liệu yêu cầu không hợp lệ.",
  "instance": "/api/v1/example",
  "code": "VALIDATION_ERROR",
  "requestId": "request-example-123",
  "timestamp": "2026-07-13T00:00:00Z",
  "fieldErrors": {
    "name": ["Tên không được để trống."]
  }
}
```

Unexpected errors trả `INTERNAL_ERROR` và không đưa exception message, stack trace, SQL, secret hoặc đường dẫn file vào response.
