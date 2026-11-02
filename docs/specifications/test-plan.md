# Test và evidence plan — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-009 |
| Version | 1.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Framework | Vitest, JUnit 5, pytest, Playwright |
| Network policy | Không gọi dịch vụ ngoài trong test |

## 1. Pyramid và quality gates

| Tầng | Phạm vi | Gate |
|---|---|---|
| Unit | Pure business logic, validators, detector, selector, Evidence Gate, permission policy | Core logic line/branch ≥80% |
| Integration | Mọi public/internal API, PostgreSQL, Chroma adapter contract, storage adapter | Success + validation + authn + authz + failure |
| E2E | Critical user flows trên stack local với provider fake | Tất cả flow P0 pass |
| Research evaluation | Baseline/adaptive trên dataset đóng băng | Tạo metric/evidence tái lập |

UI component ưu tiên interaction unit test và E2E happy path; không đặt mục tiêu coverage hình thức cho JSX.

## 2. Test conventions

- Co-locate test với source; E2E riêng trong frontend/e2e.
- Tên theo describe(ComponentName) và it(should behavior when condition).
- Arrange, Act, Assert; một hành vi chính/test.
- Clock, UUID, provider, filesystem và external HTTP được kiểm soát/mocked.
- Test data có tiếng Việt đầy đủ dấu.
- Không skip test; quarantine phải có issue, owner và deadline.
- Integration DB dùng Testcontainers PostgreSQL; AI adapter dùng ephemeral/fake Chroma phù hợp contract.
- Provider fake trả fixture JSON; CI chặn outbound network.
- Đánh giá trực tiếp trên Chroma Cloud là bài staging read-only được gọi riêng, không thuộc CI tự động và bắt buộc dùng document allowlist do Core cấp. Không ghi, sửa hoặc xóa collection Cloud hiện có.

## 3. Traceability acceptance criteria

| AC | Test chính | Tầng | Evidence |
|---|---|---|---|
| AC-001 | Login/refresh rotation/logout | Integration + E2E | Token family/audit assertions |
| AC-002 | IDOR Workspace A/B | Integration | 404/403 trước AI call; mock call count 0 |
| AC-003 | Sai MIME/signature/size | Integration | Không file/document/vector mồ côi |
| AC-004 | PDF/DOCX/TXT processed/failed | Integration | Job transition + typed error |
| AC-005 | Chunk metadata bắt buộc | Unit + integration | Schema snapshot |
| AC-006 | Vector filter chéo Workspace | Integration | allowedDocumentIds invariant |
| AC-007 | Sáu intent và strategy | Unit + research | Confusion matrix + trace |
| AC-008 | Evidence yếu | Unit + E2E | CLARIFY/REFUSE; provider call rule |
| AC-009 | Citation khớp chunk | Unit + integration + E2E | Hash/locator assertion |
| AC-010 | Reload history | Integration + E2E | Stable order/content |
| AC-011 | Delete saga | Integration | DB/file/vector reconciliation |
| AC-012 | Provider fallback policy | Unit + integration | Timeout/429/5xx vs non-fallback |
| AC-013 | Admin metrics/lock | Integration + E2E | ADMIN pass; USER 403 |
| AC-014 | Baseline/adaptive same config | Research integration | Paired run/config hash |
| AC-015 | Unicode tiếng Việt | Tất cả | No mojibake snapshot |
| AC-016 | Test isolation | CI | Outbound network denied |
| AC-017 | Global error | Integration | RFC7807 + structured log requestId |
| AC-018 | Build gates | CI | compile/lint/unit/integration/E2E reports |

## 4. Frontend suites

- auth: access token memory, refresh-once, logout, route guard.
- workspace: permission-aware navigation, forms, visibility conflict.
- documents: validation, progress, status, delete confirmation.
- chat: answer, citation focus, clarify/refuse, idempotent retry.
- history: pagination/order/reload.
- work-chat: luật từ chối tệp phía client, gửi tệp không kèm chữ, giữ nháp khi gửi lỗi, chỉ hiện lý do do API trả về, ảnh inline và chip tải về, thu hồi blob URL khi unmount.
- work-chat nhóm: hàng nhóm đặt tên theo nhóm chứ không theo người, bong bóng nhóm nêu tên người gửi còn 1-1 thì không, trần 50 người tự giải thích thay vì khóa im lặng, chủ nhóm thấy nút thêm/xóa còn thành viên thường thì không, lý do bị từ chối vẫn giữ panel mở.
- admin/evaluation: role guard, filters, run state.
- accessibility: axe scan, keyboard path, focus restoration, live region.
- security: raw HTML/script/link protocol không render.

MSW mock toàn bộ Core API trong unit/component test. Playwright chạy với local Core fake-provider profile.

## 5. Core API suites

- auth: Argon2id, JWT claims/expiry, refresh hash/rotation/reuse, CSRF/Origin.
- permissions: toàn bộ permission matrix và permissionVersion race.
- workspace/document: validation, quotas, optimistic locking, storage path.
- jobs: SKIP LOCKED claim, lease expiry, retry, idempotency.
- ask: authorize → AI call → reauthorize → atomic persistence.
- conversation/citation: ownership, cursor, redaction.
- work-chat: participation trên mọi đọc/ghi; tin nhắn chỉ có tệp; không có cả nội dung lẫn tệp bị từ chối; tệp bị từ chối thì không ghi hàng tin nhắn nào; ba mắt kiểm quyền khi đọc tệp (participant, tin nhắn thuộc hội thoại, tệp thuộc tin nhắn); storageKey không ra khỏi server.
- work-chat nhóm: thành viên ngoài tầm `canMessage` bị từ chối (chống lách luật); chỉ OWNER thêm/xóa/đổi tên; OWNER không tự xóa mình; OWNER rời thì quyền chuyển cho người vào sớm nhất; người cuối rời không vỡ; không rời được hội thoại 1-1; trần 50 người; hội thoại 1-1 cũng sinh hàng participant; sự kiện gửi tin nêu đúng tập người nhận trừ người gửi.
- admin/evaluation: RBAC và config freeze.
- error/logging: typed error → RFC7807; redaction.
- architecture: ArchUnit kiểm tra route → service → repository và feature boundaries.

## 6. AI Service suites

- schema/input: Pydantic strict và service JWT binding/replay.
- extraction: PDF/DOCX/TXT fixtures, Unicode NFC, locator, timeout.
- chunking: deterministic boundaries/content hash/version.
- embedding: query:/passage: prefix, dimension 768, normalized vector.
- intent: positive/negative/priority/accent-folded rules.
- strategy/evidence: table-driven test mọi intent và boundary threshold.
- vector: metadata filter, ranking, delete/upsert idempotent.
- generation: structured JSON, citation validation, retry once/refuse.
- definition evidence: title-only phải REFUSE trước provider; đoạn định nghĩa khác locator phải vào prompt và citation trỏ đúng locator hỗ trợ.
- fallback: chỉ timeout/429/5xx; tối đa một lần.
- logging: không raw prompt/chunk/API key.

## 7. E2E scenarios

1. Register/login → create PRIVATE Workspace.
2. Upload PDF → PENDING/PROCESSING/PROCESSED.
3. Ask FACT → answer + citation locator.
4. Ask thiếu bằng chứng → refusal/clarify.
5. Reload conversation → nội dung/thứ tự không đổi.
6. Mời EDITOR/VIEWER → UI và API đúng matrix.
7. User B truy cập PRIVATE của User A → không lộ dữ liệu.
8. Delete document → không còn retrieval/citation excerpt được redact.
9. ADMIN lock user → refresh/access tiếp theo bị chặn.
10. Chạy evaluation → xem metric/config hash.
11. Keyboard-only qua login/workspace/documents/chat/citation.
12. Multi-turn conversation & Context Compaction: hỏi câu tiếp nối với đại từ ("nó là gì"), kích hoạt compaction khi vượt ngưỡng, hiển thị thought step COMPACTION trên Thoughts accordion và duy trì working memory (ADR-021).
13. Master Long-Running Conversation Lifecycle & Edge Cases (Suite 06): kiểm thử toàn bộ 4 lượt hội thoại (cold start, đại từ mơ hồ, kích hoạt nén context khi token vượt budget 80%, working memory summary, tra cứu citation chip & citation drawer, render công thức toán LaTeX & code block Java syntax highlight, copy câu trả lời, không mất trạng thái 8 tin nhắn trong DOM).

14. Gửi tệp trong Work Chat (Suite 07): gửi ảnh kèm chú thích trong **một** request multipart, gửi tin nhắn chỉ có tệp, từ chối định dạng ngoài allowlist mà không upload gì, tệp hiện thành chip tải về kèm dung lượng, bỏ tệp đã chọn trước khi gửi.
15. Chat nhóm (Suite 08): tạo nhóm từ thanh bên rồi mở ra, bong bóng nhóm nêu tên người gửi, chủ nhóm mở được danh sách thành viên và xóa người, thành viên thường không thấy nút của chủ nhóm, rời nhóm thì đóng luồng.

## 8. Research evaluation

- Dùng corpus và question set cố định, được ủy quyền, có manifest/hash bất biến. `total_cases=120` sinh động từ Chroma chỉ là draft/fixture-authoring aid, không phải gold benchmark.
- Split development/holdout theo document-family/topic cluster; mọi paraphrase song ngữ và biến thể nhiều lượt cùng cluster phải nằm trong một split. Không dùng holdout để tuning.
- Cỡ mẫu được xác định sau data gate theo độ phủ intent/ngôn ngữ/document type và số cluster độc lập. Nếu dưới 20 cluster độc lập, chỉ báo cáo mô tả và giới hạn bất định; không tuyên bố ý nghĩa thống kê.
- So sánh baseline/candidate dùng paired cluster-bootstrap percentile hai phía 95%, 10.000 lần lấy mẫu và seed cố định được ghi trong report.
- Human rating dùng thang 1–5 có anchor cho directness, completeness, useful uncertainty, citation correctness và refusal appropriateness; factual support được chấm riêng. Hai rater chấm độc lập tối thiểu 20% case, hoặc toàn bộ khi tập nhỏ; ẩn strategy/model và randomize thứ tự khi khả thi; báo cáo Krippendorff's alpha ordinal, số bất đồng và kết quả adjudication.
- Primary: Recall@K/MRR, source hit@K và citation source accuracy.
- Safety: claim support, locator accuracy, false-refusal/false-answer, refusal appropriateness và cross-Workspace leakage.
- Cost: p50/p95 latency, prompt tokens, số query/chunks và provider/fallback rate khi được phép.
- Không đổi corpus, split, gold labels hoặc cấu hình ngoài thành phần candidate được công bố giữa baseline/candidate; mọi khác biệt model/prompt/strategy phải được version/hash và phê duyệt theo scope.
- Entry point benchmark chuẩn phải dùng fixed dataset và canonical `app/evaluation` runner/metrics/report; unit test riêng lẻ không được thay thế integration test của entrypoint.

## 9. Evidence artifacts

- JUnit/Vitest/pytest/Playwright machine-readable reports.
- Coverage HTML/XML theo service.
- OpenAPI contract diff và dependency audit.
- Evaluation dataset manifest, config snapshot, result rows và metric script.
- Confusion matrix, paired CI, latency distribution và ít nhất 10 case study.
- Screenshots/video chỉ bổ trợ; số liệu cuối phải tái tạo từ raw results.
- Mỗi report gắn commit SHA sau khi Git được phê duyệt/init.

## 10. Exit criteria trước code complete

Compile, typecheck, lint, unit, integration và E2E đều pass; core logic coverage đạt gate; không Critical/High security finding; dependency audit không có unresolved critical; tài liệu hành vi và CHANGELOG cập nhật.

## 11. Hive migration acceptance — ADR-028

- Offline provider/config/parser tests: Hive IDs/model slash, missing credentials, ownership, URL validation, JSON-object/plain modes, UTF-8/SSE fragmentation, reasoning ignored, measured/null usage, caps, EOF/tools/refusal/HTTP failures và no automatic Hive fallback.
- Cancellation/lifecycle: slow-drip dưới chunk target, stalled read, deadline với byte liên tục; private disconnect/cancel xuyên compaction không CHAT/retry/summary sau đó; public detach tiếp tục operation và replay không provider call mới.
- RAG/API: citation retry một lần, domain refusal khác operational FAILED, model attribution tồn tại đến history reload; private signed JWT, API prompt limits và request/error schema.
- PostgreSQL gate races: shared reservation/START đối đầu exclusive state update, replay trước block, stale version409, same-state no-op, DRAINING counts RUNNING/pending, unknown pending giữ nguyên. Database tests dùng disposable instance, không shared Supabase.
- ADMIN/web/mobile: gate RBAC, status/transition/audit/maintenance header, model/key selection tách history filter, GENERATION notice, missing usage không hiển thị0, friendly provider failures không evidence escalation.
- CI chưa có Playwright job; lưu riêng evidence E2E local với mocked network. Real Hive smoke cần approval/credit và fixture được phép, không dùng legacy synthetic research evaluation để kết luận chất lượng.

## 12. Gemini primary / Hive fallback acceptance — ADR-024

- Route unit tests: Gemini primary → Gemini secondary → Hive, tối đa ba attempts; target thành công được pin cho validation retry.
- Failure matrix: chỉ timeout/429/5xx/network advance; 400/401/403, safety, evidence, citation/schema, policy, config và cancel không fallback.
- Purpose matrix: CHAT/COMPACTION dùng route; QUERY_PLAN chỉ Gemini rồi deterministic original-query fallback; ADMIN_PROMPT/KEY_PROBE exact target.
- Registry/readiness/admin tests: primary/fallback metadata nhất quán xuyên AI Service, Core và Web; không provider call thật trong test.
- RAG regression: retrieval, evidence coverage, citation validation, model attribution, history và compaction giữ nguyên contract.
