# Checklist thực thi — auth, phân quyền, chat AI và admin

Ngày: 10/10/2026. 37 task, trạng thái đề xuất/chưa nghiệm thu. Scope web/Core/AI + auth/chat trên mobile theo xác nhận của người dùng.

[Kế hoạch tổng, dependency và gates](file:///D:/codex-workspace/unichat/docs/reports/ke-hoach-auth-phan-quyen-chat-ai-admin-2026-10-10.md). Mỗi task phải có exact write set trước khi code, test đồng hành và evidence sau khi chạy; task M/L tiếp tục chia nhỏ nếu vượt một logical change.

P0 là điều kiện nghiệm thu cốt lõi; P1 hoàn thiện chức năng trong phạm vi, vẫn cần làm trước khi bàn giao đầy đủ. S: một boundary/module; M: nhiều lớp hoặc client-server; L: cần design và chia thành nhiều thay đổi nhỏ. Thứ tự theo phụ thuộc, không chỉ theo số task.

## 1. Chuẩn bị — 2 task

### SET-01 — P0/S — Khóa scope và baseline; từ G01/G03/T04 một phần
- Làm: inventory auth/security/chat/admin/mobile auth-chat; lưu diff/hash vùng dự kiến sửa; ghi lỗi liên quan và lỗi của owner khác; tạo rollback checklist mỗi task; giữ original backlog.
- Đầu ra: scope manifest + requirement/API delta + baseline evidence; không sửa community/workspace, không nhận ownership ngoài bốn chức năng.
- Test/AC: mọi path thuộc workspace; write set tường minh; raw secrets không xuất vào report; danh sách ngoại phạm vi được đánh dấu để release gate không che lỗi. Phụ thuộc: —.

### SET-02 — P0/M — Khôi phục kiểm tra local và fake dependencies; từ G02/T01/T02 một phần
- Làm: kiểm JDK/Maven/Python/Node đã có; xác minh cache hiện hành; cô lập TestClient RabbitMQ startup; tạo mock vector/provider/mail/clock và disposable DB profile; không cài thêm tự động.
- Đầu ra: commands lint/typecheck/test/coverage/build cho từng scope; blocker cụ thể nếu runtime/cache thiếu; fixtures USER/ADMIN/LOCKED, ACL revoke, ANSWER/CLARIFY/REFUSE.
- Test/AC: không network provider/cloud/SMTP/shared DB; compile được phần sẽ sửa hoặc ghi blocked rõ; DB fixture không tự sửa migration checksum. Phụ thuộc: SET-01.

## 2. Đăng nhập và phiên — 8 task

### AUT-01 — P0/M — Schema auth và lỗi thống nhất; từ S05/G01 một phần
- Làm: email normalize một chỗ; password policy 12–128; Zod/Jakarta schemas đồng bộ web/mobile; validate cả body refresh/logout; client không suy quyền từ user nhập; giữ full dấu thông báo.
- Đầu ra: DTO/schema + error-code matrix 400/401/403/409/429; register/login/reset/change-password hiện có dùng cùng policy.
- Test/AC: blank/invalid Unicode/length boundary; email case-insensitive unique; không log password/OTP/token; validation RFC7807. Phụ thuộc: SET-02.

### AUT-02 — P0/M — Failed-login transaction và loại khóa; từ S05
- Làm: tách phần cập nhật counter/temporary lock khỏi exception rollback; phân biệt khóa do admin với lock 15 phút do sai mật khẩu; reset counters sau login hợp lệ; trạng thái mail/password errors tường minh.
- Đầu ra: focused auth transaction service/result; clock injectable; failedLoginCount/lockedUntil lưu thực sau 401.
- Test/AC: 5 lần sai tăng DB và lock; expiry auto-unlock chỉ temporary lock; admin lock không tự mở; transaction integration thật. Phụ thuộc: AUT-01.

### AUT-03 — P0/M — Refresh rotation atomic và chống reuse; từ S05/C03
- Làm: lưu hash opaque token; khóa/compare-and-swap rotation; commit family revoke trước trả401; xử lý concurrent token reuse theo contract; hết hạn/dọn records; logout idempotency không lưu raw refresh vào requestHash.
- Đầu ra: RefreshToken lifecycle rõ ACTIVE/USED/REVOKED/EXPIRED; không duy trì hai successor hợp lệ; auth routes không tự refresh lặp.
- Test/AC: hai refresh đồng thời, replay, expiry, family revoke, logout repeated; persistence assertions sau failure; kiểm raw token không nằm DB/log/idempotency record. Phụ thuộc: AUT-02.

### AUT-04 — P1/M — OTP/reset/đổi mật khẩu và mail failure; từ S05
- Làm: hash OTP, one-time consume, giới hạn attempts/resend/expiry 5 phút; mail adapter có delivery failure trạng thái; reset/change password gọi session invalidation; response forgot-password thống nhất.
- Đầu ra: OTP/service tests và UI cooldown/lỗi rõ trên web/native; không expose email có tồn tại.
- Test/AC: invalid/reused/expired OTP, concurrent reset, mail fail, wrong current password; không network SMTP; password update không để session cũ hợp lệ. Phụ thuộc: AUT-03, AUT-05.

### AUT-05 — P0/M — Thu hồi access/refresh khi lock/role/password đổi; từ S04
- Làm: chốt ADR securityVersion/session epoch và account validator; JWT issuer/audience/expiry strict; update version+revoke families cùng transaction; role/status được kiểm ở Core cả khi token còn hạn.
- Đầu ra: cơ chế revocation có migration mới nếu được duyệt; account ACTIVE/LOCKED semantics rõ; logout policy current-family so với global invalidation tách bạch.
- Test/AC: token cấp trước lock/demotion/reset/password change bị deny; unlock không phục hồi token cũ; concurrent last-admin updates giữ invariant. Phụ thuộc: AUT-03, AZ-01; DB mutation approval riêng.

### AUT-06 — P0/M — Cookie/CORS/Origin/CSRF đúng client; từ S03
- Làm: env allowlist; xác định web cookie và native body transport; HttpOnly/Secure/SameSite + credentialed fetch đúng; cookie body precedence và client header validate; guard Origin/CSRF với cookie mutations; TLS production.
- Đầu ra: local/test/prod profile contract; protected auth transport; refresh cookie không lọt sang mobile-response path sai client mode.
- Test/AC: hostile origin, missing/mismatched CSRF, localhost/device config, cross-origin credentials, cookie flags, malformed refresh body; không wildcard credentials production. Phụ thuộc: AUT-01, AUT-03.

### AUT-07 — P0/M — Web auth bootstrap và refresh một lần; từ S04/G01
- Làm: INITIALIZING/READY/ANONYMOUS/ERROR; refresh-on-launch rồi gọi /me; single-flight 401 và một retry; 403 không logout; shared fetch JSON/blob/SSE dùng cùng session; logout abort requests và clear user caches.
- Đầu ra: auth context/guard/API client testable; routing đợi identity; token trong memory; failure không để user=null nhưng coi admin authenticated.
- Test/AC: reload, 10 request 401 đồng thời→1 refresh; failed refresh không loop; cached profile user A không xuất cho user B; network offline không tự coi token valid. Phụ thuộc: AUT-05, AUT-06, AZ-01.

### AUT-08 — P0/M — Mobile auth/session lifecycle; từ M05/S04 một phần
- Làm: native refresh token Keychain/Keystore; sync rotated token với AuthContext; restore/foreground validate session; cancellation on logout; cleanup profile/query/chat state; phân biệt Expo web storage với native và thống nhất memory-access policy.
- Đầu ra: login/register/reset/change-password routes hiện có đồng bộ session state; secure-store/API-client interfaces rõ; không nhận mobile account/feed redesign.
- Test/AC: app reopen, expired access, parallel401, revoke while background, corrupt stored profile, secure-store failure, offline logout; Jest + native smoke. Phụ thuộc: AUT-05, AUT-06.

## 3. Phân quyền — 5 task

### AZ-01 — P0/M — RBAC admin thật ở API/service/UI; từ S01
- Làm: bỏ email/displayName exception; mapping JWT authority chuẩn và current account status; bật method security khi dùng annotation; guard web fail-closed lúc load; quyền USER/ADMIN có một nguồn sự thật.
- Đầu ra: shared AdminAuthorizationPolicy và tests cho user/metrics/audit/AI Studio; deny direct API; không phát triển admin workspace/document nghiệp vụ.
- Test/AC: email chứa admin/taolahiep vẫn USER trả 403; ADMIN locked trả 403/401 đúng contract; missing identity không mở dashboard; protected routes không bị bỏ sót. Phụ thuộc: SET-02.

### AZ-02 — P0/M — Chat resource ownership và reauthorization; từ C01/W01 phần READ/ASK
- Làm: conversation phải cùng user+workspace; read ACL adapter từ module sẵn có; kiểm allowed docs/status/version trước AI, trước mỗi batch emit và trước commit; active user check; đừng tạo authorization owner thứ hai ở AI.
- Đầu ra: ChatAccessContext/port và atomic permission-read contract; status/revoke/not-found error không lộ private resource; chỉ đọc workspace/document metadata.
- Test/AC: đổi path workspace, user B, revoked membership, deleted doc, lock mid-inference; unauthorized provider calls = 0; output sau revoke bị chặn; fixtures đủ không cần CRUD workspace. Phụ thuộc: AUT-05, SET-02.

### AZ-03 — P0/S — Ownership Studio Notes hiện có; từ W04
- Làm: list/create/delete kiểm conversation owner và ACL còn hiệu lực; note.userId/conversationId/workspaceId khớp; nguồn invalid không leak excerpt; dùng cùng ChatAuthorizationPolicy.
- Đầu ra: existing note endpoints được bảo vệ; không xây quiz/podcast/slides tools mới.
- Test/AC: user B không list/create/delete note của A; ID note tráo conversation trả 404; revoke quyền nguồn không đọc note cũ theo retention contract. Phụ thuộc: AZ-01; hoàn thiện ACL dùng AZ-02.

### AZ-04 — P0/L — Service JWT cho chat và AI metrics; từ S02
- Làm: chốt serialization/bodyHash và replay-store port; ký/verify RS256, exp≤60s, iss/aud/kid, method/path/requestId/key; Core AI Studio phải gửi Authorization; invalid credentials fail trước retrieval/telemetry/key-ping.
- Đầu ra: signer/verifier + contract tests; private health exception tường minh; không dùng chuỗi bắt đầu ey hoặc shared dev-secret làm JWT; không thêm replay backend/package ngầm.
- Test/AC: fake/tampered/expired/wrong audience/body/path/reused jti; concurrent replay; Auth header hiện thiếu ở AdminAiStudioService được bổ sung; outbound mocked. Phụ thuộc: SET-02, CHAT-01; design chia signer/verifier/replay thành logical changes.

### AZ-05 — P0/M — Rate limits scope auth/chat/admin; từ S06 một phần
- Làm: login/register 5/phút/IP+account; hỏi 20/phút/user và tối đa 2 concurrent; admin/ping/prompt 5/phút/user; OTP resend/attempt policies ghi contract; bucket/lease durable; có cleanup.
- Đầu ra: RateLimitPort/service và RFC7807 RATE_LIMITED/Retry-After; retry operation đã hoàn tất không charge lại.
- Test/AC: boundary window/fake clock, release concurrency permit sau cancel/error/crash lease; 429 không gọi provider; không rate-limit upload/evaluation ngoài scope. Phụ thuộc: AUT-02, AZ-01; chat integration dùng CHAT-03.

## 4. Chat Core/AI/Web — 9 task

### CHAT-01 — P0/M — Contract câu hỏi/history/citation/SSE; từ G03/C03/R04
- Làm: thống nhất schemas question 3–2000 ký tự, requestId, operationId, messageId, decision, provider, strategy/hash, citation metadata; history pagination theo ADR019; định nghĩa statuses/replay/cancel; cập nhật Core/web/native DTO cùng delta.
- Đầu ra: API examples/SSE fixtures typed, ADR candidate cho stream provisional/final và operation model; planned migration list, không tự mutate DB.
- Test/AC: schema malformed và boundary; event fixtures cùng hình dạng ở web/mobile/AI; không cursor ignored; links/version docs thống nhất. Phụ thuộc: SET-01.

### CHAT-02 — P0/M — Persistence atomic và done sau commit; từ C02
- Làm: AI call ngoài transaction dài; transaction service persist user/assistant/citations/trace/summary theo operation states; error dùng Result/typed class; repository save không được swallow; publication done sau commit.
- Đầu ra: stored assistantMessageId là final ID; không persist partial answer như hoàn tất; lỗi có requestId và state đọc lại được.
- Test/AC: DB fail trước/sau AI không half-assistant/citations; reload ngay sau done thấy result; ACL revocation trước commit deny; `@Transactional` proxy thực sự được gọi. Phụ thuộc: CHAT-01, AZ-02.

### CHAT-03 — P0/M — Idempotency và status/replay; từ C03
- Làm: bắt buộc key trên ask/stream; reserve atomically trước provider theo user + logical operation `chat.ask` + workspace/conversation + bodyHash; hai route dùng chung namespace; hash không chứa transport flags; hợp nhất retry/status/replay và expiry policy.
- Đầu ra: operation status/replay endpoint theo CHAT-01; không tạo message/user question hai lần; request cancelled/failed retry rule tường minh.
- Test/AC: concurrent duplicates → 1 call; cùng key khác question/options/context → 409; stream lỗi rồi nonstream retry cùng key trả operation cũ; late success rồi retry trả result cũ; không replay private output sau revoke. Phụ thuộc: CHAT-02, AZ-05.

### CHAT-04 — P0/M — Evidence Gate và chế độ grounded; từ R01/R02
- Làm: grounded-only default theo spec; ngoại tri thức nếu giữ phải opt-in và label riêng; intent/strategy/source-group rules version hóa; empty/weak/OOS/ambiguous dẫn CLARIFY/REFUSE phù hợp.
- Đầu ra: deterministic gate dùng fake candidates; COMPARISON source groups theo approved spec hoặc ADR mới đã duyệt; không tune research dataset.
- Test/AC: no allowed docs/no evidence không gọi LLM; one-source comparison không quietly pass; tiếng Việt có/không dấu và negative technical keywords; thresholds boundary. Phụ thuộc: CHAT-01, AZ-02.

### CHAT-05 — P0/L — Citation/claim validator và metadata thật; từ R03/R04
- Làm: structured output claims/citationIds; validate chunk/hash/locator/excerpt/allowlist; schema/citation invalid retry đúng 1 lần cùng evidence; truyền chunkId/contentHash thật tới history; bỏ tên file fallback sang nguồn khác.
- Đầu ra: response final verified; invalid output→REFUSE; citation lookup theo document ID đúng scope; không chunk-N hoặc score thay hash; design chia validator và persistence mapping.
- Test/AC: bogus citation/hash, factual claim vô nguồn, doc thứ 11+, DOCX/TXT/PDF locators, Unicode excerpt, deleted/redacted source; retry budget; fake vector/provider. Phụ thuộc: CHAT-02, CHAT-04; source metadata external fixture contract.

### CHAT-06 — P0/M — Provider/fallback/config và trace; từ R05/R06
- Làm: provider/model/prompt/strategy/hash/temperature snapshot; streaming và nonstream error taxonomy thống nhất; timeout/429/5xx mới fallback; Ollama cùng evidence; trace request/model/latency/tokens không raw contents.
- Đầu ra: provider port injectable, không model hopping ngầm; embedding revision là contract yêu cầu owner vector cung cấp; telemetry request IDs và stats thật.
- Test/AC: auth/validation/safety/gate refusal không fallback; fallback at-most-once; error trước/sau partial; actual reported token counts, unavailable để null không estimate giả. Phụ thuộc: AZ-04, CHAT-04/05.

### CHAT-07 — P0/M — SSE lifecycle/cancel/backpressure; từ C04
- Làm: abort propagate client→Core→AI; timeout/EOF/disconnect/incomplete states; bounded executor; UTF-8 fragmentation/multiline event parser; provisional UI tới final validation; không ghép tokens hai model.
- Đầu ra: cancel/status/error contract; final done sau CHAT-02 commit; failed citation retract/refuse provisional answer; permission check theo AZ-02.
- Test/AC: missing done không success; abort không persist complete; disconnect retry không duplicate; slow client không tăng memory vô hạn; provider fake async và clock. Phụ thuộc: CHAT-03, CHAT-05/06.

### CHAT-08 — P1/M — Memory và compaction đúng conversation; từ C05
- Làm: token budget/summary limit/version locking; latest turns và summary dùng chung prompt; đại từ follow-up phải retrieval đúng context; revoke/source removal không giữ context forbidden; thu gọn summary policy.
- Đầu ra: history/summary isolated; compaction status hiển thị như bước pipeline, không hiển thị private chain-of-thought; short-term trong một conversation.
- Test/AC: concurrent turns, summary version conflict, follow-up “nó”, user/conversation isolation, limit boundary, deleted source; không long-term memory hoặc new research tuning. Phụ thuộc: CHAT-02, CHAT-05/06.

### CHAT-09 — P1/M — Chat/history web UX và safe rendering; từ C06/G01
- Làm: sending/streaming/cancel/retry/refuse/clarify; valid conversation IDs; paginated history/messages, stable scroll/order; citation focus/full locator; safe Markdown/LaTeX/Mermaid; cleanup listeners/caches.
- Đầu ra: scoped components/hooks tách file vượt chuẩn kèm tests; request-key giữ qua retry; legacy page routes compatible; không sửa community/workspace UI.
- Test/AC: long conversation/reload/copy/citation/403/429/provider down; raw HTML/javascript/SVG payload không chạy; keyboard/focus; scoped lint/build/Vitest + Playwright. Phụ thuộc: AUT-07, CHAT-07/08.

## 5. Chat AI mobile — 3 task

### MOB-01 — P0/M — Mobile stream và retry cùng operation; từ C03/C04/M04 phần chat
- Làm: giữ operation/key qua stream error; hỏi status trước nonstream fallback; AuthContext nhận token rotation; app background/unmount/logout abort; sync metadata/decision/refusal final; không tạo hỏi lại mới tự động.
- Đầu ra: hook/state machine theo Core contract; request resume/failed state rõ; final answer only after validated done.
- Test/AC: timeout sau server commit không message đôi; partial error→no mixed answer; background foreground/reconnect/cancel; Jest SSE fragmentation+same-key fallback. Phụ thuộc: AUT-08, CHAT-03/07.

### MOB-02 — P1/M — History mobile phân trang đúng Core; từ C06/M04 phần chat
- Làm: bỏ adapter nhận cursor rồi mất page state; page/size hoặc contract mới thực sự hỗ trợ; history list/load-more/message order/conversation delete; set empty/error states đúng server.
- Đầu ra: >20 conversation và long messages truy cập đủ; reload canonical messages; no sample/fake conversation fallback trên request lỗi.
- Test/AC: page2 khác page1; unique IDs/stable ordering; revoked conversation deny; cancel navigation không set stale state; native keyboard/scroll smoke. Phụ thuộc: MOB-01, CHAT-01/02.

### MOB-03 — P1/S — Citation/refusal mobile chính xác; từ R04/M04 phần citation
- Làm: dùng score/locator/excerpt thật; không fallback 85% hoặc nhãn validated khi chưa valid; hiển thị REFUSE/CLARIFY reason; open document source qua port có sẵn nếu được phép, otherwise locator rõ.
- Đầu ra: citation sheet safe/full dấu + accessibility; file viewer/download implementation của owner document không thành task mobile này.
- Test/AC: score 0/unknown giữ đúng nghĩa; deleted/revoked source không mở; wrong document không hiển thị; sheet focus/close/native smoke. Phụ thuộc: CHAT-05, MOB-01; source-open contract cần owner cung cấp.

## 6. Dashboard admin web — 6 task

### ADM-01 — P0/M — User management/role/lock nghiệp vụ thật; từ A03 phần user/S01/S04
- Làm: typed filters/query/page/status/role; debounce 300 ms; protect last admin/concurrent mutation; updates invoke security invalidation; confirmation và response error; user ID input validated.
- Đầu ra: user list/role/lock/unlock hoạt động; manual locked state không temporary auto-unlock; audit cho mọi mutation.
- Test/AC: USER trả 403; inactive admin deny; last-admin invariant concurrent; old token denied sau demote/lock; filter/page results đúng DB; UI rollback khi fail. Phụ thuộc: AZ-01, AUT-05, ADM-04.

### ADM-02 — P1/M — System metrics của auth/chat/AI; từ A02 giới hạn
- Làm: `/admin/metrics` typed aggregate: active/locked users, login failures, chat completed/refused/failed, latency/TTFT,token usage và dependency freshness; filters thời gian; không quản lý/count chi tiết workspace/documents.
- Đầu ra: repository/service aggregate metadata; placeholder system metrics page thành data states; operator không nhìn private chat contents.
- Test/AC: zero/null/no-data không100% giả; fixture counts và timezones đúng; p95 có sample semantics rõ; ADMIN-only; query performance measured; pagination nếu list. Phụ thuộc: AZ-01, CHAT-06, ADM-04.

### ADM-03 — P1/M — AI telemetry/biểu đồ có nguồn và retention; từ A04
- Làm: dùng record hiện có, kiểm file persistence cap 500/atomic writes; chốt storage/retention/multiworker design; record streaming/nonstream/fallback actual usage; filters key/model/days; tách RAG và quick prompt categories.
- Đầu ra: requests/success/errors 429/503/tokens/models charts + lastUpdated/no-data/error; không hiển thị current quota hay billing nếu provider không cung cấp.
- Test/AC: restart/retention/concurrent records, correct input/output token totals, denied user, all-model/key filters, unknown provider usage; mask không lộ key ngắn. Phụ thuộc: CHAT-06/07, AZ-04.

### ADM-04 — P0/M — Audit thật cho auth/permission/chat/admin; từ A01
- Làm: append-only AuditPort/service/repository; controllers chỉ map DTO; events LOGIN_FAILED/SESSION_REVOKED/ROLE_CHANGED/USER_LOCKED/AI_CHECK/CHAT_ERROR phù hợp privacy; tách endpoint audit khỏi controller hỗn hợp.
- Đầu ra: filter actor/action/outcome/from/to/page20/max100; replace events hardcode; transaction-safe audit semantics; requestId xuyên flow; log failure không được swallow.
- Test/AC: actual mutation→event, zero DB→empty, restart còn event; USER trả 403; no prompt/token/email enumeration/private chunks; audit rollback/failure policy có integration tests. Phụ thuộc: SET-02, AZ-01.

### ADM-05 — P1/M — Test key/quick prompt không thành công giả; từ A04/S02
- Làm: bỏ fallback HEALTHY 280 ms/ready 420 ms và token estimate; validate keyIndex/model allowlist,prompt length,timeout; service token authenticated; rate-limited explicit action; provider error schema và actual usage.
- Đầu ra: real HEALTHY/RATE_LIMITED/ERROR/UNAVAILABLE; không ping mặc định khi page open; secret masked; prompt kiểm tra không lấy nội dung chat private.
- Test/AC: AI down → unavailable, 429→rate-limited; invalid model/index trả 400; USER trả 403; raw key hidden; mocks không paid calls; latency measured injected clock. Phụ thuộc: AZ-01/04/05, ADM-03.

### ADM-06 — P1/M — Dashboard shell/filter/data states/accessibility; từ G01/A02/A04
- Làm: hoàn thiện user/AI Studio/metrics/audit navigation; reconnect/refresh UI; date/model/key filters validated; empty/error/loading; status badge theo actual freshness, không online giả; responsive charts/tables.
- Đầu ra: dashboard web bốn screens trong scope; giữ admin workspace/document routes hiện có của owner khác, không nhận việc hoàn thiện chúng; UI split nếu vượt chuẩn.
- Test/AC: filters round-trip stable, stale requests không overwrite; protected page không flash cho USER; keyboard/focus/table loading; Vitest/Playwright + scoped lint/build. Phụ thuộc: ADM-01…05, AUT-07.

## 7. Regression, CI và bàn giao — 4 task

### QA-01 — P0/L — Core API/DB negative/race/fault suites; từ T01 một phần
- Làm: integration cho auth/admin/chat/note; reusable permission fixtures; test rollback login/reuse, concurrent rotate,last admin,idempotency,reauthorize,commit failure; API401/403/404/409/429 contracts.
- Đầu ra: JUnit/Testcontainers/WireMock reports + JaCoCo scope line/branch ≥80%; logical suites theo module; không full workspace/document integrations.
- Test/AC: DB assertions thật sau failure; deterministic clock/provider; migrations mới fresh/upgrade DB pass; all selected endpoint happy+validation+authn+authz+failure. Phụ thuộc: AUT/AZ/CHAT Core tasks hoàn tất; tests viết từ từng task.

### QA-02 — P0/M — AI security/generation/stream suites; từ R03/R05/T01
- Làm: service JWT contract; schema/claims/citation/provider budget; fake vector/model; memory context isolation; async stream cancel/error; no RabbitMQ startup trong fixtures.
- Đầu ra: Ruff/mypy/pytest reports + core logic coverage≥80%; module fixtures reusable; production code không có “test simulation fallback”.
- Test/AC: no outbound network, wrong allowlist/replay before LLM, fixed evidence retry 1; stream stats trustworthy; no test writing traces/telemetry vào real data path. Phụ thuộc: AZ-04, CHAT-04…08.

### QA-03 — P0/L — Web E2E và mobile auth/chat regression; từ T02/M05 một phần
- Làm: web login→chat→citation→reload→logout; USER admin denial; ADMIN role/lock/audit/AI failure; mobile session/stream/history/citation integration và native smoke; accessibility/Unicode.
- Đầu ra: Playwright fake-profile reports/video + Vitest/Jest + native device/build checklist; route fixtures không cần CRUD workspace/posts.
- Test/AC: Expo web E2E không được coi native evidence; expired/revoked session và duplicated question tests; no cloud credentials/provider; tests flaky có root cause, không skip. Phụ thuộc: AUT-07/08, CHAT-09, MOB-01…03, ADM-06.

### QA-04 — P0/M — Scope CI/docs/demo và delivery evidence; từ T03/G03/O03 một phần
- Làm: CI selected lint/typecheck/build/JUnit/pytest/Vitest/Jest/Playwright/coverage; generated API examples; CHANGELOG/ADRs/decisions/evidence; contracts/rollback and four-module demo; phối hợp global regressions với owner.
- Đầu ra: signed-off write-set/evidence package; truthful scoped-complete vs global-release-ready; no dependency installs, DB shared mutations hoặc delivery tự động.
- Test/AC: scoped gates pass; global fail ngoài scope có owner/blocker rõ, release không declared ready; source ≤300/complexUI ≤500, logic ≤30/render ≤100; commit/push/deploy chỉ sau approval. Phụ thuộc: QA-01/02/03.

## 8. Mapping tasklist gốc và phần bỏ khỏi kế hoạch

| Backlog gốc | Xử lý trong kế hoạch cá nhân |
|---|---|
| G01/G02/G03 | Giữ phần liên quan auth/chat/admin/mobile auth-chat; không sửa lint/behavior community/workspace |
| G04/G05 | Schema integrity/RLS/Chroma remediation là phụ thuộc cần phối hợp; không biến thành nhiệm vụ sửa cả DB/vector infrastructure |
| S01…S06 | Giữ security core; S04 bỏ Work Chat socket, S06 bỏ upload/evaluation rate-limit |
| W01/W04 | Chỉ lấy READ/ASK ACL cho chat và note ownership; không Workspace lifecycle/member/contribution policy |
| W02/W03, D01…D08 | Ngoài phạm vi; document metadata/download/status/redaction dùng contract từ owner |
| R01…R06 | Giữ grounding/citation/provider/trace phục vụ chat; ingestion/embedding lifecycle không nhận; R07 calibration research ngoài scope |
| C01…C06 | Giữ chat AI, chuyển thành tasks Core/AI/web/mobile ở trên |
| A01/A02/A04 | Giữ audit/metrics/AI Studio; A03 chỉ phần user-account đã tách ADM-01, workspace/document admin ngoài scope |
| E01…E06, P01…P04 | Ngoài phạm vi: research Evaluation, community và Work Chat/DM |
| M01/M02/M03 | Ngoài phạm vi: mobile community/workspace; M04 chỉ chat/history/citation, M05 chỉ auth/session |
| K01/K02/K03 | Ngoài phạm vi mới; chỉ AZ-03 bảo vệ Studio Notes đã tồn tại trong chat |
| T01…T04, O01…O03 | Giữ testing/refactor/CI/docs theo đúng scope; full infra/backup/deletion/research demo bàn giao owner khác |

Các test và thao tác đọc quyền có thể dùng workspace/document IDs làm fixture. Chúng là tiêu chí bảo mật của chat, không phải phát triển chức năng workspace hoặc bài viết.
