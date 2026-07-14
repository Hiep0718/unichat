# File plan — UniChat Adaptive Knowledge Retrieval & Reasoning

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-012 |
| Version | 2.0 |
| Trạng thái | Ready for user design approval |
| Repository | Monorepo |
| Quy tắc | Feature-based; file ≤300 dòng; public API có documentation |

## 1. Ownership

| Phạm vi | Owner | Reviewer |
|---|---|---|
| Core API, PostgreSQL, Docker, docs/evidence | Nguyễn Thanh Hiệp | Hoàng Phi Hùng |
| Frontend, AI Service, ChromaDB, AI integration | Hoàng Phi Hùng | Nguyễn Thanh Hiệp |
| OpenAPI, security boundary, evaluation contract | Shared | Cả hai |

## 2. Top-level

| Action | Path | Mục đích |
|---|---|---|
| Create | README.md | Purpose/setup/usage/architecture |
| Create | CHANGELOG.md | Keep a Changelog |
| Create | .env.example | Tên biến, không secret |
| Create | .editorconfig | UTF-8 no BOM, LF |
| Create | .gitignore | Secret/build/model/data exclusions |
| Create | frontend/ | React SPA |
| Create | core-api/ | Spring Core API |
| Create | ai-service/ | FastAPI AI Service |
| Create | infra/ | Compose/config/scripts |
| Create | docs/adr/ | ADR có version |
| Create | docs/api/ | OpenAPI/examples |
| Create | docs/runbooks/ | Local/dev/recovery |
| Create | evaluation/ | Dataset/config/results scripts |
| Create | .github/workflows/ci.yml | Gates sau khi Git được duyệt |

## 3. Frontend foundation

| Path | Trách nhiệm |
|---|---|
| frontend/package.json | Exact dependencies/scripts |
| frontend/package-lock.json | Lock transitive dependency |
| frontend/vite.config.ts | Build/test config |
| frontend/tsconfig.json | strict TypeScript |
| frontend/eslint.config.js | Lint zero warning |
| frontend/playwright.config.ts | E2E local profile |
| frontend/src/main.tsx | Bootstrap/router/providers |
| frontend/src/app/app-router.tsx | Route definitions/lazy routes |
| frontend/src/app/app-providers.tsx | Query/auth/error boundary |
| frontend/src/app/app-shell.tsx | Responsive layout |
| frontend/src/styles/index.css | Tokens/base styles |
| frontend/src/lib/api-client.ts | Fetch, token, RFC7807 |
| frontend/src/lib/query-client.ts | Query defaults |
| frontend/src/lib/result.ts | Expected failure union |
| frontend/src/testing/server.ts | MSW server |
| frontend/src/testing/test-utils.tsx | Render helpers |

## 4. Frontend features

Mỗi feature có index.ts public barrel, schema.ts, api.ts/hooks.ts khi cần, components và test co-located.

| Feature path | Tệp chính |
|---|---|
| frontend/src/features/auth/ | auth-context.tsx, auth-api.ts, auth-schema.ts, login-page.tsx, register-page.tsx, route-guard.tsx |
| frontend/src/features/workspaces/ | workspace-api.ts, workspace-schema.ts, workspace-list-page.tsx, workspace-overview-page.tsx, workspace-form.tsx |
| frontend/src/features/members/ | member-api.ts, member-table.tsx, role-form.tsx |
| frontend/src/features/documents/ | document-api.ts, upload-schema.ts, document-page.tsx, upload-panel.tsx, document-table.tsx |
| frontend/src/features/chat/ | chat-api.ts, question-schema.ts, chat-page.tsx, message-list.tsx, question-form.tsx, citation-panel.tsx, refusal-card.tsx |
| frontend/src/features/history/ | conversation-api.ts, conversation-page.tsx, conversation-list.tsx |
| frontend/src/features/settings/ | settings-page.tsx, general-form.tsx, access-form.tsx, privacy-form.tsx, danger-zone.tsx |
| frontend/src/features/evaluation/ | evaluation-api.ts, evaluation-page.tsx, run-form.tsx, metric-summary.tsx |
| frontend/src/features/admin/ | admin-api.ts, user-page.tsx, metric-page.tsx, user-table.tsx |
| frontend/src/features/errors/ | error-boundary.tsx, forbidden-page.tsx, not-found-page.tsx, problem-alert.tsx |
| frontend/e2e/ | auth.spec.ts, document-chat.spec.ts, permissions.spec.ts, admin.spec.ts, evaluation.spec.ts, accessibility.spec.ts |

## 5. Core API foundation

Base package: com.unichat. Sau source root, nesting không quá com/unichat/feature/file.

| Path | Trách nhiệm |
|---|---|
| core-api/pom.xml | Boot parent/dependencies/plugins |
| core-api/mvnw, mvnw.cmd, .mvn/wrapper/ | Maven 3.9.16 wrapper |
| core-api/src/main/java/com/unichat/Application.java | Bootstrap |
| core-api/src/main/resources/application.yml | Defaults không secret |
| core-api/src/main/resources/application-local.yml | Local profile |
| core-api/src/main/resources/logback-spring.xml | JSON logging/redaction |
| core-api/src/main/resources/db/migration/ | V1 schema, V2 indexes, V3 seed-dev |
| core-api/src/test/resources/application-test.yml | Testcontainers profile |

## 6. Core API shared modules

| Feature path | Tệp chính |
|---|---|
| common/error/ | AppError.java, ValidationError.java, NotFoundError.java, AuthorizationError.java, GlobalErrorHandler.java, ProblemDetailFactory.java |
| common/security/ | SecurityConfig.java, JwtKeyProvider.java, CurrentUser.java, PermissionPolicy.java, ServiceTokenIssuer.java |
| common/web/ | RequestIdFilter.java, IdempotencyFilter.java, PaginationCursor.java |
| common/logging/ | LogContext.java, SensitiveValueRedactor.java |
| common/result/ | Result.java, Failure.java |
| storage/ | StoragePort.java, LocalStorageAdapter.java, StoredFile.java |
| ai/ | AiServicePort.java, AiHttpAdapter.java, AiRequestSigner.java |

## 7. Core API features

Mỗi feature có controller, service, repository, entity/model, DTO/schema và test; tách file khi vượt giới hạn.

| Feature | Tệp chính |
|---|---|
| auth/ | AuthController, AuthService, RefreshTokenService, PasswordHasher, JwtService, User/RefreshToken repositories |
| workspace/ | WorkspaceController, WorkspaceService, WorkspacePermissionService, WorkspaceRepository, WorkspaceMemberRepository |
| document/ | DocumentController, DocumentService, UploadValidator, DocumentRepository |
| job/ | ResourceJobWorker, JobLeaseService, ResourceJobRepository, JobRetryPolicy |
| conversation/ | ConversationController, ConversationService, MessageRepository, CitationRepository |
| question/ | QuestionController, QuestionService, AskOrchestrator, QuestionMapper |
| evaluation/ | EvaluationController, EvaluationService, EvaluationRunWorker, repositories |
| admin/ | AdminController, AdminService, SystemMetricRepository |
| audit/ | AuditService, AuditEventRepository |
| ratelimit/ | RateLimitService, RateLimitRepository |
| idempotency/ | IdempotencyService, IdempotencyRepository |
| deletion/ | DocumentDeletionSaga, WorkspaceDeletionSaga, ReconciliationWorker |

## 8. AI Service foundation

| Path | Trách nhiệm |
|---|---|
| ai-service/pyproject.toml | Exact dependency/config |
| ai-service/requirements.lock | Hash-locked transitive dependency |
| ai-service/app/main.py | App factory/bootstrap |
| ai-service/app/core/config.py | Pydantic settings |
| ai-service/app/core/errors.py | Typed error/result |
| ai-service/app/core/logging.py | structlog/redaction |
| ai-service/app/core/security.py | Service JWT verifier/replay |
| ai-service/app/api/internal_routes.py | Internal v1 router |
| ai-service/app/api/schemas.py | Request/response schemas |

## 9. AI Service features

Mỗi package có __init__.py barrel công khai và test co-located trong package/tests khi phù hợp.

| Feature path | Tệp chính |
|---|---|
| ingestion/ | ingestion_service.py, pdf_extractor.py, docx_extractor.py, text_extractor.py, chunker.py, locator.py |
| embedding/ | embedding_port.py, e5_embedding_adapter.py, embedding_config.py |
| vector/ | vector_repository.py, chroma_adapter.py, vector_filter.py |
| retrieval/ | intent_detector.py, strategy_selector.py, evidence_gate.py, retrieval_service.py, models.py |
| generation/ | generator_port.py, gemini_adapter.py, ollama_adapter.py, fallback_policy.py, prompt_builder.py |
| citation/ | citation_builder.py, citation_validator.py, source_locator.py |
| evaluation/ | evaluation_service.py, metric_calculator.py, dataset_loader.py |
| observability/ | trace_builder.py, metrics.py |
| config/ | adaptive-retrieval-v1.yml, prompt-v1.yml |
| tests/ | conftest.py, fixtures/, contract/, integration/ |

## 10. Infrastructure

| Path | Trách nhiệm |
|---|---|
| infra/compose.yml | Local stack, private network |
| infra/compose.test.yml | Test stack/fake provider |
| infra/docker/frontend.Dockerfile | Multi-stage SPA |
| infra/docker/core-api.Dockerfile | JRE image non-root |
| infra/docker/ai-service.Dockerfile | Python image non-root |
| infra/proxy/nginx.conf | TLS/security headers/routing |
| infra/observability/prometheus.yml | Metrics scrape |
| infra/scripts/check-env.ps1 | Runtime/secret preflight |
| infra/scripts/dev-up.ps1 | Local startup |
| infra/scripts/backup.ps1 | DB/file backup |
| infra/scripts/reconcile.ps1 | Delete/job reconciliation |

## 11. Documentation và evaluation

| Path | Trách nhiệm |
|---|---|
| docs/adr/0001-service-boundaries.md | ADR runtime/network |
| docs/adr/0002-auth-and-permissions.md | Auth/RBAC |
| docs/adr/0003-adaptive-retrieval.md | Novelty/config |
| docs/adr/0004-storage-and-deletion.md | Data lifecycle |
| docs/api/openapi.yml | Generated contract snapshot |
| docs/api/examples.md | Request/response tiếng Việt |
| docs/runbooks/local-development.md | Setup/run |
| docs/runbooks/security.md | Key rotation/incident |
| evaluation/datasets/manifest.yml | 120 cases/version/split |
| evaluation/config/baseline.yml | Fixed Top-K control |
| evaluation/config/adaptive-v1.yml | Frozen strategy hash |
| evaluation/scripts/run_evaluation.py | Paired execution |
| evaluation/scripts/calculate_metrics.py | Metrics/bootstrap CI |
| evaluation/results/.gitkeep | Không commit sensitive raw data |

## 12. Implementation order

1. Repository foundation, exact manifests, CI skeleton.
2. Core auth/error/logging/database migration.
3. Workspace permission policy và API.
4. Document upload/storage/job.
5. AI ingestion/vector contract.
6. Adaptive retrieval pure logic.
7. Ask orchestration/citation/history.
8. Frontend auth/workspace/documents/chat.
9. Delete saga/admin/evaluation.
10. Hardening, observability, E2E và evidence.

## 13. Guardrails và rollback

- Mỗi logical change một commit sau human approval.
- Trước scaffold ghi inventory/hash; rollback chỉ xóa thư mục mới hoặc khôi phục manifest backup sau explicit approval.
- Không sửa tài liệu gốc ở Google Drive trong implementation.
- Không file >300 dòng; pure function ≤30 dòng; React render ≤60 JSX lines mục tiêu.
- Không thêm dependency ngoài stack-and-dependencies.md nếu chưa cập nhật decision log và được duyệt.
- Không tạo source code trước design approval.
