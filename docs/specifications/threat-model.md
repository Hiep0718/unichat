# Threat Model và kiểm soát bảo mật — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-005 |
| Version | 1.0 |
| Trạng thái | Ready for design approval |
| Phương pháp | STRIDE + 8-layer defense |

## 1. Tài sản cần bảo vệ

Tài khoản, refresh token, Workspace ACL, tài liệu gốc, chunk/vector, câu hỏi/câu trả lời, citation, retrieval trace, dữ liệu đánh giá, API key Gemini, service key, database credential và audit event.

## 2. Trust boundaries

1. Browser ↔ Core API qua HTTPS.
2. Core API ↔ PostgreSQL và local object storage.
3. Core API ↔ AI Service trên private Docker network.
4. AI Service ↔ ChromaDB, embedding model, Gemini và Ollama.
5. Upload không tin cậy ↔ extractor sandbox.

Chỉ Frontend và Core API được public. PostgreSQL, AI Service, ChromaDB và Ollama không publish port ra Internet trong production.

## 3. Threat register

| ID | STRIDE | Kịch bản | Mức | Kiểm soát chính |
|---|---|---|---|---|
| T-01 | Spoofing | Chiếm access/refresh token | Critical | RS256, refresh rotation, hash token, reuse detection |
| T-02 | Tampering | Sửa body khi Core gọi AI | High | Service JWT gắn method/path/body hash/idempotency key |
| T-03 | Repudiation | Phủ nhận thao tác chia sẻ/xóa | High | Audit append-only, requestId, userId, timestamp UTC |
| T-04 | Information disclosure | Retrieval chéo Workspace | Critical | Core ACL, allowedDocumentIds, vector metadata filter, reauthorization |
| T-05 | Information disclosure | Prompt injection làm lộ chunk khác | Critical | Corpus allowlist, prompt isolation, citation validator |
| T-06 | Denial of service | Upload lớn hoặc ask flood | High | Quota, rate limit, timeout, job lease, backpressure |
| T-07 | Elevation | VIEWER gọi endpoint OWNER | Critical | Permission policy tại service, integration test từng action |
| T-08 | Tampering | File giả định dạng/ZIP bomb/XML entity | High | Magic bytes, size/page/block limits, defusedxml, sandbox |
| T-09 | Information disclosure | Secrets/nội dung vào log | High | Structured redaction, no raw prompt/chunk/token |
| T-10 | Tampering | Citation trỏ sai nguồn | High | Content hash, locator validation, retry once rồi REFUSE |
| T-11 | Elevation | SSRF qua URL/file metadata | High | Không hỗ trợ URL ingestion P0, deny outbound mặc định |
| T-12 | Information disclosure | XSS trong answer Markdown | High | React escaping, raw HTML disabled, CSP |
| T-13 | Tampering | Idempotency key dùng lại với body khác | Medium | Request hash; trả 409 |
| T-14 | Information disclosure | Cloud provider nhận tài liệu cấm | High | Data classification và workspace cloudAllowed |
| T-15 | Denial of service | Worker chết giữ job | Medium | Lease timeout, retry có giới hạn, dead-letter state |

## 4. Authentication

- Access JWT ký RS256, hết hạn 15 phút, lưu trong memory của browser.
- Refresh token opaque ngẫu nhiên 256 bit, hạn 7 ngày, chỉ lưu hash trong PostgreSQL.
- Refresh token đặt trong cookie HttpOnly, Secure, SameSite=Strict, path riêng.
- Mỗi refresh xoay token; reuse làm thu hồi toàn bộ token family.
- Password hash Argon2id với tham số benchmark theo môi trường.
- Endpoint cookie-changing dùng CSRF double-submit và kiểm tra Origin.
- Account LOCKED chặn đăng nhập, refresh và thu hồi family.

## 5. Service-to-service

Core API phát service JWT RS256 riêng, exp không quá 60 giây, có iss, aud, jti, requestId, method, path, bodyHash, idempotencyKey và kid. AI Service kiểm tra signature, clock skew, replay jti và claim binding. Không dùng user access token làm service credential.

## 6. Input, upload và output

- Tất cả request DTO dùng Zod, Bean Validation hoặc Pydantic strict.
- File tối đa 20 MiB; PDF tối đa 500 trang; DOCX tối đa 2.000 logical blocks; TXT bắt buộc UTF-8.
- Kiểm tra extension, MIME và magic bytes; đổi tên bằng UUID; không dùng tên người dùng làm path.
- Tệp được lưu ngoài web root, quyền tối thiểu, không execute.
- XML parsing dùng defusedxml; extractor có timeout và memory limit.
- Answer Markdown không cho raw HTML; link có protocol allowlist và rel an toàn.
- Error trả Problem Details thân thiện; chi tiết và stack trace chỉ ở structured log.

## 7. Authorization và dữ liệu

- Áp dụng ma trận trong permission-matrix.md tại mọi endpoint.
- Repository chỉ dùng parameterized query/JPA criteria; không nối chuỗi SQL.
- Chroma filter bắt buộc workspaceId + allowedDocumentIds + ingestionVersion.
- Core reauthorize trước persist/return answer.
- Database backup mã hóa; secret lấy từ environment/secret store, không commit.
- Dữ liệu gửi Gemini phải qua cloudAllowed và không chứa secret/PII bị cấm.

## 8. Transport và browser

- HTTPS only, HSTS tại reverse proxy.
- CORS allowlist theo environment, không wildcard với credential.
- CSP tối thiểu: default-src self; script-src self; object-src none; frame-ancestors none; base-uri self.
- X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin.
- Cookie Secure trong production; không log Authorization/Cookie.

## 9. Rate limit và availability

- Auth: 5 lần/phút/IP và account, cooldown tăng dần.
- Ask: 20 lần/phút/user, tối đa 2 request đồng thời/user.
- Upload: 10 lần/giờ/user và quota 100 tài liệu hoặc 1 GiB/Workspace.
- Admin/evaluation: 5 lần/phút/user.
- Provider có timeout, circuit breaker và tối đa một fallback.
- Job ingestion dùng PostgreSQL FOR UPDATE SKIP LOCKED, lease và retry có backoff; không retry lỗi validation.

## 10. Xóa và retention

Delete saga:

1. Mark document DELETING và thu hồi khỏi retrieval.
2. Xóa vector theo documentId/ingestionVersion idempotently.
3. Xóa file gốc.
4. Redact source/excerpt trong citation lịch sử, giữ identifier tối thiểu.
5. Hard delete metadata nội dung; giữ audit không chứa nội dung theo retention.

Refresh token hết hạn/xóa sau 7 ngày; idempotency record 24 giờ; rate-limit bucket theo cửa sổ; raw retrieval trace nghiên cứu theo đề cương retention được duyệt.

## 11. Verification gates

- Security unit/integration tests cho auth, RBAC, IDOR, token rotation, CSRF, upload và vector filter.
- Dependency audit ở CI; direct dependency pin chính xác và lockfile được commit.
- Secret scanning và SAST trước merge.
- Không dùng network thật trong test; provider phải mock.
- Critical/High threat chưa có test hoặc kiểm soát là BLOCKER trước release.
