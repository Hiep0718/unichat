# Decisions Log

## 2026-07-08 - UniChat Architecture And Use Case Draft

- Decision: Create one editable multi-page Draw.io file instead of separate files.
  Rationale: The user requested both an architecture sketch and a use case diagram for the same UniChat thesis scope; one file keeps the draft easy to review and edit.

- Decision: Use the latest scope document and current SRS as the primary source when documents disagree.
  Rationale: The project scope document states it is the source of truth for MVP scope synchronization.

- Decision: Model MVP storage as local server storage with a MinIO upgrade path.
  Rationale: The current SRS and scope document supersede older backbone notes that listed MinIO as the immediate MVP storage.

- Decision: Model normal chat as the MVP requirement and streaming response as optional extension.
  Rationale: The current SRS and scope document narrow streaming to an extension after the basic chat flow is stable.

- Decision: Model manual RAG evaluation as required and RAGAS/TruLens as optional.
  Rationale: The current SRS and scope document make manual citation/answer evaluation the minimum required evidence.

## 2026-07-08 - Project Context Digest

- Decision: Write the reusable project context into `.pipeline/codebase-analysis.md`.
  Rationale: The scan-codebase skill names this as the canonical analysis artifact, and the user requested one file future agents can read to recover project context quickly.

- Decision: Use the extracted text files in `.tmp/unichat-doc-extract/` as the readable source for Word and Excel documents during this scan.
  Rationale: The extracted text files are newer than the source `.docx`/`.xlsx` files and avoid repeatedly parsing binary Office artifacts.

- Decision: Do not stop for user clarification before creating the digest.
  Rationale: The main contradictions are already resolved by the Project Scope document, which explicitly states it is the source of truth when project documents disagree.

- Decision: Record unresolved items as confirmation questions inside the digest rather than blocking artifact creation.
  Rationale: The unresolved items affect planning freshness and polish-level scope, but they do not prevent creating a useful context digest now.

## 2026-07-08 - UniChat Activity Flow Diagram Scope

- Decision: Create a new multi-page file `unichat-activity-flows.drawio` instead of modifying `unichat-architecture-usecase.drawio`.
  Rationale: The existing file is architecture/use-case oriented; the user asked for activity flows, so a separate file keeps concerns clear and avoids overwriting the prior diagram.

- Decision: Include five activity pages: API request lifecycle, upload/ingestion, chat RAG/citation, error/security/retry, and Admin dashboard.
  Rationale: These cover the application's main operational flows from receiving a request through document processing and RAG answering, plus cross-cutting failure and admin paths.

- Decision: Deliver editable Draw.io XML and a diagrams.net edit URL fallback, without PNG previews.
  Rationale: The installed draw.io desktop executable returned no output and did not export PNG files, while the `.drawio` file validated successfully.

## 2026-07-09 - Thesis Folder Reorganization

- Decision: Group root thesis artifacts into numbered topic folders.
  Rationale: The workspace previously mixed proposal, requirements, design, planning, and diagram files at the root; numbered folders make the review order and document purpose clearer.

- Decision: Rename primary deliverables to lowercase kebab-case without accents.
  Rationale: This gives the files consistent, portable names while preserving Vietnamese content inside the documents.

- Decision: Move superseded or historical planning documents into `archive/`.
  Rationale: Older references remain available but no longer compete visually with the current MVP scope, SRS, and design deliverables.

- Decision: Keep generated support artifacts in `.tmp/` and agent context in `.pipeline/`.
  Rationale: These files support automation and traceability but are not final thesis deliverables.

## 2026-07-09 - Report And Research Folders

- Decision: Add `06-bao-cao-do-an-tot-nghiep/` and `07-tai-lieu-nghien-cuu/` as numbered folders.
  Rationale: The user requested separate locations for the final thesis report and research/reference materials; continuing the existing numbering keeps the workspace scan order clear.

## 2026-07-09 - Graduation Report Outline Document

- Decision: Create the graduation report as a Vietnamese academic outline document using A4 pages, Times New Roman, formal margins, cover page, front matter, expected table of contents, chapter outline, references, and appendices.
  Rationale: The user requested a standard-form graduation report document at the outline stage, so the artifact should look like a report shell rather than a notes file.

- Decision: Use a static expected table of contents for this draft instead of an auto-updated Word TOC field.
  Rationale: The document currently contains chapter outlines only; final page numbers should be updated after detailed content is written.

## 2026-07-09 - Project Plan Workbook Sync

- Decision: Rebase the implementation timeline from 2026-07-09 while preserving the final demo target of 2026-11-03.
  Rationale: The workbook still reflected the older June/early-July schedule even though the workspace currently contains planning documents and no initialized implementation codebase.

- Decision: Move PPTX/XLSX/OCR, streaming, voice, mindmap, mobile, LMS, MinIO, and Redis work into after-MVP items.
  Rationale: The current project scope defines PDF/DOCX/TXT, normal chat, citation, history, permission, admin dashboard, local storage, and manual RAG evaluation as MVP priorities.

- Decision: Treat USER and ADMIN as MVP technical roles in the plan.
  Rationale: Student/Teacher remain business personas, but the current technical MVP scope uses USER/ADMIN authorization.

## 2026-07-09 - Graduation Report Chapters 1-3 Draft

- Decision: Expand Chapters 1, 2, and 3 in the graduation report while leaving Chapters 4-7 as outline sections for later implementation evidence.
  Rationale: The user requested current project content for Chapters 1-3 only; later chapters depend on actual design, implementation, testing, and demo artifacts.

- Decision: Base the chapter content on the current UniChat MVP scope and project decisions rather than older broad-scope notes.
  Rationale: Current scope prioritizes PDF/DOCX/TXT, USER/ADMIN, Workspace-scoped RAG, citation, history, admin dashboard, local storage MVP, and manual RAG evaluation.

## 2026-07-09 - Graduation report academic wording pass

- Decision: Replace product-planning terms such as "MVP", "after-MVP", "scope", "optional", and "official version" in the graduation report with academic-scope wording such as project scope, implementation scope, topic limitations, and future development.
- Rationale: The user noted that repeated MVP/product-release wording could confuse the supervisor and reduce the academic quality of the report.
- Implementation note: The main DOCX was locked by another process, so the corrected version was saved as a separate DOCX in the same report folder; the original remains backed up and unchanged until the lock is released.

## 2026-07-10 - Chapter 1-3 thesis completion scope

- Decision: Create a revised DOCX copy focused on completing Chapters 1-3 in detail while leaving Chapters 4-7 as outline sections.
- Rationale: The user explicitly clarified that Chapters 4-7 are not needed yet, and preserving the original report avoids overwriting an existing draft.
- Impact: The deliverable will be a new report file in the thesis report folder, based on the current UniChat scope/SRS/design documents.

## 2026-07-10 - Research resources folder for UniChat

- Decision: Added a curated research folder with README, BibTeX, and URL shortcuts instead of downloading copyrighted books or duplicating online documentation.
- Rationale: The user asked for useful books and online materials; link-based references are legal, lightweight, and suitable for thesis citation workflow.
- Impact: The folder `07-tai-lieu-nghien-cuu` now contains recommended RAG, embedding, backend, database, security, frontend, and book resources.

## 2026-07-10 - AI Knowledge Platform Reframing

- Decision: Reframe UniChat as an AI Knowledge Platform for higher education instead of a chatbot/RAG document QA product.
- Rationale: Aligns with the core architecture where workspace authorization, extraction, retrieval, and citation reasoning form a structured enterprise knowledge system.
- Impact: Updated thesis deliverables, SRS, and specification docs to reflect the knowledge platform positioning.

## 2026-07-22 - RLS Remediation Plan Rewrite

- Decision: Rewrite RLS remediation plan from Supabase client-direct model to defense-in-depth model matching UniChat's actual architecture (Core API → JDBC → Supabase-hosted PostgreSQL).
  Rationale: Original plan assumed Supabase Auth (`auth.uid()`) and PostgREST client-direct access. UniChat's Core API owns authorization (ADR-004) and connects via JDBC as superuser. RLS serves as defense-in-depth safety net, not primary authorization.

- Decision: Use deny_all (`USING(false)`) RLS policy on all tables instead of ownership-based policies (`auth.uid() = user_id`).
  Rationale: Core API role has BYPASSRLS/superuser and handles authorization in application code. Complex per-table policies would add maintenance burden without security benefit.

- Decision: Revoke ALL privileges from `anon`, `authenticated`, and `service_role` Supabase roles on schema `public`.
  Rationale: User confirmed Supabase Dashboard/API is not used for direct data queries. Revoking all PostgREST roles eliminates the attack surface from leaked API keys.

- Decision: Include `flyway_schema_history` in RLS scope (enable RLS + deny_all).
  Rationale: User requested inclusion. Core API DB role (superuser) bypasses RLS, so Flyway migrations are unaffected. This prevents PostgREST from exposing migration metadata.

- Decision: Drop `resource_jobs` table via V5 migration instead of applying RLS.
  Rationale: ADR-007 replaced PostgreSQL-based job queue with RabbitMQ. No Java/Python/TS code references `resource_jobs`. Table exists only in V1 DDL. User approved removal.

- Decision: Update `data-model.md`, `master-data.md`, and `stack-and-dependencies.md` to remove `resource_jobs` references.
  Rationale: Keeping deprecated table references in specification documents creates inconsistency with ADR-007 and the new V5 migration.

## 2026-07-27 - Workspace Members Management Implementation

- Decision: Implement `WorkspaceMemberController`, `WorkspaceMemberService`, and associated DTOs (`AddWorkspaceMemberRequest`, `UpdateWorkspaceMemberRequest`, `WorkspaceMemberResponse`) in Core API.
  Rationale: Provides REST endpoints (`GET/POST/PATCH/DELETE /api/v1/workspaces/{workspaceId}/members`) for managing workspace members and access roles (OWNER, EDITOR, VIEWER) matching `api-contracts.md` and `permission-matrix.md`.

- Decision: Automatically increment `permissionVersion` on the `Workspace` entity whenever members are added, updated, or removed.
  Rationale: Satisfies data-model §7 requirement that any permission-affecting mutation increments `permissionVersion` to trigger ACL re-evaluation on in-flight requests.

- Decision: Create `frontend/src/features/members/` with `member-api.ts`, `member-schema.ts`, `MemberTable` component, and public barrel `index.ts`.
  Rationale: Provides self-contained frontend member management UI conforming to feature-based organization, Vanilla CSS BEM styling, Zod validation, and zero ESLint/TypeScript warnings.

## 2026-07-27 - Document Management API & Async Ingestion Pipeline Implementation

- Decision: Recommend CloudAMQP (84codes Lemur plan) for Cloud-managed RabbitMQ, fully compatible with Supabase PostgreSQL and local Docker Compose fallback via `SPRING_RABBITMQ_ADDRESSES` / `RABBITMQ_URL`.
  Rationale: CloudAMQP provides standard managed AMQP/AMQPS protocol on cloud with 1,000,000 free messages/month, requiring zero code changes for cloud/local environment switching.

- Decision: Implement `DocumentController`, `DocumentService`, `LocalStoragePort`, `DocumentIngestionProducer`, `RabbitMqConfig` (Exchange `unichat.ingestion.exchange`, Routing key `document.uploaded`, Dead-Letter Queue `unichat.dlq.queue`), and unit tests (`DocumentServiceTest`) in `core-api`.
  Rationale: Fulfills `api-contracts.md §4` and `ADR-007` for 202 Accepted multipart upload (max 20 MiB, PDF/DOCX/TXT), SHA-256 integrity checksum, storage port isolation, and async RabbitMQ event publishing.

- Decision: Implement `text_extractor.py`, `chunker.py`, `vector_store.py`, and `ingestion_consumer.py` in `ai-service`.
  Rationale: Fulfills `ADR-012` source locator extraction (PDF page, DOCX block/paragraph, TXT line range), sliding window chunking with overlap, and ChromaDB `unichat_chunks_v1` insertion using `multilingual-e5-base` passage embeddings.

- Decision: Create `frontend/src/features/documents/` with `document-api.ts`, `DocumentTable` component, drag-and-drop upload zone, and public barrel `index.ts`.
  Rationale: Provides complete document management UI conforming to feature-based structure, Vanilla CSS BEM styling, and zero ESLint/TypeScript warnings.

## 2026-07-27 - Adaptive Knowledge Retrieval & Reasoning Engine Implementation (Phase 2)

- Decision: Implement `intent_detector.py` (6 Vietnamese intent rules: OUT_OF_SCOPE, COMPARISON, SUMMARY, DEFINITION, REASONING, FACT), `strategy_selector.py` (retrieval budget & similarity floor mapping), `retrieval_engine.py` (ChromaDB vector query with `allowedDocumentIds` filter and `query: ` E5 prefix), `evidence_gate.py` (calculating evidenceScore = 0.50*top + 0.30*meanTop3 + 0.20*coverage and ANSWER/CLARIFY/REFUSE decision), `llm_provider.py` (Gemini stable primary + Ollama local fallback), and internal REST endpoint `/internal/v1/retrieval/answers` in `ai-service`.
  Rationale: Implements core P0 Adaptive Retrieval engine strictly matching `adaptive-retrieval-spec.md`, `ADR-010`, and `ADR-011`.

- Decision: Implement `ChatController`, `ChatService`, `Conversation`, `Message`, `ConversationRepository`, `MessageRepository`, DTOs (`AskQuestionRequest`, `QuestionResponse`, `CitationResponse`), and unit tests (`ChatServiceTest`) in `core-api`.
  Rationale: Fulfills `api-contracts.md §5` for authorized RAG question processing (`POST /api/v1/workspaces/{workspaceId}/questions`), conversation session tracking, and transaction persistence.

- Decision: Create `frontend/src/features/chat/` with `chat-api.ts`, `ChatPage` component, `CitationPanel` (Citation Inspector), `RefusalCard`, and public barrel `index.ts`.
  Rationale: Delivers complete frontend RAG chat experience with source citation inspector, refusal/clarification cards, Vanilla CSS BEM styling, and zero ESLint/TypeScript errors.

## 2026-07-27 - Conversation History & Session Management Implementation (Phase 3)

- Decision: Implement `ConversationController`, `ConversationService`, `ConversationResponse`, `MessageResponse`, `ConversationDetailResponse`, and `ConversationServiceTest` in `core-api`.
  Rationale: Provides REST endpoints (`GET/POST /api/v1/workspaces/{workspaceId}/conversations`, `GET/DELETE /{conversationId}`) for managing chat sessions, listing active user conversations, fetching message histories, and archiving sessions.

- Decision: Create `frontend/src/features/history/` with `conversation-api.ts`, `ConversationList` sidebar component, and public barrel `index.ts`.
  Rationale: Delivers complete conversation history UI conforming to feature-based organization, Vanilla CSS BEM styling, and zero ESLint/TypeScript warnings.

## 2026-07-27 - Admin Dashboard, Quality Evaluation & Deployment Implementation (Phase 4)

- Decision: Implement `AdminUserController`, `AdminUserService`, `UpdateUserStatusRequest`, `UserResponse`, and `AdminUserServiceTest` in `core-api`.
  Rationale: Fulfills administrative user management requirements (`GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/{userId}/status`) with strictly enforced `ADMIN` systemRole security checks.

- Decision: Implement `eval_runner.py` benchmark evaluation suite, `/internal/v1/eval/run` REST endpoint, and `test_eval_runner.py` in `ai-service`.
  Rationale: Provides automated quality evaluation testing (Intent accuracy, Evidence Gate pass rate, sample latency) against benchmark golden dataset.

- Decision: Create `frontend/src/features/admin/` with `admin-api.ts`, `UserManagementTable` component, search input, lock/unlock actions, and public barrel `index.ts`.
  Rationale: Provides complete administrative dashboard UI conforming to feature-based organization, Vanilla CSS BEM styling, and zero ESLint/TypeScript errors.

## 2026-07-29 - Cloud-Shared Dev Environment ($0 Budget)

- Decision: Migrate RabbitMQ from local Docker to CloudAMQP Little Lemur free tier for shared async ingestion between developers.
  Rationale: CloudAMQP free tier provides 1M messages/month and 20 concurrent connections, sufficient for 2-developer workflow. Eliminates local Docker dependency for message broker. Core API `spring.rabbitmq.addresses` and AI Service `RABBITMQ_URL` both support `amqps://` scheme for TLS.

- Decision: Migrate document file storage from `LocalStoragePort` (local disk) to `SupabaseStoragePort` (Supabase Storage REST API) behind the existing `StoragePort` interface using `@ConditionalOnProperty`.
  Rationale: Supabase free tier provides 1GB storage, sufficient for development. Using the existing interface pattern means zero changes to `DocumentService` or `DocumentController`. Both implementations coexist and are selected via `STORAGE_PROVIDER` environment variable (`local` or `supabase`).

- Decision: Keep ChromaDB as local persistent storage (not cloud) for vector embeddings.
  Rationale: No reliable free cloud-hosted ChromaDB service exists. Vector chunks are derived data that can be fully regenerated from source documents via re-ingestion. Two developers can maintain independent local ChromaDB instances without data corruption risk.

- Decision: Add `pika==1.3.2` as a new direct dependency in AI Service for RabbitMQ consumer support.
  Rationale: `pika` is the official Python AMQP client recommended by RabbitMQ. The consumer runs in a daemon thread alongside FastAPI, started via lifespan context manager. This replaces the previous design where AI Service had no queue consumer and relied on direct HTTP calls.

- Decision: Fix `AI_SERVICE_BASE_URL`, `OLLAMA_BASE_URL`, and `CHROMA_BASE_URL` in `.env.example` from Docker internal hostnames (`ai-service:8000`, `ollama:11434`, `chroma:8000`) to localhost addresses.
  Rationale: In the no-Docker local dev environment, all services run directly on the developer's machine. Docker internal DNS names are not resolvable outside containers.

## 2026-07-31 - Workspace Members API and Detail Tabs Implementation

- Decision: Implement MemberService and MemberController to handle workspace member invitations, role updates, and removals.
  Rationale: Fulfils api-contracts.md section 3 requirements for workspace membership management.

- Decision: Auto-activate members upon invitation (status = ACTIVE) instead of requiring a separate acceptance flow.
  Rationale: Simplifies the invitation flow for the thesis scope while maintaining security (only OWNERs can invite).

- Decision: Enforce strict OWNER-only authorization on all member mutation APIs (invite, change role, remove).
  Rationale: Complies with the AGENTS.md rule that core-api owns authorization and adheres to the API contracts.

- Decision: Build Settings Tab as a unified workspace-settings.tsx file containing General, Access, and Danger Zone forms.
  Rationale: While file-plan.md suggested separate files, keeping them in one file (< 300 lines) reduces component fragmentation and simplifies optimistic locking state management.

- Decision: Use CSS variables from index.css (DESIGN.md tokens) for all new Workspace Detail tabs instead of hardcoded hex values.
  Rationale: Ensures compliance with the 'Academic Precision' Corporate Modern light theme required by the project design system, fixing an earlier oversight where dark theme colors were used.

### 2026-07-31: Removed PUBLIC visibility condition from findAllVisibleToUser
**Context:** In the 'My Workspaces' page, users were seeing workspaces they did not own because the repository query fetched all workspaces with PUBLIC visibility, causing confusion (users thought they were seeing mock data).
**Decision:** Removed OR w.visibility = PUBLIC from WorkspaceRepository.findAllVisibleToUser.
**Consequences:** The 'My Workspaces' list now only correctly shows workspaces where the user is an active member or owner.

## 2026-08-04 - Workspace Dashboard Hub Upgrade (Phase 1)

- Decision: Remove auto-redirect logic from `workspace-list-page.tsx` that immediately navigated to the first workspace on load.
  Rationale: The redirect prevented users from ever seeing the workspace dashboard page. The `/workspaces` route should serve as the main landing page after login, giving users an overview and choice.

- Decision: Add Welcome Banner, Quick Stats, and Recent Workspaces sections to the workspace list page, transforming it into a Dashboard Hub.
  Rationale: The previous flat list lacked context, personalization, and visual hierarchy. A dashboard pattern matches modern SaaS UX and provides quick orientation after login.

- Decision: Compute Quick Stats (total workspaces, documents, members) by aggregating from the existing workspace list API response instead of creating a new backend endpoint.
  Rationale: Avoids backend scope creep in Phase 1. The workspace list already returns `documentCount` and `memberCount` per workspace, making client-side aggregation trivial and accurate.

- Decision: Add color-coded left border to workspace cards (Primary=Private, Secondary=Shared, Success=Public) and staggered entrance animation.
  Rationale: Visual differentiation by visibility type improves scannability. Staggered animation creates a polished, premium feel consistent with the Corporate Modern design system.

- Decision: Extract sub-components (WelcomeBanner, QuickStats, RecentSection, AllWorkspacesSection, ErrorState, EmptyState) from the monolithic workspace-list-page.
  Rationale: The original 189-line page would have exceeded 300 lines with the new sections. Extracting keeps each component focused and within AGENTS.md limits (render ≤ 60 JSX lines, file ≤ 300 lines).

## 2026-08-04 - Workspace Dashboard Explore Public Tab (Phase 2)

- Decision: Add `findPublicWorkspacesExcludingMember` to `WorkspaceRepository` and expose it via `GET /api/v1/workspaces/explore`.
  Rationale: The existing `findAllVisibleToUser` explicitly filters to only show workspaces where the user is an owner or member. The Explore tab needs to show the opposite: public workspaces the user hasn't joined yet.

- Decision: Implement self-enrollment via `POST /api/v1/workspaces/{workspaceId}/join` granting the `VIEWER` role by default.
  Rationale: Public workspaces are meant for community access. The user explicitly requested joining as a `VIEWER` by default to allow exploring content without accidentally modifying it.

- Decision: Implement a "Segmented Control" (Tab) pattern on the Workspace Dashboard frontend to switch between "My Workspaces" and "Explore".
  Rationale: Keeps the main dashboard uncluttered while providing a clear, top-level navigation paradigm for discovering new content.

- Decision: Render public workspaces in the Explore tab using a dedicated `ExploreCard` component rather than reusing `WorkspaceCard`.
  Rationale: The interactions are fundamentally different. `WorkspaceCard` navigates into the workspace, while `ExploreCard` needs a primary "Join" action button. Reusing the component would require complex conditional rendering and prop-drilling.

