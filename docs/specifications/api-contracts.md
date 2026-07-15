# Hợp đồng API P0 — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-006 |
| Version | 1.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Public prefix | /api/v1 |
| Internal prefix | /internal/v1 |

## 1. Quy ước chung

- JSON UTF-8, camelCase; timestamp ISO-8601 UTC; ID là UUID.
- Access token gửi Bearer; refresh token chỉ qua cookie bảo mật.
- Content-Type upload là multipart/form-data; các endpoint khác application/json.
- List endpoint dùng limit mặc định 20, tối đa 100 và cursor opaque.
- POST mutation quan trọng nhận Idempotency-Key; cùng key khác request hash trả 409.
- Response mutation trả requestId; error dùng RFC 7807 application/problem+json.
- Header traceparent và X-Request-Id được truyền xuyên Core API/AI Service.
- API chỉ trả field người dùng được phép; không serialize entity trực tiếp.

## 2. Authentication

| Method | Route | Mô tả | Idempotency |
|---|---|---|---|
| POST | /auth/register | Đăng ký email/password | Có |
| POST | /auth/login | Trả access token; đặt refresh cookie | Không |
| POST | /auth/refresh | Xoay refresh token, trả access token mới | Không |
| POST | /auth/logout | Thu hồi token family hiện tại | Có |
| GET | /users/me | Hồ sơ người dùng hiện tại | Không |

Register/login validation: email hợp lệ tối đa 254 ký tự; password 12–128 ký tự. Client không nhận password policy internals hoặc lý do tài khoản tồn tại trong flow nhạy cảm.

## 3. Workspace và thành viên

| Method | Route | Quyền |
|---|---|---|
| GET | /workspaces | Người dùng đã đăng nhập |
| POST | /workspaces | Người dùng đã đăng nhập |
| GET | /workspaces/{workspaceId} | ACL READ |
| PATCH | /workspaces/{workspaceId} | OWNER/EDITOR theo field |
| DELETE | /workspaces/{workspaceId} | OWNER |
| GET | /workspaces/{workspaceId}/members | OWNER |
| POST | /workspaces/{workspaceId}/members | OWNER |
| PATCH | /workspaces/{workspaceId}/members/{userId} | OWNER |
| DELETE | /workspaces/{workspaceId}/members/{userId} | OWNER |

Workspace name 3–100 ký tự; description tối đa 1.000; visibility PRIVATE/SHARED/PUBLIC. Update nhận expectedVersion để optimistic locking.

## 4. Tài liệu

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| GET | /workspaces/{workspaceId}/documents | ACL READ | Cursor pagination |
| POST | /workspaces/{workspaceId}/documents | OWNER/EDITOR | Idempotency-Key bắt buộc |
| GET | /workspaces/{workspaceId}/documents/{documentId} | ACL READ | Metadata/status |
| DELETE | /workspaces/{workspaceId}/documents/{documentId} | OWNER | Async delete saga |
| GET | /workspaces/{workspaceId}/documents/{documentId}/jobs | OWNER/EDITOR | Trạng thái ingestion |

Giới hạn: 20 MiB/file; PDF tối đa 500 trang; DOCX tối đa 2.000 logical blocks; TXT UTF-8; 100 tài liệu hoặc 1 GiB/Workspace. Upload trả 202 với documentId, jobId và status PENDING.

## 5. Hỏi đáp và hội thoại

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| POST | /workspaces/{workspaceId}/questions | ACL ASK | Idempotency-Key bắt buộc |
| GET | /workspaces/{workspaceId}/conversations | ACL READ, chỉ của user | Cursor |
| POST | /workspaces/{workspaceId}/conversations | ACL ASK | Tạo rỗng |
| GET | /workspaces/{workspaceId}/conversations/{conversationId} | Chủ conversation + ACL READ | Kèm messages phân trang |
| DELETE | /workspaces/{workspaceId}/conversations/{conversationId} | Chủ conversation | Idempotent |

Question dài 3–2.000 ký tự; optional conversationId phải thuộc user/workspace. Response question:

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| messageId | UUID | Assistant message |
| conversationId | UUID | Hội thoại |
| decision | ANSWER/CLARIFY/REFUSE | Kết quả Evidence Gate |
| answer | string/null | Nội dung có Markdown an toàn |
| intent | enum | Sáu intent |
| strategyVersion | string | Phiên bản luật |
| citations | array | documentId, fileName, locator, excerpt, score |
| refusalCode | string/null | Lý do ổn định cho client |
| requestId | string | Đối soát log |

Question timeout ở client không đồng nghĩa thất bại; client retry cùng Idempotency-Key để lấy kết quả đã lưu.

## 6. Admin

| Method | Route | Quyền |
|---|---|---|
| GET | /admin/metrics | ADMIN |
| GET | /admin/users | ADMIN |
| PATCH | /admin/users/{userId}/status | ADMIN |
| GET | /admin/audit-events | ADMIN, chỉ metadata hệ thống |

ADMIN không có endpoint đọc nội dung Workspace riêng tư.

## 7. Evaluation

| Method | Route | Quyền |
|---|---|---|
| POST | /workspaces/{workspaceId}/evaluation-runs | OWNER/EDITOR |
| GET | /workspaces/{workspaceId}/evaluation-runs | OWNER/EDITOR |
| GET | /workspaces/{workspaceId}/evaluation-runs/{runId} | OWNER/EDITOR |
| GET | /workspaces/{workspaceId}/evaluation-runs/{runId}/results | OWNER/EDITOR |

Create run nhận datasetVersion, branch BASELINE/ADAPTIVE và configHash; trả 202. Evaluation không dùng dữ liệu ngoài scope và không chạy provider thật trong unit/integration test.

## 8. Internal AI API

Mọi route yêu cầu service JWT gắn method/path/body hash/idempotency key, exp tối đa 60 giây.

| Method | Route | Mục đích |
|---|---|---|
| POST | /ingestions | Extract, chunk, embed một document |
| DELETE | /documents/{documentId}/vectors | Xóa vector idempotent |
| POST | /retrieval/answers | Adaptive retrieval + generation |
| POST | /evaluations | Chạy một case đã khóa config |
| GET | /health/live | Liveness, không kiểm dependency |
| GET | /health/ready | Readiness của Chroma/model/provider config |

Retrieval request bắt buộc workspaceId, allowedDocumentIds, question, strategyVersion và requestId. AI Service từ chối nếu allowlist rỗng, bodyHash sai hoặc replay jti.

## 9. Problem Details

Error body có type, title, status, detail thân thiện, instance, code, requestId, timestamp và fieldErrors tùy chọn. Không trả stack trace, SQL, secret, đường dẫn file hoặc thông tin tồn tại của Workspace không được phép.

Mã chuẩn: VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, FILE_REJECTED, INGESTION_FAILED, EVIDENCE_INSUFFICIENT, PROVIDER_UNAVAILABLE và INTERNAL_ERROR.

## 10. Rate limit

- Login/register: 5 request/phút/IP và account.
- Question: 20 request/phút/user, tối đa 2 request đồng thời.
- Upload: 10 request/giờ/user.
- Admin/evaluation: 5 request/phút/user.
- 429 trả Retry-After; idempotent retry không tính lại nếu response đã tồn tại.

## 11. Contract verification

- OpenAPI được sinh từ code và kiểm tra breaking change trong CI.
- Mỗi public/internal endpoint có integration test success, validation, authentication, authorization và error contract.
- Frontend dùng type sinh từ OpenAPI; không duy trì DTO trùng lặp bằng tay.
- Provider/network ngoài hệ thống luôn mock trong test.
