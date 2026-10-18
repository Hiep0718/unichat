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
| POST | /auth/forgot-password | Gửi OTP 6 chữ số qua email để khôi phục mật khẩu | Không |
| POST | /auth/reset-password | Xác minh OTP và cập nhật mật khẩu mới | Không |
| GET | /users/me | Hồ sơ người dùng hiện tại | Không |
| PATCH | /users/me/password | Đổi mật khẩu người dùng đang đăng nhập | Không |

Register/login validation: email hợp lệ tối đa 254 ký tự; password 12–128 ký tự. Client không nhận password policy internals hoặc lý do tài khoản tồn tại trong flow nhạy cảm.

Forgot-password gửi OTP 6 chữ số qua email, hết hạn sau 5 phút. Reset-password yêu cầu email, OTP và mật khẩu mới (12–128 ký tự). OTP bị xóa sau khi sử dụng thành công. Endpoint trả response đồng nhất bất kể email có tồn tại hay không để ngăn enumeration.

Change-password yêu cầu mật khẩu hiện tại và mật khẩu mới (12–128 ký tự); trả 204 khi thành công, VALIDATION_ERROR khi mật khẩu hiện tại sai.

## 3. Workspace và thành viên

| Method | Route | Quyền |
|---|---|---|
| GET | /workspaces | Người dùng đã đăng nhập |
| POST | /workspaces | Người dùng đã đăng nhập |
| GET | /workspaces/explore | Người dùng đã đăng nhập | Khám phá workspace công khai |
| POST | /workspaces/{workspaceId}/join | Người dùng đã đăng nhập | Tham gia workspace công khai/chia sẻ |
| GET | /workspaces/{workspaceId} | ACL READ |
| PATCH | /workspaces/{workspaceId} | OWNER/EDITOR theo field |
| DELETE | /workspaces/{workspaceId} | OWNER |
| GET | /workspaces/{workspaceId}/members | OWNER |
| POST | /workspaces/{workspaceId}/members | OWNER |
| PATCH | /workspaces/{workspaceId}/members/{userId} | OWNER |
| DELETE | /workspaces/{workspaceId}/members/{userId} | OWNER |

Workspace name 3–100 ký tự; description tối đa 1.000; Update nhận expectedVersion để optimistic locking.

Ba mức visibility khác nhau về hành vi, không chỉ về nhãn (ADR-024):

| | PRIVATE | SHARED | PUBLIC |
|---|---|---|---|
| `POST /workspaces/{id}/members` | **400** — không thêm được thành viên | OWNER mời bằng email | OWNER mời bằng email |
| Hiện trong `GET /workspaces/explore` | không | không | có |
| `POST /workspaces/{id}/join` | 403 | 403 | 200, vào làm VIEWER |
| `GET /workspaces/{id}` và `/cover` cho người ngoài | 404 | 404 | 200 |
| Bài viết lên feed `scope=ALL` | không | không | có |

Hạ visibility xuống PRIVATE khi workspace còn thành viên ACTIVE khác trả **409**; xóa họ trước rồi mới hạ được. Luật này áp cho cả `PATCH /workspaces/{id}` lẫn `PATCH /admin/workspaces/{id}/visibility`; mức không hợp lệ trả 400.

### Chủ đề workspace (ADR-027)

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| GET | /workspaces/topics | Đã đăng nhập | Toàn bộ từ vựng (20 giá trị): `{name, label, icon, group, groupLabel}`. Dùng cho bộ chọn khi tạo/sửa. `Cache-Control: private, max-age=300` — ngắn vì không gì xóa cache trình duyệt khi deploy |
| GET | /workspaces/explore/topics | Đã đăng nhập | Chỉ chủ đề đang có workspace khám phá được: `{name, label, icon, count}`. Dùng cho thanh lọc ở Khám phá; không cache vì số đếm thay đổi |
| GET | /workspaces/explore?topic=... | Đã đăng nhập | Lọc theo một chủ đề; thiếu tham số nghĩa là mọi chủ đề; giá trị lạ trả 400 |

`POST /workspaces` và `PATCH /workspaces/{id}` nhận thêm `topics` (mảng tên chủ đề, tối đa 3). Trên PATCH, `null` giữ nguyên chủ đề hiện có còn mảng rỗng xóa hết. `WorkspaceResponse` trả về `topics`.

Danh sách khám phá sắp theo `updatedAt DESC, id DESC` — trước đây không có `ORDER BY` nên phân trang có thể lặp hoặc bỏ sót dòng.

### Link mời (ADR-025)

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| POST | /workspaces/{workspaceId}/invites | OWNER | `{role, expiresInDays 1–30, maxUses 1–200}`. Trả token **một lần duy nhất**; role chỉ VIEWER/EDITOR, OWNER trả 400. Workspace PRIVATE trả 400 |
| GET | /workspaces/{workspaceId}/invites | OWNER | Danh sách link, `token` luôn null vì chỉ hash được lưu |
| DELETE | /workspaces/{workspaceId}/invites/{inviteId} | OWNER | Thu hồi, idempotent |
| GET | /invites/{token} | **không cần đăng nhập** | Preview: chỉ `workspaceId`, tên nhóm, tên người mời, vai trò. `Cache-Control: no-store` |
| POST | /invites/{token}/accept | Đã đăng nhập | Tạo membership ACTIVE, tăng `used_count` và `permissionVersion` |

Token sai, hết hạn, hết lượt hoặc đã thu hồi đều trả **404** với cùng một thông báo, để người lạ không phân biệt được. Lượt dùng chỉ tăng ở `accept`, không tăng ở preview — bot xem trước link của ứng dụng chat tự gọi endpoint đó.

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
| POST | /retrieval/answers/stream | Streaming SSE Adaptive retrieval + generation |
| POST | /evaluations | Chạy một case đã khóa config |
| GET | /health/live | Liveness, không kiểm dependency |
| GET | /health/ready | Readiness của Chroma/model/provider config |

Retrieval request bắt buộc workspaceId, allowedDocumentIds, question, strategyVersion và requestId. Hỗ trợ tùy chọn `conversationHistory` (tối đa 20 tin nhắn gần nhất) và `conversationSummary` (tóm tắt đã compact, tối đa 5000 ký tự) cho short-term conversation memory (ADR-021). Response trả thêm `compactedSummary` khi xảy ra compaction. AI Service từ chối nếu allowlist rỗng, bodyHash sai hoặc replay jti.

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

## 12. Work Chat — nhắn tin 1-1 và nhóm

| Method | Route | Quyền | Ghi chú |
|---|---|---|---|
| GET | /work-chat/contacts | Đăng nhập | Người cùng nhóm với caller |
| GET | /work-chat/presence | Đăng nhập | Chỉ contact đang online |
| POST | /conversations/{id}/calls | Thành viên hội thoại 1:1 | Bắt đầu gọi. **201 kể cả khi máy bận hoặc offline** — khi đó `status` là `MISSED`, vì "không ai nghe" là kết quả của việc gọi chứ không phải lỗi khi gọi |
| POST | /calls/{id}/accept | Chỉ người được gọi | 409 nếu không còn đổ chuông |
| POST | /calls/{id}/decline | Chỉ người được gọi | 409 nếu không còn đổ chuông |
| POST | /calls/{id}/end | Hai bên | Cúp được cả lúc đang đổ chuông lẫn đang nói |
| POST | /calls/{id}/failed | Hai bên | Client báo peer connection không lên được; server không biết vì media không đi qua nó |
| GET | /calls/ice-servers | Đăng nhập | STUN công cộng + credential TURN ngắn hạn (TTL 10 phút). **Không cache** vì credential hết hạn |
| GET | /conversations/{id}/calls | Thành viên hội thoại | Lịch sử, mặc định 20 tối đa 100 |

**STOMP cho gọi 1:1** (cùng endpoint `/ws/work-chat`):

| Hướng | Destination | Nội dung |
|---|---|---|
| Client gửi | `/app/calls/{callId}/signal` | `{kind: OFFER\|ANSWER\|ICE, payload}` — server **không đọc** payload, chỉ chuyển tiếp. Kiểm tra quyền **mỗi frame** vì callId do client ghi vào destination |
| Server đẩy | `/user/queue/calls` | Thay đổi vòng đời: `{callId, conversationId, peerId, incoming, media, status, endReason}` |
| Server đẩy | `/user/queue/calls/signal` | Frame được chuyển tiếp: `{callId, kind, payload}` |
| GET | /work-chat/conversations | Participant | page/size, mặc định 20, tối đa 100 |
| POST | /work-chat/conversations/with/{userId} | Cùng nhóm | Tạo ở lần liên hệ đầu |
| GET | /work-chat/conversations/{id}/messages | Participant | Mới nhất trước |
| POST | /work-chat/conversations/{id}/messages | Participant | `application/json`: chỉ văn bản |
| POST | /work-chat/conversations/{id}/messages | Participant | `multipart/form-data`: part `body` tùy chọn, part `files` lặp lại |
| GET | /work-chat/conversations/{cid}/messages/{mid}/attachments/{aid}/content | Participant | Bytes của tệp |
| POST | /work-chat/conversations/{id}/read | Participant | Dời mốc nước đã đọc, idempotent |
| GET | /work-chat/conversations/{id}/participants | Participant | Thành viên, theo thứ tự tham gia |
| POST | /work-chat/groups | Đăng nhập | `{title, memberIds[]}`; người tạo là OWNER |
| PATCH | /work-chat/groups/{id} | OWNER | `{title}` |
| POST | /work-chat/groups/{id}/members | OWNER | `{userId}`; phải là contact của OWNER |
| DELETE | /work-chat/groups/{id}/members/{userId} | OWNER | Không tự xóa mình |
| POST | /work-chat/groups/{id}/leave | Participant | OWNER rời thì quyền chuyển cho người vào sớm nhất |
| PUT | /work-chat/groups/{id}/avatar | OWNER | `multipart/form-data`, part `file`; PNG/JPEG/WebP, tối đa 2 MiB |
| DELETE | /work-chat/groups/{id}/avatar | OWNER | Trở lại ảnh ghép từ thành viên |
| GET | /work-chat/conversations/{id}/avatar | Participant | PNG 256x256; 404 khi nhóm chưa đặt ảnh |

Tin nhắn cần có nội dung **hoặc** tệp; không có cả hai trả `VALIDATION_ERROR`. Nội dung tối đa 4000 ký tự, kiểm tra ở service nên áp dụng cho cả hai đường JSON và multipart. Giới hạn tệp: 5 tệp và tổng 20 MiB cho **mỗi tin nhắn**; allowlist PNG, JPEG, WebP, GIF, PDF, DOCX, TXT; vi phạm trả `FILE_REJECTED`.

Tệp không vào kho tài liệu Workspace và trợ lý AI không đọc chúng (ADR-022). `storageKey` không bao giờ xuất hiện trong response; nội dung chỉ phục vụ qua endpoint trên, luôn kèm `X-Content-Type-Options: nosniff`, `Cache-Control: private` và `Content-Disposition: inline` chỉ với ảnh trong allowlist — mọi định dạng khác là `attachment`.

Hội thoại không tồn tại và caller không phải participant trả **cùng** một `NOT_FOUND`, để một người lạ giữ UUID không suy ra được hội thoại đó có thật.

Nhóm: tên tối đa 120 ký tự, tối đa 50 người kể cả người tạo, cần ít nhất một thành viên khác. Mọi người được thêm phải là người caller đã nhắn tin 1-1 được (cùng nhóm), nếu không trả `FORBIDDEN` — nếu không nhóm sẽ thành đường lách luật đó. Thành viên mới đọc được toàn bộ lịch sử (ADR-023).

Gửi và đọc tin nhắn, cùng tệp đính kèm, dùng **chung** các route `/conversations/{id}/...` cho cả hai loại hội thoại.

`ConversationSummary` trả `kind`, `title` (tên nhóm, hoặc tên người còn lại), `otherUserId` (null với nhóm), `participants[]`, `lastMessage`, `lastMessageAt` và `unreadCount`. Tin nhắn **không** mang trạng thái đã đọc: đó là mốc nước của từng người, và `unreadCount` là hình thức duy nhất UI nhận được.

Đẩy tin nhắn trực tiếp qua STOMP tại `/ws/work-chat`, destination `/user/queue/messages`; token đi trên CONNECT frame. Tin nhắn nhóm được fan-out tới từng destination của từng người chứ không qua topic chung (ADR-023). `/user/queue/conversations` báo rằng danh sách hội thoại đã đổi khi không có tin nhắn nào — được thêm vào nhóm, bị xóa, nhóm đổi tên, hoặc nhóm đổi ảnh. Thân frame là id của hội thoại đã đổi, để client bỏ ảnh đã cache trước khi tải lại.
