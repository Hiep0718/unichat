# Architecture Decision Record — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-012 |
| Version | 2.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Product | AI Knowledge Platform for higher education |
| P0 slice | Adaptive Knowledge Retrieval & Reasoning |

## ADR-001 — Product framing

Decision: gọi sản phẩm là AI Knowledge Platform, nhưng P0 chỉ triển khai Adaptive Knowledge Retrieval & Reasoning.

Reason: giữ giá trị nghiên cứu rõ ràng mà không mở rộng sang Knowledge Graph, OCR, multi-agent hoặc memory dài hạn.

## ADR-002 — Ba runtime service trong monorepo

Decision: React SPA, Spring Boot Core API và FastAPI AI Service trong một monorepo.

Reason: Core sở hữu business/security; AI Service sở hữu extraction/retrieval/generation; frontend không chứa logic quyền. Monorepo giảm chi phí vận hành cho nhóm hai người.

## ADR-003 — Network boundary

Decision: chỉ frontend và Core API public. AI Service, PostgreSQL, ChromaDB và Ollama nằm trên private Docker network.

Reason: giảm bề mặt tấn công và ngăn client gọi thẳng retrieval/provider.

## ADR-004 — Authorization owner

Decision: Core API kiểm tra quyền trước khi gọi AI, truyền allowedDocumentIds và kiểm tra lại trước khi persist/return.

Reason: vector database không phải nguồn sự thật về quyền; reauthorization chống thay đổi ACL giữa request.

## ADR-005 — Authentication

Decision: access JWT RS256 15 phút; refresh token opaque 256 bit 7 ngày, hash trong DB, rotation/family reuse revocation; cookie HttpOnly/Secure/SameSite Strict; access token trong memory; CSRF double-submit + Origin. Hashing strategy, pepper usage, configuration contract và rotation implications phải được phê duyệt riêng trước refresh-token hashing implementation.

Reason: không lưu access token lâu dài ở browser và phát hiện refresh token bị đánh cắp.

## ADR-006 — Service authentication

Decision: Core ký service JWT RS256 exp tối đa 60 giây, gắn method/path/bodyHash/idempotencyKey/requestId/kid; AI kiểm signature, replay và claim binding.

Reason: network private không thay thế authentication và integrity.

## ADR-007 — Thay thế hàng đợi PostgreSQL bằng RabbitMQ cho Async Ingestion

Decision: Sử dụng RabbitMQ làm Message Broker chính cho hệ thống. Core API sẽ đóng vai trò Producer đẩy thông điệp vào queue, và AI Service sẽ làm Consumer để xử lý ingestion bất đồng bộ (idempotent, có retry và dead-letter queue). Loại bỏ thiết kế dùng PostgreSQL `resource_jobs` cũ.

Reason: Hệ thống đã đạt trạng thái READY. RabbitMQ cung cấp khả năng xử lý hàng đợi chuyên nghiệp, tin cậy, điều phối tốt giữa các microservices và dễ dàng mở rộng (scale) Consumer khi lượng tài liệu tăng cao.

## ADR-008 — Storage

Decision: PostgreSQL 18.4 cho nghiệp vụ, Chroma collection mục tiêu `unichat_chunks_v1` cosine cho vector, local file storage sau StoragePort. Python client hiện là `chromadb==1.5.9`, server hiện là `0.6.3`; compatibility contract chưa được chứng minh và chịu gate `SEC-DEBT-001`.

Reason: relational constraints và vector retrieval rõ ràng; interface cho phép thay local storage bằng MinIO trong tương lai.

## ADR-009 — Embedding

Decision: intfloat/multilingual-e5-base, 768 chiều, revision d128750597153bb5987e10b1c3493a34e5a4502a, prefix query:/passage:.

Reason: hỗ trợ tiếng Việt/đa ngôn ngữ, chạy local và tái lập bằng revision đóng băng.

## ADR-010 — Adaptive Retrieval v1

Decision: detector luật xác định với sáu intent, strategy mapping theo phiên bản và Evidence Gate ANSWER/CLARIFY/REFUSE. Không dùng LLM classifier P0.

Reason: giải thích được, unit-test được và phù hợp quy mô dataset. Chi tiết ở adaptive-retrieval-spec.md.

## ADR-011 — Generation provider

Decision: Gemini stable gemini-3.5-flash là primary; Ollama 0.31.2 là fallback một lần chỉ cho timeout/429/5xx. Không fallback cho validation/auth/safety/evidence refusal.

Reason: fallback phải giữ semantics và không che lỗi bảo mật hoặc thiếu bằng chứng.

## ADR-012 — Citation as contract

Decision: mọi factual claim cần citation hợp lệ; PDF dùng page, DOCX dùng logical block/paragraph/table cell, TXT dùng line range; locator gắn contentHash/extractorVersion.

Reason: citation là tiêu chí chất lượng và bằng chứng khóa luận, không chỉ metadata trang trí.

## ADR-013 — Delete saga

Decision: mark DELETING/revoke retrieval → xóa vector → xóa file → redact citation excerpt → hard delete content metadata → giữ audit không nội dung.

Reason: xóa phân tán không thể là một transaction; saga idempotent ngăn dữ liệu mồ côi và rò rỉ.

## ADR-014 — API và error contract

Decision: REST prefix /api/v1 và /internal/v1; opaque cursor; Idempotency-Key cho mutation quan trọng; RFC 7807 cho error; OpenAPI sinh từ code.

Reason: contract rõ, retry an toàn và frontend sinh type thay vì lặp DTO.

## ADR-015 — UI state

Decision: TanStack Query cho server state, React Context chỉ cho access token/auth session, React Hook Form + Zod cho form, local state cho presentation. Không Redux/Zustand P0.

Reason: giảm state trùng và chỉ thêm global store khi profiling/complexity chứng minh cần.

## ADR-016 — Logging và observability

Decision: structured JSON, traceparent/requestId xuyên service, Prometheus metrics, typed errors/global handlers; không log secret, raw token, toàn văn prompt/chunk.

Reason: debug được mà không tạo kênh rò rỉ dữ liệu.

## ADR-017 — Version strategy

Decision: direct dependency exact pin; cài từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review; không giả định ecosystem có lockfile khi repository không sử dụng. Docker image dùng tag + digest; không caret/tilde/latest. TypeScript giữ 6.0.3 thay vì nhảy major 7 vừa phát hành.

Reason: reproducibility quan trọng hơn chạy theo major mới.

## ADR-018 — Testing/evaluation

Decision: unit ≥80% core logic; integration cho mọi API/DB; Playwright cho critical flows; network ngoài hệ thống luôn mock. Nghiên cứu dùng 120 case, 60 development/60 holdout, split theo topic group.

Reason: tách kiểm thử phần mềm khỏi đánh giá nghiên cứu và ngăn data leakage.

## ADR-019 — Offset pagination cho P0

Decision: Sử dụng offset-based pagination (Spring Data `PageRequest`) cho tất cả list endpoints trong P0, thay vì cursor-based pagination opaque.

Reason: Dataset P0 nhỏ (users ~100, workspaces ~1000); offset đủ hiệu năng và Spring Data hỗ trợ native. Cursor-based refactor ảnh hưởng lớn đến backend custom query và frontend pagination component mà không mang lại giá trị tương xứng tại scale này. Sẽ nâng cấp khi dataset > 10.000.

## ADR-020 — CSRF protection exception cho P0

Decision: Không bật CSRF double-submit protection ở Core API (`csrf.disable()`) trong giai đoạn P0. Các cookie (`refresh_token`) được đặt `SameSite=Strict`.

Reason: Hệ thống stateless API sử dụng Bearer token không bị ảnh hưởng bởi CSRF. Cookie duy nhất thay đổi state là `refresh_token` đã được bảo vệ bởi cờ `SameSite=Strict`, đủ để ngăn chặn các cuộc tấn công CSRF phổ biến trên trình duyệt hiện đại trong môi trường development. CSRF double-submit sẽ là yêu cầu bắt buộc khi triển khai production với custom domain.

## Consequences

- Runtime đã được cung cấp theo version đã khóa; mỗi máy vẫn phải cung cấp evidence độc lập trước `READY — CORE-001`.
- Ba service tăng cấu hình nhưng ranh giới ownership và bảo mật rõ.
- Hệ thống đã tích hợp Message Broker (RabbitMQ) cho production-grade messaging; interface và schema được cập nhật tương ứng.
- Threshold ban đầu là giả thuyết, chỉ được thay qua calibration có version/hash.
- Mọi thay đổi ADR ảnh hưởng contract phải tạo ADR mới hoặc version mới, không sửa ngầm.

## Implementation gate

Design đã được phê duyệt. Mỗi implementation work item vẫn phải qua readiness, scope, review, test và delivery approval gates tương ứng.
