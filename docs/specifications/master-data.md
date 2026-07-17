# Master data của hệ thống UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phạm vi | P0 — AI Knowledge Platform |
| Trạng thái | Target design; chưa được tạo bằng Flyway migration |
| Canonical readiness | `NOT READY` |
| Authorization owner | Core API |
| Nguồn thiết kế | `data-model.md`, `permission-matrix.md`, `api-contracts.md` |

## 1. Mục đích và phạm vi

Tài liệu này xác định dữ liệu tham chiếu, thực thể chủ và cấu hình phiên bản
được dùng nhất quán trong UniChat. Mục tiêu là tránh để mỗi service hoặc từng
feature tự định nghĩa role, status, quyền hay cấu hình retrieval khác nhau.

Master data trong tài liệu này gồm ba nhóm:

1. **Thực thể chủ nghiệp vụ**: định danh bền vững và được các giao dịch tham
   chiếu, như user, workspace và document metadata.
2. **Danh mục kiểm soát**: tập giá trị đóng hoặc được quản trị có kiểm soát,
   như role, status, visibility và decision.
3. **Cấu hình phiên bản**: cấu hình có version/hash để tái lập retrieval,
   evaluation và citation.

## 2. Thực thể chủ nghiệp vụ

| Master entity | Khóa/định danh | Mục đích | Chủ sở hữu | Ghi chú quản trị |
|---|---|---|---|---|
| `users` | UUID v7, email normalized unique | Tài khoản và định danh hệ thống | Core API | Không trả password hash, failed-login counter hay lock detail cho client. |
| `workspaces` | UUID v7 | Biên giới sở hữu, phân quyền và dữ liệu tri thức | Core API | Luôn có owner và ít nhất một membership `OWNER`. |
| `workspace_members` | `(workspaceId, userId)` | Quan hệ phân quyền của user trong workspace | Core API | Thay đổi quyền tăng `permissionVersion` và phải có audit event. |
| `documents` | UUID v7, `storageKey` unique | Metadata của nguồn tri thức đã upload | Core API | Chỉ document `PROCESSED` được phép đi vào retrieval allowlist. |

`users`, `workspaces` và `documents` là bản ghi chủ lâu dài, không phải bảng
danh mục seed cố định. `workspace_members` là quan hệ chủ về authorization và
không được AI Service dùng làm nguồn quyết định quyền độc lập.

## 3. Danh mục kiểm soát

Các giá trị dưới đây được lưu dạng `VARCHAR` có `CHECK` constraint thay vì
PostgreSQL enum type. Việc thêm, đổi nghĩa hoặc loại bỏ giá trị phải đi qua
migration, API contract và test liên quan.

| Danh mục | Giá trị được phép | Nơi dùng |
|---|---|---|
| System role | `USER`, `ADMIN` | `users.systemRole`; ADMIN quản trị account/metrics nhưng không mặc định đọc Workspace riêng tư. |
| User status | `ACTIVE`, `LOCKED` | `users.status`; account `LOCKED` không được refresh/access tài nguyên. |
| Workspace visibility | `PRIVATE`, `SHARED`, `PUBLIC` | `workspaces.visibility`; PUBLIC chỉ cho user đã đăng nhập đọc/hỏi. |
| Workspace member role | `OWNER`, `EDITOR`, `VIEWER` | `workspace_members.role`; OWNER quản lý thành viên/visibility/ownership. |
| Workspace member status | `ACTIVE`, `REVOKED` | `workspace_members.status`; chỉ membership ACTIVE cấp quyền. |
| Document status | `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`, `DELETING` | `documents.status`; PENDING, FAILED và DELETING bị loại khỏi retrieval. |
| Resource job type | `INGEST`, `DELETE` | `resource_jobs.jobType`; dùng cho ingestion và deletion saga. |
| Message role | `USER`, `ASSISTANT` | `messages.role`; phân biệt message đầu vào và câu trả lời. |
| Retrieval decision | `ANSWER`, `CLARIFY`, `REFUSE` | `retrieval_traces.decision` và response question API. |
| Evaluation split | `DEVELOPMENT`, `HOLDOUT` | `evaluation_cases.split`; case không sửa sau freeze. |
| Evaluation branch | `BASELINE`, `ADAPTIVE` | `evaluation_runs.branch`; phục vụ paired evaluation. |

Các danh mục sau là protocol values, không được frontend tự coi là điểm kiểm
soát bảo mật. Core API xác thực và authorization trước khi áp dụng chúng.

## 4. Cấu hình master có version

| Cấu hình | Giá trị/định danh hiện được chỉ định | Mục đích | Quy tắc thay đổi |
|---|---|---|---|
| Chroma collection | `unichat_chunks_v1` | Lưu vector chunk cho retrieval | Không dùng Chroma làm nguồn authorization. |
| Embedding model | `intfloat/multilingual-e5-base` | Sinh embedding 768 chiều | Lưu revision chính xác trong evidence/evaluation. |
| Embedding prefixes | `query:`, `passage:` | Chuẩn hóa query và chunk | Đổi prefix là thay đổi retrieval configuration. |
| Retrieval strategy | `strategyVersion`, `ruleId`, `configHash` | Quy tắc chọn chiến lược và Evidence Gate | Mọi trace/evaluation phải ghi version/hash. |
| Prompt | `promptVersion` | Tái lập generation behavior | Ghi trong trace và evaluation run. |
| Extractor/ingestion | `extractorVersion`, `ingestionVersion` | Nhận diện source/chunk đã thay đổi | Kết hợp `contentHash` để kiểm tra freshness. |
| Locator convention | PDF, DOCX, TXT locator types | Truy vết citation về vị trí nguồn | Mọi locator gắn `contentHash` và `extractorVersion`. |

Các giá trị trên là configuration master có version, không phải secret. Không
ghi API key, private key, token thô, password hoặc prompt có dữ liệu nhạy cảm
vào master data hay evidence.

## 5. Ownership và quyền quản trị

| Đối tượng | Ai tạo/cập nhật | Ai xem | Ràng buộc chính |
|---|---|---|---|
| User account | Register flow; ADMIN khóa/mở account | Chính user; ADMIN xem danh sách quản trị hạn chế | Không lộ password/hash hoặc lý do nhạy cảm. |
| Workspace | User đã đăng nhập tạo; OWNER/EDITOR sửa field phù hợp | Theo ACL | OWNER là người duy nhất đổi visibility, membership, ownership hoặc xóa. |
| Workspace membership | OWNER | OWNER; quyền hiệu lực theo ACL | Không cho OWNER cuối cùng rời hoặc tự hạ role. |
| Document metadata | OWNER/EDITOR upload; OWNER xóa | Theo ACL READ | Upload và delete phải đi qua transaction/job flow. |
| Danh mục controlled values | Migration và code contract được review | Client chỉ nhận field được phép | Không cho client gửi tùy ý giá trị ngoài catalog. |
| Retrieval configuration | Engineering change có review/evidence | Chỉ expose version/hash cần thiết | Không thay đổi khi evaluation/reproducibility chưa được kiểm soát. |

## 6. Dữ liệu không phải master data

Các bảng sau là transaction, operational state, telemetry hoặc audit; chúng
không được dùng làm danh mục master:

- `refresh_tokens`, `idempotency_records`, `rate_limit_buckets`;
- `resource_jobs` và state/lease theo từng lần thực thi;
- `conversations`, `messages`, `citation_history`;
- `retrieval_traces`, `retrieval_trace_items`;
- `evaluation_runs`, `evaluation_results`;
- `audit_events`.

`evaluation_cases` là dataset được version hóa cho nghiên cứu; nó không phải
danh mục vận hành chung và chỉ dùng dữ liệu được phép cho evaluation.

## 7. Quy tắc integrity và lifecycle

- Mọi record có scope Workspace phải lọc theo `workspaceId` trong query.
- Tạo Workspace và membership `OWNER` diễn ra trong cùng transaction.
- Thay đổi membership/visibility tăng `permissionVersion`; request đang chạy
  phải reauthorize trước khi trả/lưu kết quả AI.
- `documents` chuyển trạng thái qua service transaction; deletion saga phải
  loại document khỏi retrieval ngay khi chuyển `DELETING`.
- `refresh_tokens` chỉ lưu hash, không lưu raw token; đây là transaction data,
  không phải master data.
- Audit metadata không chứa secret hoặc nội dung nguồn đầy đủ.

## 8. Trạng thái triển khai hiện tại

Core API đã có Flyway dependency và configuration, nhưng repository hiện chưa
có migration SQL tạo các bảng trên. Vì vậy đây là target catalog cho P0, chưa
phải dữ liệu đã tồn tại trong PostgreSQL.

`CORE-001` dự kiến tạo nền tảng `users` và `refresh_tokens`. Các master entity
khác chỉ được triển khai theo work item đã được phê duyệt. Việc có tài liệu này
không chuyển canonical status khỏi `NOT READY` và không thay thế mandatory
readiness evidence từ hai máy.

## 9. Nguồn liên quan

- `docs/specifications/data-model.md`
- `docs/specifications/permission-matrix.md`
- `docs/specifications/api-contracts.md`
- `docs/specifications/architecture-decision.md`
