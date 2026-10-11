# Tasklist hoàn thiện UniChat — rà soát ngày 07/10/2026

## 1. Kết luận và phạm vi

UniChat đã có triển khai đáng kể trên web, Core API, AI Service và mobile. Việc tiếp theo là hoàn thiện tính đúng, phân quyền, độ bền dữ liệu và bằng chứng nghiên cứu của các luồng hiện có. Có UI hoặc có unit test chưa đồng nghĩa chức năng đã hoàn thành end-to-end.

- Phạm vi rà soát: đặc tả P0, source của bốn ứng dụng, migrations, CI, tests và checkpoint hiện hành.
- Snapshot: nhánh `feature/conversation-memory-compaction`, HEAD `aa67bdf`; working tree có nhiều thay đổi và file chưa tracked. Kết quả bao gồm cả các thay đổi chưa commit tại thời điểm đọc.
- Đây là backlog đề xuất để lựa chọn triển khai; không phải phê duyệt thay đổi kiến trúc, cài package, sửa database hay deployment.
- Không quy đổi số màn hình thành phần trăm hoàn thành. Không khẳng định trạng thái database/cloud thực tế từ source.
- P0 trong báo cáo: chặn độ đúng, bảo mật, luồng RAG hoặc bằng chứng khóa luận. P1: hoàn thiện sản phẩm đang có. P2: mở rộng tùy chọn.
- Size S/M/L là độ phức tạp tương đối, không phải cam kết ngày công; task L cần chia tiếp khi thiết kế.
- Owner ghi theo lớp trách nhiệm. Ownership đã ghi trong kế hoạch cũ: Hiệp phụ trách Core/DB/infra; Hùng phụ trách frontend/AI. Mobile và người review từng task cần chốt khi nhận việc.

## 2. Chức năng đã có và phần cần hoàn thiện

| Nhóm | Đã có trong source | Phần còn thiếu hoặc cần chứng minh |
|---|---|---|
| Tài khoản | Đăng ký, đăng nhập, refresh rotation, logout, OTP, đổi mật khẩu, hồ sơ/avatar | Transaction khi auth thất bại; giới hạn OTP; khóa tài khoản có hiệu lực với access token/socket; quyền admin thuần RBAC |
| Workspace | CRUD, PRIVATE/SHARED/PUBLIC, explore/join, quản lý member, ảnh bìa, thống kê | Policy thống nhất; chuyển owner/rời nhóm; xóa đầy đủ; optimistic concurrency; đồng bộ đặc tả contribution |
| Tài liệu | Upload batch, quota, storage local/Supabase, duyệt/từ chối contribution, preview/PDF split | Kiểm signature; job thật; publish đáng tin cậy; retry; version; vector cleanup; sync theo allowlist |
| Adaptive RAG | Detector YAML, strategy, Evidence Gate, E5/Chroma, provider, citation, trace | Grounding mặc định; source groups đúng spec; claim/hash validation; embedding revision; model/config freeze |
| Chat AI | Streaming SSE, Markdown/LaTeX/Mermaid, citations, history, summary compaction | Ràng buộc conversation–workspace; reauthorization; atomic persistence; idempotency stream; cancel/reconnect; streaming validation |
| Community | Feed, bài viết, replies, reactions, bookmarks, attachments, mention, @AI, notification, search | ACL sau AI; queue bền; pagination replies; mark-all thật; negative tests và validation attachment/thread |
| Work Chat | Direct messages, contacts, STOMP WebSocket, presence | Subscription authorization; token expiry/lock; reconnect/resync; phạm vi single-instance; E2E hai người dùng |
| Knowledge Studio | Parser sinh quiz/flashcard/mindmap/slides/report, podcast dialog, lưu note | Note ACL đang thiếu; tránh template sai nội dung; quiz distractor đúng; xác định artifact/export/audio nào thực sự hỗ trợ |
| Admin | User, workspace, document, AI Studio, biểu đồ telemetry | RBAC; retry thật; audit thật; lọc document; system metrics UI/backend; dữ liệu telemetry qua restart |
| Evaluation | Runner/storage/metrics/report nội bộ và 120 câu hỏi trong automation | Runner nội bộ đang mô phỏng; API workspace và UI chưa đầy đủ; dataset lệch spec; paired benchmark tái lập |
| Mobile | Auth, workspace, upload/list, chat stream/history/citation, đổi mật khẩu | Feed sample và vote local; post detail/community actions; member/settings; citation preview; lỗi/empty/pagination |
| Chất lượng/vận hành | Vitest/Jest/JUnit/pytest/Playwright, CI, Compose | Các gate chưa xanh; thiếu DB integration; E2E tách rời CI; dependency debt; migration integrity; backup/restore |

## 3. Bằng chứng kiểm tra trong phiên

| Kiểm tra | Kết quả | Ý nghĩa |
|---|---|---|
| `npm run typecheck --workspace frontend` | PASS | TypeScript hiện compile được |
| `npm run build --workspace frontend` | PASS; cảnh báo chunk khoảng 663 kB | Build được nhưng cần đo bundle/chat/document trước tối ưu |
| `npm run lint --workspace frontend` | FAIL: 34 errors, 2 warnings | Chủ yếu hooks, console và quy tắc code; chưa đạt zero-warning gate |
| `npm test --workspace frontend -- --reporter=dot` | 105 PASS, 1 FAIL; 18 test files | Landing test chưa tìm thấy heading trong thời gian chờ; có cảnh báo cập nhật FeedCard khi InlineComments render |
| `npm run typecheck --workspace mobile` | PASS | Mobile compile được ở mức TypeScript |
| `npm run lint --workspace mobile` | Exit 0; 5 warnings | Các import unused; script hiện chưa ép zero warnings |
| `npm test --workspace mobile -- --runInBand --silent` | 65/65 PASS, 21 suites | Không chứng minh feed gọi API thật hoặc native-device E2E |
| `core-api/mvnw.cmd -o -B verify` | BLOCKED | Maven cache thiếu Spring Boot parent 4.1.0; chưa chạy đến compile/test; không kết luận code Core fail |
| Python venv chạy Ruff | BLOCKED: Access denied | Chưa xác nhận Ruff/mypy/pytest/coverage trong phiên; không cài hoặc sửa runtime |
| Cloud/DB/live benchmark/E2E | Chưa chạy | Tránh gọi provider thật, đổi dữ liệu shared và dùng credentials của bộ automation |
| Coverage | Chưa đo lại | Số test pass không thay thế line/branch coverage ≥80% core logic |

## 4. Các phát hiện quan trọng có vị trí source

| Mã bằng chứng | Phát hiện từ đọc source | Nguồn |
|---|---|---|
| F01 | Admin route chỉ yêu cầu authenticated; service có ngoại lệ email chứa `taolahiep`; guard UI còn nhận email/displayName. Không tìm thấy `EnableMethodSecurity` trong main source | [SecurityConfiguration](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/shared/config/SecurityConfiguration.java), [AdminUserService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/admin/service/AdminUserService.java), [route-guard](file:///D:/codex-workspace/unichat/frontend/src/features/auth/route-guard.tsx) |
| F02 | AI verifier chấp nhận chuỗi bắt đầu `ey` mà không verify signature; eval/AI metrics router không gắn dependency xác thực chung | [security.py](file:///D:/codex-workspace/unichat/ai-service/app/core/security.py), [API router](file:///D:/codex-workspace/unichat/ai-service/app/api/v1/__init__.py), [ServiceTokenIssuer](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/shared/config/ServiceTokenIssuer.java) |
| F03 | Studio note list/create/delete kiểm workspace của conversation nhưng không kiểm conversation owner, note owner hoặc membership; `userId` không được dùng để authorize list/delete | [StudioNoteService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/StudioNoteService.java) |
| F04 | Chat chọn conversation theo user/id nhưng thiếu đối chiếu workspace path; không reauthorize sau AI; stream forward done trước bước persist | [ChatService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/ChatService.java), [SseChatService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/SseChatService.java) |
| F05 | Ingestion publisher log lỗi rồi bỏ qua; result consumer cũng bắt lỗi; admin retry chỉ set PENDING; DLQ tồn tại nhưng ingestion queue chưa có dead-letter arguments | [Producer](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/document/messaging/DocumentIngestionProducer.java), [Result consumer](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/document/messaging/IngestionResultConsumer.java), [RabbitMqConfig](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/config/RabbitMqConfig.java), [Admin operations](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/admin/api/AdminOperationsController.java) |
| F06 | Document delete mark DELETING, redact chat citation và xóa blob nhưng chưa xóa vectors/metadata theo saga; result đến muộn có thể set lại PROCESSED; workspace delete còn TODO | [DocumentService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/document/service/DocumentService.java), [WorkspaceService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceService.java) |
| F07 | Chroma connection lỗi có thể fallback sang EphemeralClient; embedding không pin revision; ghi `collection.add`; retrieval chưa filter ingestion version | [vector_store](file:///D:/codex-workspace/unichat/ai-service/app/services/vector_store.py), [retrieval_engine](file:///D:/codex-workspace/unichat/ai-service/app/core/rag/retrieval_engine.py) |
| F08 | External knowledge mặc định true; COMPARISON/SUMMARY/REASONING min groups đang là 1; citation validator nhận list rỗng và chỉ kiểm ID/locator/excerpt cơ bản | [Retrieval API](file:///D:/codex-workspace/unichat/ai-service/app/api/v1/retrieval.py), [strategy_selector](file:///D:/codex-workspace/unichat/ai-service/app/core/rag/strategy_selector.py), [citation_validator](file:///D:/codex-workspace/unichat/ai-service/app/core/rag/citation_validator.py) |
| F09 | Citation history sinh `chunk-N`, lưu score vào vị trí contentHash; tên nguồn có fallback sang tài liệu khác trong 10 tài liệu đầu | [ChatService](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/ChatService.java), [CitationExtractor](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/CitationExtractor.java) |
| F10 | Sync endpoint Core không kiểm role/workspace; AI reingest scan storage toàn bucket và gán PROCESSED, không lấy danh sách approved từ Core | [InternalEvalController](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/document/api/InternalEvalController.java), [reingest](file:///D:/codex-workspace/unichat/ai-service/app/services/reingest.py) |
| F11 | EvaluationRunner.run_single không gọi pipeline: predicted intent lấy expected intent, citation_valid=true, token cố định; benchmark suite dùng runner này | [evaluation runner](file:///D:/codex-workspace/unichat/ai-service/app/evaluation/runner.py), [benchmark suite](file:///D:/codex-workspace/unichat/ai-service/app/evaluation/benchmark_suite.py) |
| F12 | Dataset automation có 120 case nhưng split 39 DEVELOPMENT/81 HOLDOUT; FACT/DEFINITION 24, các intent còn lại 18; chưa có field source document/locator/topic group | [golden dataset](file:///D:/codex-workspace/unichat/automation-tests/data/golden-dataset.json) |
| F13 | Evaluation page và system metrics page là placeholder; audit endpoint trả ba event dựng sẵn; document status filter chưa áp dụng vào query | [EvaluationPage](file:///D:/codex-workspace/unichat/frontend/src/features/evaluation/evaluation-page.tsx), [AdminMetricPage](file:///D:/codex-workspace/unichat/frontend/src/features/admin/admin-metric-page.tsx), [AdminOperationsController](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/admin/api/AdminOperationsController.java) |
| F14 | Mobile feed khởi tạo FALLBACK_FEED; lỗi/empty không xóa sample; vote chỉ đổi local state; account có hàng cài đặt không action | [mobile feed](file:///D:/codex-workspace/unichat/mobile/app/%28tabs%29/feed.tsx), [mobile account](file:///D:/codex-workspace/unichat/mobile/app/%28tabs%29/account.tsx) |
| F15 | Flyway strategy sửa checksum V23 trực tiếp bằng SQL; config ignore missing/future migrations | [FlywayConfig](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/config/FlywayConfig.java), [application.yml](file:///D:/codex-workspace/unichat/core-api/src/main/resources/application.yml) |
| F16 | Pure/service files vượt 300 dòng; UI có file 600–866 dòng; root CI không chạy mobile hoặc automation E2E; backend chủ yếu Mockito/standalone MVC | [chat-message-item](file:///D:/codex-workspace/unichat/frontend/src/features/chat/components/chat-message-item.tsx), [CI](file:///D:/codex-workspace/unichat/.github/workflows/ci.yml), [Core tests](file:///D:/codex-workspace/unichat/core-api/src/test) |

Phát hiện bảo mật ở trên là kết quả phân tích source; chưa thực hiện khai thác trên môi trường đang chạy. SEC-DEBT-001 vẫn được tài liệu repository ghi là open; chưa quét advisory mới trong phiên. Việc source đã dùng Chroma không chứng minh exception đã được đóng.

## 5. Backlog chi tiết — 65 task đề xuất

Mỗi hàng là một hạng mục có thể giao việc, trạng thái đề xuất/chưa nghiệm thu. Tất cả task cần test phù hợp, cập nhật hành vi và evidence. Dấu “—” nghĩa không có phụ thuộc kỹ thuật bắt buộc; không bỏ qua cổng approval khi cài package/DB/delivery.

### A. Nền chất lượng, tài liệu và dữ liệu — owner Core/Frontend/AI

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| G01 | P0 / M | Sửa 34 lỗi + 2 cảnh báo frontend và 5 cảnh báo mobile; xử lý setState-in-render của comment; sửa landing test theo lazy loading và nội dung thật | Lint zero warnings; 106 frontend tests và 65 mobile tests pass; không disable rule/test để che lỗi | — |
| G02 | P0 / M | Khôi phục đường chạy Maven/Python được hỗ trợ; đồng bộ Java mục tiêu 21 với pom đang 17; chạy compile/lint/test/coverage Core và AI | Ghi rõ runtime, command, test counts, line/branch coverage; core logic ≥80%; mọi dependency install cần approval | — |
| G03 | P0 / M | Đồng bộ README/CHANGELOG/checkpoint với source; thống nhất các tài liệu mâu thuẫn cursor/offset, RabbitMQ/resource_jobs, model, collection và contribution | Một bộ contract hiện hành; checkpoint không còn “chưa có Git/chưa có Chroma”; lưu approval scope cũ, không tự đặt approval mới | — |
| G04 | P0 / M | Bỏ tự sửa checksum Flyway; xác minh V23 và lịch sử migrations; tách chính sách local/shared/production; review RLS theo DB role thực tế | Fresh DB + upgrade DB pass; sửa migration đã áp dụng phải báo mismatch; không đổi DB shared tự động; RLS test owner/viewer/cross-workspace | G02 |
| G05 | P0 / M | Xử lý/revalidate SEC-DEBT-001 bằng inventory và compatibility evidence; pin manifest còn caret/tilde/latest theo policy đã chốt | Audit xác minh được, không Critical/High chưa xử lý; client/server upsert/query/delete pass; exception chỉ đóng khi đủ evidence | G02 |

### B. Bảo mật và tài khoản — owner Core/AI/Frontend

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| S01 | P0 / M | Admin chỉ dựa systemRole và trạng thái account; bỏ đặc quyền theo email/displayName; enforce route/service; ngăn mất admin cuối cùng | USER gọi mọi admin API nhận 403; email chứa tên đặc biệt không tăng quyền; ADMIN không tự đọc nội dung PRIVATE; negative integration tests | G02 |
| S02 | P0 / L | Service JWT RS256 thật: exp≤60s, kid, audience/issuer, method/path/bodyHash/requestId/idempotency binding; chống replay; auth chung eval/metrics/retrieval | JWT bắt đầu ey nhưng giả/expired/wrong body/path/jti bị reject trước vector/provider; health probe có exception tường minh; secret mặc định bị từ chối ở prod | G02 |
| S03 | P0 / M | CORS từ env allowlist; cookie Secure/HttpOnly/SameSite theo profile; Origin/CSRF cho refresh-cookie trước production; CSP/TLS/security headers | Unknown origin không được credentialed CORS; refresh bị chặn từ origin sai; test cookie flags; không dùng wildcard production | G03 |
| S04 | P0 / M | Khóa/đổi role/reset password phải thu hồi refresh và chặn access/socket còn sống; kiểm issuer/audience của access JWT | Locked user không đọc API/nhận Work Chat; mở khóa có policy rõ; tests dùng token cấp trước lúc lock | S01 |
| S05 | P0 / M | Sửa auth failure transaction: login attempts/reuse revoke phải persist dù trả 401; rotation concurrent phải atomic; hash/limit/resend/one-time OTP; lỗi mail có trạng thái | DB integration chứng minh counters và revokedAt tồn tại sau failure; 2 refresh đồng thời không tạo 2 token active; OTP brute force/reuse/expiry bị chặn | G04 |
| S06 | P0 / M | Implement rate limit cho login/register/OTP/question/upload/evaluation và concurrency question; retention cleanup idempotency/OTP/token | 429 + Retry-After; question tối đa 2 concurrent/user; limits theo spec; cleanup không xóa active data; clock deterministic tests | S05 |

### C. Workspace và phân quyền tài nguyên — owner Core/Frontend

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| W01 | P0 / M | Dùng permission policy chung cho PRIVATE/SHARED/PUBLIC, resource status và contribution; giải quyết lệch spec VIEWER không upload với flow chờ duyệt đang có | Matrix READ/ASK/UPLOAD/APPROVE/DELETE đúng toàn endpoint; pending/rejected không vào allowlist; PUBLIC read/join có contract rõ | G03 |
| W02 | P1 / M | Hoàn thiện rời nhóm/chuyển ownership; bảo vệ owner cuối; member error/empty/loading; optimistic version khi đổi quyền/visibility | Transfer atomic; owner mới/owner cũ đúng role; không được kick owner cuối; request version stale trả 409; tests Core + UI | W01 |
| W03 | P1 / M | Hoàn thiện list/search/explore/join với phân trang và debounce 300ms; validate page/size; tránh N+1 thống kê | Max100/default20; >20 workspace vẫn truy cập được; join lặp không duplicate; bộ lọc không chỉ tìm trên trang đầu; measured query counts | W01 |
| W04 | P0 / M | Studio note phải thuộc conversation của user và workspace còn quyền; mọi list/create/delete kiểm ownership và resource state | User B không đọc/tạo/xóa note của A; user bị revoke không truy cập note cũ; note/conversation/workspace IDs không tráo được | W01 |

### D. Tài liệu, ingestion và xóa dữ liệu — owner Core/AI/Frontend

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| D01 | P0 / M | Validate magic/signature PDF/DOCX, UTF-8 TXT, page/block limits, zip expansion; giữ filename tiếng Việt riêng storage key; quota/upload rollback | Sai MIME/signature/20MiB/500 trang/2000 blocks bị reject; không blob orphan khi DB rollback; quota concurrency không vượt; filename full dấu | G04 |
| D02 | P0 / M | Lưu jobId/attempt/state/timestamps/errorCode thực; chuyển PENDING→PROCESSING→PROCESSED/FAILED; jobs API và progress phản ánh dữ liệu thật | Job ID tồn tại sau reload; failure reason thân thiện; không dùng chunkCount làm pageOrBlockCount; tests lifecycle và invalid transitions | D01 |
| D03 | P0 / M | Publish ingestion bền sau DB commit, chọn outbox/publisher confirms theo thiết kế; lỗi broker không biến thành “thành công rồi treo” | DB commit/broker down/crash có recovery; rollback không enqueue; không log rồi bỏ lỗi; fault-injection tests không network ngoài | D02 |
| D04 | P0 / M | Retry API phải enqueue job thật; retry backoff/attempt cap; nối DLX vào ingestion queue; result update ACK/NACK có semantics đúng | FAILED retry→PROCESSING→PROCESSED; duplicate messages idempotent; poison message vào DLQ; DB lỗi không ACK mất result | D03 |
| D05 | P0 / M | Version ingestion và idempotent vector upsert; loại vectors version cũ; ngăn late result phục hồi tài liệu DELETING/REJECTED | Ingest hai lần không duplicate; query chỉ currentVersion; delete-during-ingestion không set PROCESSED trở lại | D04, G05 |
| D06 | P0 / L | Delete document/workspace saga: revoke→delete vector v1/v2→blob→redact mọi citation/note-derived content theo policy→metadata→audit; reconciliation | Retry từng bước sau crash; không file/vector orphan; chat và community không còn excerpt nguồn đã xóa; workspace không treo DELETING | D05, W01 |
| D07 | P0 / M | Sync/reingest do Core cấp document manifest đã approved; cấm scan toàn bucket từ user thường; trạng thái job durable và phân trang storage | VIEWER/khác workspace không trigger sync; pending/rejected/deleted không vào vector; sync >100 files đủ; restart có progress/recovery | S02, D05 |
| D08 | P1 / M | UI tài liệu: upload progress, failure/retry, poll cleanup, contribution decision/reason, preview locator PDF/DOCX/TXT, action theo role | Happy path upload→approval→processed→citation; error/cancel/retry không duplicate; empty/loading/access denied rõ; keyboard/focus tests | D02, D04, W01 |

### E. Adaptive Retrieval, grounding và citation — owner AI/Core

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| R01 | P0 / M | Chốt và enforce RAG chỉ từ nguồn mặc định; external knowledge là chế độ được duyệt/ghi nhãn riêng; không biến thiếu bằng chứng thành answer | Empty/weak corpus→CLARIFY/REFUSE; provider không gọi khi gate từ chối; mode external không lẫn benchmark grounded | W01, G03 |
| R02 | P0 / M | Đồng bộ source-group rules và strategyVersion/configHash; COMPARISON một nguồn theo spec không ANSWER; strategy lấy config đã version hóa | AC-AR-01/03/04/06 pass; không hạ min groups ngầm; mọi ngoại lệ 1 nguồn cần scope được duyệt và dataset riêng | R01 |
| R03 | P0 / L | Structured generation schema + claims/citationIds; kiểm claim coverage, chunk tồn tại, excerpt/contentHash/locator; retry cùng evidence đúng một lần | ANSWER không factual claim vô citation; bịa chunk/hash/locator/empty citation→retry→REFUSE; stream và nonstream cùng invariant | R02 |
| R04 | P0 / M | Truyền/persist chunkId, contentHash, extractorVersion, locator thật; tên file lấy đúng doc trong workspace; bỏ fallback gán file khác | Citation của tài liệu thứ 11+ vẫn đúng; không sinh chunk-N/hash từ score; reload giữ nguồn chính xác; invalid doc bị reject | R03, D05 |
| R05 | P0 / M | Pin E5 revision/dimension/normalization và provider/prompt/temperature; thống nhất streaming/nonstream fallback; Ollama nhận cùng evidence, không chỉ question; benchmark cấm model hopping | Reproducible config snapshot; auth/validation/safety không fallback; timeout/429/5xx đúng policy; không latest; stream không nối đáp án từ 2 model; fallback vẫn grounded | S02, G05 |
| R06 | P0 / M | Trace đầy đủ cho stream/nonstream/@AI: scores/source groups/coverage/tokens/provider/latency/config hash; persistent owner và retention | requestId truy vết tới message/run; log không prompt/token/chunk; trace sau restart còn dùng được; Core/AI ownership không vượt boundary | R04, R05 |
| R07 | P0 / M | Calibration chỉ development; freeze strategy; phân tích các lỗi intent, chunk boundary, single-source và OOS technical keyword | Dương/âm/priority tiếng Việt; câu học thuật về “hack/system prompt” không bị chặn chỉ vì keyword; holdout không dùng tune | E02, R02 |

### F. Chat, SSE và memory — owner Core/AI/Frontend

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| C01 | P0 / M | Conversation ID phải đồng thời thuộc user/workspace path; reauthorize user/status/permissionVersion/allowed docs trước persist và trước return | ID conversation workspace A gửi qua B bị reject trước AI; revoke/delete/lock lúc AI chạy không lưu/return nguồn không còn quyền | W01, S04 |
| C02 | P0 / M | Tách AI network call khỏi transaction dài; persist message/citations/trace/summary bằng service transaction rõ; done chỉ sau commit | DB fault không để half-message/citations; done mang assistantMessageId thật; reload immediately thấy result; error có requestId | C01, R04 |
| C03 | P0 / M | Idempotency-Key bắt buộc theo contract cho question/upload; stream có request operation/replay contract; concurrent keys xử lý atomically | Timeout retry cùng key không tạo đôi messages/files; cùng key khác body→409; duplicate stream không gọi model lần nữa | C02, D03 |
| C04 | P1 / M | SSE cancel/timeout/disconnect/reconnect, backpressure và bounded executor; trạng thái incomplete/error tường minh; client parser xử lý UTF-8 boundary | Abort dừng upstream; EOF thiếu done không báo success; partial answer không được nhận là citation-validated; tests fragmentation/cancel | C02, R03 |
| C05 | P0 / M | Memory/compaction đúng budget, summary version locking, context isolation; kiểm retrieval cho câu “nó…” bằng context đúng, không chỉ bỏ CLARIFY | Concurrent turns không overwrite summary; summary xóa/revoke nguồn theo policy; UI + AI tests chứng minh câu follow-up lấy đúng nguồn | C01, R05 |
| C06 | P1 / M | Chat/history UI: pagination messages, stable order/scroll, send state, refusal reason, citation navigation; XSS tests Markdown/Mermaid/SVG | Long conversation không mất tin; raw HTML/javascript links không chạy; clipboard/TTS có fallback UI rõ; render math/code sau stream tốt | C03, C04, R04 |

### G. Admin vận hành — owner Core/Frontend/AI

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| A01 | P0 / M | Audit event store append-only từ thao tác thật; thay 3 event dựng sẵn; filters/pagination/requestId/actor/outcome; không nội dung private | Promote/lock/retry/delete có event thật; empty DB trả empty; USER403; restart vẫn xem được; logs redact | S01, G04 |
| A02 | P1 / M | Implement `/admin/metrics` và thay placeholder UI bằng user/workspace/document/job totals, error rate và dependency status | Counts khớp fixture DB; không đọc private content; loading/error/no-data; không suy đoán online từ port cố định | S01, D02 |
| A03 | P1 / M | Document/workspace admin filters thật; visibility mutation validated DTO + permissionVersion; delete dùng saga; tránh N+1 | Filter FAILED không trả PROCESSED; invalid visibility400; admin action audit; không delete repository trực tiếp bỏ cleanup | S01, A01, D06 |
| A04 | P1 / M | AI Studio telemetry persistent/retention; ghi streaming usage; phân biệt no-data/sample; model/key config được mask, quyền ping chặt | Chart dựa event thật sau restart; USER không xem key metadata; provider lỗi không lộ secret; test SSE/nonstream accounting | S01, S02, R06 |

### H. Evaluation và bằng chứng khóa luận — owner AI/Core/Frontend + hai người gán nhãn

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| E01 | P0 / M | Thay EvaluationRunner simulation bằng pipeline adapter có branch BASELINE/ADAPTIVE; fixture adapter chỉ dùng tests; baseline fixed Top-K thật | Predicted intent/citation/tokens lấy output thực; branch tạo strategy khác; invalid case không được tự chấm true; isolated unit tests | R02, R05 |
| E02 | P0 / L | Curate/version dataset 120 cases, 20 mỗi intent; split 60/60 theo topic; expected docs/chunks/locator/evidence labels; review draft và nhãn độc lập | Manifest validation count/split/topic disjoint; Cohen kappa≥0,70; không giữ placeholder question; nguồn có quyền; điều chỉnh scope khác phải được duyệt | G03, D05 |
| E03 | P0 / M | Paired runs dùng cùng corpus/chunking/model/prompt/embedding; config SHA-256 thật; checkpoint/resume theo case+branch; execution state/cancel | 120×2 results; resume không bỏ ADAPTIVE vì BASELINE xong; compatibility fail không tiếp tục giả thành công; failed run không COMPLETED | E01, E02, R06 |
| E04 | P0 / M | Metric thật source hit@K/MRR, citation source+locator, claim support, refusal F1, intent confusion, latency/tokens; paired bootstrap1000 CI95% | Metric từ raw rows và ground truth; keyword hit không thay citation accuracy; report âm/dương đều giữ; deterministic metric tests | E03 |
| E05 | P0 / M | Core workspace evaluation API create/list/detail/results, OWNER/EDITOR ACL, async RabbitMQ, status/retention; AI nhận authorized scope | API202+runId; VIEWER403; cross-workspace404; result pagination; AI không quyết định quyền; lưu metadata theo ADR được chốt | S02, W01, E03 |
| E06 | P0 / M | Evaluation web UI tạo run, chọn dataset/branch đã freeze, progress/resume/cancel, summary/detail/export; thay placeholder | E2E fake-provider tạo→completed→results; invalid config bị chặn; không khởi chạy provider thật ngoài run được phép | E04, E05 |

### I. Community và Work Chat — owner Core/Frontend

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| P01 | P0 / M | Reauthorize @AI sau inference; event bền/idempotent, state QUEUED/RUNNING/FAILED; không mất tác vụ khi process restart | Revoke/delete post trước AI done không persist citation trái quyền; duplicate event chỉ một reply; timeout hiển thị retry rõ | C01, D03, R04 |
| P02 | P1 / M | Replies pagination; validate parentReply cùng discussion; permissions edit/delete/accept/pin; reactions/bookmarks race; search debounce | Không parent thread khác; >100 replies có next page; counts không âm/trùng; search không lộ workspace không được phép | W01 |
| P03 | P1 / M | Notification unread/mark-all bằng query đúng toàn bộ; privacy sau revoke; attachment validator và lifecycle khi xóa post | >100 unread đều được mark; user khác không mark; notification không còn excerpt trái quyền; file spoof/oversize bị reject và cleanup | W01, D06 |
| P04 | P0 / M | Work Chat authorize SUBSCRIBE/SEND, reject raw queue/foreign user destinations; JWT expiry/lock disconnect; reconnect REST resync | Hai user chỉ nhận DM của mình; user thứ ba không subscribe queue người khác; refresh reconnect không mất/trùng tin; ghi giới hạn single process | S04, S03 |

### J. Mobile hoàn thiện nghiệp vụ — owner Mobile cần phân công

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| M01 | P1 / M | Bỏ sample feed ở mode thật; adapter đúng FeedPostResponse; server pagination/filter/reaction persistence + optimistic rollback | API empty→empty UI; API lỗi→error/retry; vote reload vẫn còn; hasAcceptedAnswer/reactions/createdAt mapping đúng | P02 |
| M02 | P1 / L | Post detail, replies/mention/@AI/bookmark, compose và attachment nếu scope mobile giữ community parity | Feed card mở bài đúng; đăng/reply/react gọi API thật; permission lỗi rõ; integration tests mock full flows | M01, P01, P03 |
| M03 | P1 / M | Explore/join/member/settings trên mobile theo priority được chốt; workspace role actions và list pagination | Có >20 workspace vẫn xem được; VIEWER không thấy admin actions; invitation/join lỗi và reload role được kiểm chứng | W02, W03 |
| M04 | P1 / M | Upload/approval/status/retry/document preview trên mobile; citation mở file và locator thật; guard revoked/deleted source | Native picker MIME/size validation; processed mới ask; citation PDF đúng trang; expired download URL có refresh path; test mocked | D08, R04 |
| M05 | P1 / M | Account profile/avatar/settings/notification actions thật hoặc đánh dấu chưa hỗ trợ; SecureStore/session foreground/logout/network loss | Token không lộ log/storage không an toàn; offline không dùng sample như dữ liệu thật; logout clears caches; native smoke iOS/Android | S04, P03 |

### K. Knowledge Studio và trải nghiệm — owner Frontend/Core/AI

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| K01 | P1 / M | Chốt Studio dùng parser hay AI-generated artifact; bỏ generic fallback giả nguồn; quiz distractor không lấy phát biểu đúng khác làm sai | Ít nội dung→thông báo thiếu; quiz một đáp án đúng rõ; artifact giữ source citation; tests fact validity và unsupported format | W04, R03 |
| K02 | P2 / M | Nếu giữ phạm vi: export notes/report/slides, audio podcast thật và playback state; phân biệt dialogue preview với audio | Download artifact đúng nội dung; tiếng Việt full dấu; audio có play/pause/error; giới hạn provider/cost phải được duyệt trước | K01 |
| K03 | P2 / S | Hoàn thiện web preferences theme/language/accessibility và persist settings; thay mục đang phát triển theo scope | Setting reload còn giá trị; keyboard/focus/contrast đạt; text tiếng Việt không mất dấu; không giới thiệu feature chưa hoạt động | G01 |

### L. Kiểm thử và CI — owner từng module + reviewer độc lập

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| T01 | P0 / L | DB/API integration thật bằng Testcontainers/controlled fixtures; auth transaction, RBAC/IDOR, quota, publish failure, delete race, FK/migrations | Endpoint success/validation/authn/authz/failure; persistence assertions sau commit/rollback; không chỉ mock repository | G02, G04, S01–S05, D03–D06 |
| T02 | P0 / M | E2E local fake-provider critical flows; nối frontend/e2e và automation suites vào một entry rõ; tách live benchmark khỏi regression | Login→workspace→upload→ask→citation→reload; revoke/delete/admin/eval/memory; CI không outbound cloud/secret test credentials | C06, D08, E06, P04 |
| T03 | P0 / M | CI có mobile lint/typecheck/Jest, E2E và core-logic coverage enforcement; publish JUnit/coverage/artifacts; contract generation/diff | Fresh runner xanh; Core JaCoCo check thật ≥80%; UI coverage không thay core gate; breaking contract fail; no skipped tests | G01, G02, T01, T02 |
| T04 | P1 / M | Refactor file/function vượt chuẩn có rollback plan và tests bảo vệ; inject HTTP/clock/storage/provider ports; thay DTO Map bằng schema | Logic≤30 dòng, UI≤100 JSX/max500 file, service≤300; test hành vi giữ nguyên; public API docs/barrels; không refactor đồng loạt không có scope | G01, T01 |

### M. Vận hành và bàn giao — owner Core/Infra/AI

| ID | P / Size | Việc cần làm | Tiêu chí hoàn thành / test | Phụ thuộc |
|---|---|---|---|---|
| O01 | P0 / M | Chroma production persistent và fail-closed; readiness kiểm đúng client/server/model/broker/storage; hoàn thiện Compose/test stack hiện mới có PostgreSQL+Chroma, thống nhất cloud/local; isolate ports | Chroma down→not ready/503, không tự chuyển ephemeral; restart không mất vectors; local fake-provider/broker/storage không phụ thuộc cloud; TestClient không mở consumer thật | G05, D04, S02 |
| O02 | P1 / M | Backup/restore DB+blobs+vectors; reconcile orphan/failed jobs; key rotation/retention và observability requestId xuyên service | Restore trên môi trường disposable chứng minh được; alert backlog/failure; không log prompt/chunk/key; runbook rollback có commands được review | D06, R06, A01 |
| O03 | P0 / M | Đóng gói bằng chứng và demo P0, API examples/generated contract, CHANGELOG, nghiên cứu results/case studies; delivery checklist | Một demo tái lập bằng fake provider; ≥10 case study; không khẳng định adaptive tốt hơn thiếu CI; compile/lint/tests xanh; commit/push/deploy xin approval riêng | E04, E06, T03, O01 |

## 6. Thứ tự triển khai đề xuất

| Đợt | Task chính | Điều kiện chuyển đợt |
|---|---|---|
| 1 — Kiểm soát quyền và baseline | G01–G05; S01–S05; W01/W04; C01; khóa các endpoint sync chưa đúng ACL | Có kiểm tra mới đáng tin; admin/note/service/IDOR không bypass; schema policy và Chroma debt được chốt |
| 2 — Tài liệu và chat đáng tin cậy | D01–D07; R01–R06; C02/C03/C05; S06; P01/P04; A01 | Upload/retry/delete/revoke không mất dữ liệu hoặc rò nguồn; answer/citation/history có invariant và trace |
| 3 — Bằng chứng nghiên cứu P0 | E01–E06; R07; T01/T02; O01 | Dataset freeze; paired results thật; Evaluation UI/API hoạt động; integration/E2E pass |
| 4 — Hoàn thiện sản phẩm đã mở rộng | W02/W03; D08; C04/C06; A02–A04; P02/P03; M01–M05; K01; T04 | Tất cả nút advertised gọi nghiệp vụ thật; error/empty/pagination đầy đủ; mobile smoke |
| 5 — Release evidence | T03; O02/O03; K02/K03 nếu còn phạm vi | Gate xanh, restore/demo tái lập, tài liệu đồng bộ, user phê duyệt delivery riêng |

Critical path P0: sửa auth/ACL và schema baseline → reliable ingestion/version/delete → grounded RAG/citation + chat persistence → frozen dataset + paired execution → evaluation UI/metrics + integration/E2E → evidence/demo.

Các nhánh có thể giao việc song song sau khi thống nhất contract: frontend lint/UI, Core RBAC/ingestion, AI citation/evaluation, mobile feed. Đây là gợi ý tổ chức nhân sự; không tự tạo subagent hoặc giao task cho người khác trong phiên.

## 7. Ranh giới phạm vi và quyết định cần chốt khi bắt đầu task

1. Grounded-only có giữ là default P0 hay external knowledge trở thành mode chính? Đặc tả hiện tại yêu cầu không lấp khoảng trống bằng kiến thức nền.
2. COMPARISON một nguồn: giữ REFUSE theo AC-AR-03 hay phê duyệt strategy version mới có warning? Không sửa threshold ngầm.
3. Contribution VIEWER chờ duyệt: cập nhật permission matrix cho hành vi đã có, hay giới hạn upload OWNER/EDITOR như đặc tả gốc?
4. Evaluation lưu metadata/results tại Core DB hay local JSON riêng? Source hiện khác data-model; chốt ADR và boundary trước xây public API.
5. Mobile cần ngang chức năng web hay chỉ auth/workspace/documents/chat? M02/M03/M05 là đề xuất phạm vi, không phải tính năng P0 đã được duyệt.
6. Studio parser/template được chấp nhận tới đâu, và podcast/slides export là requirement thật hay roadmap? Không xem parser dialog là audio generation đã xong.

Các điểm trên không cản việc nhận G01, S01, W04 và tái kiểm G02/G05; chúng cần câu trả lời trước triển khai thay đổi hành vi liên quan.

Không đưa OCR, Knowledge Graph, multi-agent AI, hybrid search, reranker, long-term cross-session memory hoặc thông báo lịch học mới vào P0. Chỉ đưa vào backlog mới khi có scope riêng; giữ trọng tâm Adaptive Knowledge Retrieval & Reasoning.

## 8. Definition of Done áp dụng cho mọi task

- Chức năng chạy end-to-end với dữ liệu thật ở tầng nghiệp vụ; không sample/simulation trên đường production.
- Input schema, ACL, state transitions, typed/RFC7807 errors và requestId được kiểm tra; không lộ secret/nội dung private.
- Unit cho logic; integration cho endpoint/DB; E2E cho critical flow. Core logic line/branch ≥80%, external dependencies mock.
- Build/typecheck/lint/test pass theo scope; không bỏ qua hoặc disable tests/rules để đạt số liệu.
- Full dấu tiếng Việt; loading/empty/error/forbidden/retry/accessibility; pagination default20/max100 khi applicable.
- Public API documentation, behavior docs và decisions/evidence cập nhật; rollback plan trước refactor; review độc lập.
- Cài package, thay DB shared, commit, push, deployment giữ cổng approval riêng.

## 9. Ghi chú về mức độ xác nhận

Task này chỉ phân tích và tạo tài liệu. Không chỉnh application source, không dùng cloud để xác minh, không sửa migration history, không cài dependency và không commit/push/deploy. Generated build/test outputs là kết quả kiểm tra local.

Những hạng mục ghi “cần chứng minh” là khoảng trống bằng chứng hoặc yêu cầu còn thiếu; không đồng nghĩa đã xác nhận lỗi runtime. Các phát hiện F01–F16 có source cụ thể, còn kiểm chứng exploit/DB/recovery sẽ nằm trong test tasks tương ứng.
