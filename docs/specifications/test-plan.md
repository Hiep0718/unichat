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

## 8. Research evaluation

- 120 case, 20 mỗi intent.
- 60 development và 60 holdout, 10 mỗi intent/tập; split theo topic group.
- Hai người gán nhãn độc lập; Cohen kappa mục tiêu ≥0,70.
- Paired bootstrap 1.000 mẫu, confidence interval 95%.
- Primary: source hit@K và citation source accuracy.
- Safety: claim support, locator accuracy, refusal F1, cross-Workspace leakage.
- Cost: p50/p95 latency, prompt tokens, chunks và fallback rate.
- Không đổi corpus/model/prompt/dataset giữa baseline/adaptive ngoài retrieval strategy.

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
