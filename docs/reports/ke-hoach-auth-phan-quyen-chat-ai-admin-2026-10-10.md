# Kế hoạch cá nhân — Đăng nhập, phân quyền, chat AI và dashboard admin

Ngày lập: 10/10/2026. Người thực hiện: Nguyễn Thanh Hiệp. Trạng thái: đề xuất triển khai, chưa thực hiện thay đổi source.

## 1. Phạm vi đã xác nhận

| Module | Phạm vi thực hiện | Nền tảng |
|---|---|---|
| Đăng nhập và phiên | Login, register/reset/đổi mật khẩu hiện có, refresh, logout, khóa tài khoản, session restore | Core API + web + mobile |
| Phân quyền | USER/ADMIN, account state, ownership hội thoại/ghi chú, kiểm quyền nguồn khi chat, service authentication | Core API + AI Service + guard web/mobile |
| Chat AI | Ask/stream, grounding/citation, provider, history, memory, cancel/retry, UI và truy vết | Core API + AI Service + web + mobile |
| Dashboard admin | Quản lý người dùng/role/status, số liệu auth/chat/AI, AI Studio, kiểm key/prompt, audit | Core API + AI Service + web |

Bạn đã xác nhận thêm **đăng nhập và chat AI trên mobile**. Dashboard admin mobile chưa nằm trong phạm vi này.

Ngoài phạm vi: bài viết/feed/replies/reactions/bookmarks/notifications cộng đồng, @AI trong bài viết, Work Chat/DM, Workspace CRUD/explore/join/member/cover, quản trị workspace, upload/ingestion/sync/delete tài liệu, mobile feed/workspace, Evaluation/dataset/benchmark nghiên cứu và sinh podcast/slides/quiz mới.

WorkspaceId vẫn tồn tại trong route chat. Kế hoạch chỉ đọc quyền hiện có để bảo vệ chat: ownership, membership/resource state, permissionVersion và allowedDocumentIds. Không nhận việc phát triển chức năng workspace. Tài liệu đã PROCESSED là input từ module của thành viên khác.

Giữ nguyên các chức năng hiện hữu ngoài phạm vi. Việc bỏ khỏi kế hoạch không phải yêu cầu xóa màn hình, route hoặc source của người khác.

## 2. Gói công việc và nguồn tham chiếu

- [Checklist chi tiết 37 task](file:///D:/codex-workspace/unichat/docs/reports/task-thuc-thi-auth-phan-quyen-chat-ai-admin-2026-10-10.md): từng task có thứ tự làm, test, output, phụ thuộc và mapping backlog cũ.
- [Backlog gốc 07/10](file:///D:/codex-workspace/unichat/docs/reports/tasklist-hoan-thien-unichat-2026-10-07.md): giữ nguyên để tham chiếu công việc của cả nhóm.
- Source snapshot đọc lại: branch `feature/conversation-memory-compaction`, HEAD `aa67bdf`, working tree còn nhiều modified/untracked files.
- Kết quả build/lint/test ngày 07/10 chỉ là baseline tham khảo; phiên này không chạy lại và không dùng số liệu cũ để nghiệm thu mới.
- Kế hoạch gồm 37 task: 28 P0, 9 P1. Size S/M/L thể hiện độ phức tạp, không phải lịch cam kết. Chốt ngày công sau SET-02; chưa có deadline/ngân sách được cung cấp.

## 3. Yêu cầu và acceptance criteria tổng

| ID | Yêu cầu | Acceptance criteria |
|---|---|---|
| FR-01 | Phiên đăng nhập nhất quán trên web/mobile | Given phiên hợp lệ, when reload/app foreground/401 đồng thời, then restore hoặc refresh một lần, không vòng lặp và không đổi nhầm user |
| FR-02 | Refresh rotation và lock có hiệu lực | Given refresh đã dùng hoặc user bị khóa, when refresh/access, then revoke/deny được persist trong DB và client xóa state nhạy cảm |
| FR-03 | RBAC thật | Given USER với email/displayName chứa admin hoặc tên đặc biệt, when gọi admin API, then trả 403; quyền chỉ dựa identity/role hiện hành |
| FR-04 | Chat đúng tài nguyên và owner | Given user B hoặc path workspace không khớp, when đọc/ask/xóa conversation/note, then reject trước AI, không lộ citation/summary |
| FR-05 | Grounded answer | Given corpus yếu/không có hoặc citation sai, when hỏi, then CLARIFY/REFUSE; câu trả lời hoàn tất có claim/citation hợp lệ |
| FR-06 | Stream/retry không tạo đôi | Given disconnect hoặc timeout, when retry cùng request key, then dùng operation cũ; done chỉ sau lưu assistant/citations/trace thành công |
| FR-07 | History/memory đúng phiên | Given hội thoại nhiều lượt, when reload/follow-up/compaction, then order và summary đúng, không lẫn context giữa user hoặc conversation |
| FR-08 | Dashboard phản ánh dữ liệu thật | Given dependency lỗi/không có telemetry, when mở dashboard, then error/no-data/unavailable, không số liệu mẫu hoặc HEALTHY giả |
| FR-09 | Audit có thể đối soát | Given lock/role/reset/key-test/chat-failure, when thao tác, then có event được phép lưu với requestId/actor/outcome, không raw token/prompt/chunk |
| NFR-01 | Bảo mật và lỗi | Zod/Jakarta/Pydantic tại boundary; RFC7807 Core; TLS/cookie/CORS/CSRF đúng profile; AI service xác thực JWT ký thật |
| NFR-02 | Khả năng kiểm chứng | Core business logic line/branch ≥80%; integration API/DB; Playwright web critical flows; Jest mobile + smoke native; external calls luôn mock trong test |
| NFR-03 | Hiệu năng có đo lường | Phân trang mặc định 20/tối đa 100; debounce search 300 ms; tối đa 2 request đồng thời/user; đo TTFT/full latency và bộ nhớ trước tối ưu |
| LOCALE-CHECK | Nội dung tiếng Việt | UI, errors, fixtures và acceptance evidence giữ đủ dấu; kỹ thuật ASCII chỉ áp dụng tên code/ID |

## 4. Trình tự triển khai theo 7 đợt

| Đợt | Task | Thực hiện cụ thể | Đầu ra và gate chuyển tiếp |
|---|---|---|---|
| 0. Baseline và contract | SET-01/02, CHAT-01 | Inventory vùng được sửa; snapshot dirty work; kiểm runtime/test harness; chốt DTO auth/chat/admin và SSE states | Compile path xác minh được hoặc blocker rõ; fixtures không cần cloud; contract và scope review được |
| 1. Chặn bypass quyền | AZ-01/AZ-03, audit foundation ADM-04 | Bỏ admin exception theo email; guard deny khi identity chưa resolve; ownership note; audit schema/service foundation | USER trả 403; note IDOR trả 404; lỗi authn/authz thống nhất; audit append-only cơ bản |
| 2. Phiên đăng nhập và quyền chat | AUT-01…08, AZ-02/04/05 | Transaction auth, refresh race, revocation, OTP, transport; session web/mobile; chat allowlist/reauthorization; service JWT | Auth integration PASS; expired/replayed tokens reject; web/native login/restore/logout ổn định |
| 3. Chat backend và AI | CHAT-02…08 | Persistence atomic, operation idempotency, grounding/citation, provider config, stream cancellation, memory | Provider fake đạt ANSWER/CLARIFY/REFUSE; no duplicate; done sau commit; revoke giữa stream chặn output tiếp |
| 4. Chat web và mobile | CHAT-09, MOB-01…03 | Cập nhật UI theo contract đã chốt, provisional/final states, history pagination, citation, retry/cancel; hỗ trợ app foreground/background | Web E2E và mobile integration + native smoke chat/history/citation PASS |
| 5. Dashboard admin | ADM-01…06 | User list/role/lock; system metrics; telemetry và biểu đồ; audit filters; key/prompt validation; shell/data states | Dashboard dựa dữ liệu thật; failure không báo HEALTHY; filters/pagination/query validation đúng |
| 6. Nghiệm thu phạm vi | QA-01…04 | Negative/race/fault integration, client regressions, scoped lint/build/coverage, CI/docs/rollback/demo | Evidence đủ cho bốn module; global failures ngoài phạm vi được ghi và giao owner; delivery chỉ sau approval riêng |

Test được viết và chạy trong từng task. QA cuối là regression và kiểm tra evidence, không phải đợi tới cuối mới viết tests. ADM-04 được bổ sung emitters dần khi auth/admin/chat mutations hoàn tất.

## 5. Phụ thuộc và đường găng

1. SET-02 + CHAT-01 → RBAC/identity contracts và fixture harness.
2. AZ-01 + AUT-02/03/05/06 → AUT-07/08 → login/restore/refresh/logout web/native.
3. AZ-02/04 + CHAT-01 → CHAT-02/03/04/05/06 → CHAT-07 → CHAT-08/09 + MOB-01/02/03.
4. AZ-01 + AUT-05 + ADM-04 → ADM-01; CHAT-06/07 → ADM-02/03/05; dashboard clients → ADM-06.
5. Các task trên + QA-01/02/03 → QA-04 → nghiệm thu và demo.

Ưu tiên đầu tiên có giá trị rõ: SET-01/02 → AZ-01 → AZ-03 → AUT-02/03/05 → AZ-02/04 → CHAT-02/03. Một người thực hiện theo đợt; không giả định nguồn lực parallel hoặc tự giao việc cho thành viên khác.

## 6. Contract cần chốt trước khi sửa client

| Contract | Đề xuất cho giai đoạn design | Kiểm tra bắt buộc |
|---|---|---|
| Auth transport | Web dùng HttpOnly refresh cookie và access token memory; native dùng opaque refresh trong Keychain/Keystore; clientType/body/cookie precedence tường minh | Cookie/profile khác nhau không làm lộ refresh qua body; Expo web không dùng localStorage để giả lập native secret store |
| Account revocation | Chốt một cơ chế kiểm account hiện hành + security version/session epoch cho access JWT; migration mới nếu cần; temporary login lock phân biệt admin lock | Token cấp trước lock/role/password change bị deny; unlock không hồi sinh token cũ; counter/revoke tồn tại sau 401 |
| RBAC | Chốt mapping scope/authority thống nhất Core; USER/ADMIN có định nghĩa duy nhất; service kiểm role hiện hành và status | Route guard là UX; backend vẫn deny direct API; không chỉ dựa token role cũ |
| Resource ACL | Chat dùng adapter chỉ đọc context quyền hiện có; conversation/user/workspace/note/doc IDs phải khớp; check trước emit/persist | ACL thay trong inference gây deny; ADMIN không tự đọc chat private; không đổi Workspace CRUD/membership |
| Service JWT | Signature RS256, exp≤60s, issuer/audience/kid + method/path/bodyHash/requestId/key; replay store qua abstraction có bằng chứng concurrency | Token giả bắt đầu ey vẫn trả 401; canonical serialization giống signer/verifier; cần chốt replay backend bền khi design, không thêm package ngầm |
| Chat operation | Idempotency-Key theo user + logical operation `chat.ask` + workspace/conversation + bodyHash; hai route stream/nonstream dùng chung namespace; states RUNNING/COMPLETED/FAILED/CANCELLED | Cùng key khác payload trả 409; hash loại transport flags nhưng giữ question/options; retry đồng thời chỉ gọi provider một lần; status/replay phải kiểm quyền hiện hành |
| SSE | metadata/pipeline-step/token/final-or-error; done chứa ID message thật sau commit; streamed text là provisional tới khi validate | Event mất/fragmented UTF-8/cancel có kết quả rõ; partial output không được gắn “đã xác thực”; completion sai citation được retract/refuse |
| Citation/history | Citation giữ doc/chunk/hash/locator/score thật; page-based list theo ADR019, không nhận cursor rồi bỏ qua | >20 conversation và long messages có next page; document thứ 11 không bị đổi filename; version/redaction lấy từ contract nguồn |
| Dashboard | Typed DTO; from/to hoặc days whitelist; lastUpdated/status/no-data; timezone hiển thị Asia/Saigon, lưu UTC | Không mặc định 100% khi no-data; ping lỗi→ERROR/UNAVAILABLE; không lộ raw key/full prompt/private content |

Đây là đề xuất design để reviewer kiểm tra, chưa phải ADR đã được phê duyệt. Các quyết định có migration hoặc thay security contract phải được ghi ADR trước implementation; cài package và đổi DB shared giữ approval riêng.

## 7. Ranh giới file và phối hợp

| Vùng | Quyền sửa dự kiến | Giới hạn |
|---|---|---|
| [Core auth](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/auth), [Core user](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/user) | Auth/token/OTP/repositories; account status/security version; change-password | Không nhận profile/avatar redesign hoặc directory cộng đồng |
| [Core security](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/shared/config), [Core chat](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat) | Identity/RBAC/service signing; conversation/messages/citations/studio note ownership | Workspace/document repositories chỉ đọc metadata/quyền; không thay CRUD/ingestion |
| [Core admin](file:///D:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/admin) | User management, system/AI metrics, audit endpoints/services | Controller hỗn hợp workspace/document/audit chỉ tách phần audit trong scope; không đổi nghiệp vụ workspace/document |
| [Frontend auth](file:///D:/codex-workspace/unichat/frontend/src/features/auth), [chat](file:///D:/codex-workspace/unichat/frontend/src/features/chat), [history](file:///D:/codex-workspace/unichat/frontend/src/features/history), [admin](file:///D:/codex-workspace/unichat/frontend/src/features/admin) | Session/guard/chat/history/dashboard và shared api-client | Không chỉnh workspace/community UI; route chung chỉ phục vụ module được nhận |
| [AI rag](file:///D:/codex-workspace/unichat/ai-service/app/core/rag), [AI API](file:///D:/codex-workspace/unichat/ai-service/app/api/v1) | Generation/citation/memory/stream/security/telemetry | Không ingestion/extract/chunker/evaluation; vector adapter chỉ phối hợp contract retrieval, không sửa sync/version lifecycle |
| [Mobile auth](file:///D:/codex-workspace/unichat/mobile/src/features/auth), [Mobile chat](file:///D:/codex-workspace/unichat/mobile/src/features/chat), [Mobile lib](file:///D:/codex-workspace/unichat/mobile/src/lib) | Session/api/sse, login/reset/change-password và chat/history/citation routes | Không mobile feed/workspace features; workspace ID là input fixture/context hiện có |
| Test/migrations/docs/CI | Bổ sung file mới cho logic trong scope và test đồng hành | Migrations chỉ append phiên bản mới sau approval; giữ checksum lịch sử, không tự sửa Flyway shared |

Trước mỗi task, lập exact write set và đọc diff hiện tại; không revert thay đổi của người khác. Public APIs có docs; pure logic≤30 dòng; service≤300; complex UI≤500 file và render≤100 JSX. Tách file liên quan trong task kèm regression; không refactor module ngoài scope.

## 8. Những phụ thuộc bên ngoài không giao vào task của bạn

| Input / blocker | Bạn cần gì | Cách tiếp tục phần độc lập |
|---|---|---|
| Workspace/permission module | Workspace context read port trả active state, allowed user/action, permissionVersion và approved document IDs | Fake immutable fixtures USER/ADMIN/private/revoked; phối hợp contract với owner, không tự nhận CRUD/membership |
| Document module | Documents PROCESSED, chunkId/contentHash/locator/ingestion version, download/redaction semantics | Fixture PDF/DOCX/TXT citation; xử lý thiếu metadata bằng REFUSE; saga/sync thuộc owner khác |
| Chroma security debt | Evidence đóng SEC-DEBT-001 và compatibility trước live retrieval/deploy | Auth, ACL, UI, admin và fake-provider tests vẫn làm được; không tự đóng debt hoặc cài dependency |
| Shared schema/Flyway/RLS | DB test disposable và migration history tin cậy; role RLS phù hợp app connection | Testcontainers/local disposable; không sửa checksum, RLS policy hoặc cloud shared trong task plan này |
| Global lint/tests ngoài scope | Owner khác xử lý các lỗi workspace/community | Scoped report và CI evidence rõ; global release còn đỏ thì chưa báo release-ready |

## 9. Chiến lược kiểm thử và nghiệm thu

| Tầng | Bộ test phải có |
|---|---|
| Unit Core | Login lock/normalize/password, refresh hash/rotation/reuse, permission checks, operation dedupe/state, provider policy, citation mapping, audit/metric aggregation |
| Integration Core/DB | Auth failure rollback, concurrent refresh, lock/role/token invalidation, HTTP401/403/404/409/429, note/conversation IDOR, commit failure, ACL race, telemetry/audit persistence |
| Unit/integration AI | Service JWT signature/binding/replay, fake vector/provider, ANSWER/CLARIFY/REFUSE, invalid claim/citation/hash, retry budget, stream partial/error/cancel, memory version isolation |
| Web Vitest/MSW | Auth bootstrap/401 race/403, route deny, safe Markdown/Mermaid, chat retry/abort/history, admin filters/loading/empty/error, query cache isolation |
| Web Playwright | Login→chat→citation→history reload; logout/expired session; USER admin403; ADMIN role/lock→old session denied; dashboard failure/empty/audit; fake providers only |
| Mobile Jest/integration | SecureStore session restore/refresh/logoff, API-client state synchronization, app lifecycle/AbortController, fragmented SSE, same-key retry, paginated history và citation/refusal UI |
| Native smoke | iOS/Android: login, reopen app, foreground refresh, chat stream/cancel, keyboard/scroll, history/citation, logout, network interruption; ghi device/build evidence |

Playwright trên Expo web không thay thế nghiệm thu native. Nếu chưa có hạ tầng native E2E thì ghi đúng giới hạn và thực hiện smoke trên thiết bị; framework/package mới là đề xuất cần approval riêng.

Core logic yêu cầu line và branch≥80%, không quy đổi số test thành coverage. Tests không gọi SMTP/Gemini/Ollama/Chroma cloud hoặc DB shared. Kiểm tra thật với provider chỉ khi có scope riêng được phép.

## 10. Rủi ro, rollback và hoàn tất

| Rủi ro | Kiểm soát |
|---|---|
| Shared API-client làm hỏng module của người khác | Giữ API compatible, test consumer hiện có; thay security contract version hóa; báo regression ngoài scope |
| JWT/security-version migration làm mất phiên | Fresh/upgrade DB fixtures, chốt hành vi forced logout và rollback trước migration; không rollback về email bypass |
| Stream đã phát trước khi hoàn tất validation/ACL | Provisional UI, check quyền trước mỗi đợt emit và commit; final authoritative; không hứa thu hồi bytes đã gửi |
| Mobile stream fallback tạo request mới | Cùng operation/idempotency key; status/replay trước retry; không tự gọi model thứ hai sau partial stream |
| Dashboard thành công giả | Xóa fallback HEALTHY/sample metrics trong runtime path; empty/unknown/unavailable tường minh; tests negative |
| Telemetry hiện có file persistence chỉ giữ 500 records | Kiểm retention/rotation/atomic writes và multiworker contract; không kết luận cần viết lại storage khi chưa design |
| Runtime/DB/Chroma evidence thiếu | Blocker cụ thể trong SET-02; tiếp tục fake-provider và tasks độc lập; không tự cài package hoặc sửa shared database |

Rollback từng task: snapshot diff/file hashes trong workspace → thay đổi nhỏ có tests → lưu evidence → nếu fail giữ diff reviewable hoặc khôi phục đúng phần task khi được phép. Database dùng append-only migrations và kế hoạch restore trên disposable DB; thao tác shared/destructive phải xin approval. Không coi restore phiên bản có bypass bảo mật là rollback chấp nhận được.

Đầu ra cuối: auth web/native ổn định; RBAC và chat ownership được enforce ở Core; service JWT thật; chat không tạo đôi và citation/history đúng; dashboard/audit dùng dữ liệu thật; reports build/lint/tests/coverage và demo chỉ bốn module.

Kế hoạch này là sản phẩm của yêu cầu lập plan. Source, pipeline approvals/checkpoint và backlog gốc giữ nguyên; chưa có implementation, package install, DB mutation, commit, push hoặc deployment.
