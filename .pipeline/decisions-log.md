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

## 2026-08-04 - Workspace Dashboard UI Polish (Phase 3)

- Decision: Add Sort Dropdown and View Mode Toggle (Grid/List) directly inside the workspace controls section.
  Rationale: Improves usability by giving users control over how they want to view their workspaces.
- Decision: Use CSS Grid template modifications (`grid-template-columns: 1fr !important`) combined with flex layout changes in the card components for List view mode.
  Rationale: CSS-only layout changes are much more performant than conditional React rendering of entirely different DOM structures.

## 2026-08-19 - Batch Multi-File Document Upload Implementation

- Decision: Update `POST /api/v1/workspaces/{workspaceId}/documents` in Core API to accept both single `file` and batch array `files` (`MultipartFile[]`).
  Rationale: Maintains 100% backward compatibility for single-file API clients while enabling efficient batch document uploads in a single request.

- Decision: Perform pre-flight batch quota validation across all uploaded files in `DocumentService.uploadDocuments` before persisting database records.
  Rationale: Ensures workspace document limits (100 documents max, 1 GiB total storage size, 20 MiB per file) are consistently enforced across the entire batch, throwing a `ConflictError` before processing if limits would be exceeded.

## 2026-08-19 - Browser-side PDF Splitting & Side-Effects Warning Modal

- Decision: Maintain 20MB per-file upload limit on Core API backend and build a browser-side PDF auto-splitting tool using `pdf-lib`.
  Rationale: Protects Core API RAM/Disk resources and HTTP multipart bandwidth while allowing users to upload large lecture PDFs (>100MB) without external software.

- Decision: Present an explicit Side-Effects Warning Modal (`PdfSplitModal`) before executing PDF page splitting.
  Rationale: Ensures complete transparency regarding Context Fragmentation in RAG embeddings, Workspace 100-document quota consumption, and altered RAG source citation labels (e.g. `[Filename]_Part1.pdf`).

## 2026-08-19 - Adaptive PDF Slide vs Text Layout Extraction & Chunking

- Decision: Implement layout classifier (`pdf_classifier.py`) to automatically distinguish PowerPoint/Keynote PDF slides from continuous Word/Text PDFs based on aspect ratio (>= 1.15) and word density (<= 140 words/page).
  Rationale: Lecture slides contain sparse text boxes and graphics. Preserving full-slide chunks with `SLIDE_NUMBER` locators (`slide:X`) prevents context fragmentation and provides precise slide-level source citations for educational RAG queries.

## 2026-08-19 - Academic RAG Benchmark Evaluation Plan ($0 Budget)

- Decision: Standardize academic RAG evaluation pipeline using Arize Phoenix Web UI + RAGAS framework + 120-question Golden Dataset.
  Rationale: Delivers a 100% free ($0 budget), highly credible, industry-standard evaluation dashboard (localhost:6006) for academic thesis defense, measuring Faithfulness, Context Precision, Answer Relevance, and Refusal F1-Score.

## 2026-08-23 - Reddit-Style Forum Pivot (Phase A: Community Chat Decommission)

- Decision: Remove all community chat real-time messaging infrastructure (WebSocket, STOMP, Redis, Channels, Messages) from both Core API and frontend.
  Rationale: The dual-channel (Chat + Discussion) model added architectural complexity without proportional value. A unified Reddit-style REST discussion model consolidates community interaction into thread-based discussions with voting, reducing infrastructure dependencies (Redis, WebSocket) while improving knowledge discoverability.

- Decision: Remove `spring-boot-starter-websocket` and `spring-boot-starter-data-redis` dependencies from pom.xml.
  Rationale: No remaining features require WebSocket message broker or Redis. NotificationEventListener uses `@Async` (thread pool), not Redis pub/sub.

- Decision: Remove `@stomp/stompjs` and `sockjs-client` npm packages from frontend.
  Rationale: All real-time chat UI code is deleted. Remaining community features (discussions, reactions, notifications) use REST APIs only.

- Decision: Preserve Discussion, Reply, Reaction, Notification entities and services.
  Rationale: These form the foundation for the Reddit-style mechanics (voting, threaded comments, notification bell) being built in subsequent phases.

## 2026-08-23 - Chat Streaming Lifecycle & Single Inline Loading Bubble

- Decision: Render initial assistant loading state inline inside `ChatMessageItem` when streaming begins with empty content (`!message.content && message.isStreaming`) and remove redundant standalone loading container in `ChatPage`.
  Rationale: Prevents duplicate assistant card placeholders on screen when sending a message while preserving a smooth transition to typewriter text when tokens arrive.

- Decision: Guarantee `done` SSE signal emission on stream completion across frontend `chat-api.ts` and backend `SseChatService.java`.
  Rationale: Ensures the UI never hangs indefinitely in a loading/thinking state if the HTTP stream connection closes without an explicit `done` event.

## 2026-08-23 - Vector Sync Warning Modal & Real-Time Progress Tracker

- Decision: Replace immediate background execution of "Đồng bộ Vector DB" with a pre-flight warning and confirmation modal (`SyncVectorModal`).
  Rationale: Prevents accidental re-sync triggers, informs the user if Chroma Cloud already contains chunks (avoiding unnecessary processing), and clearly communicates CPU and performance trade-offs.

- Decision: Implement thread-safe `SyncTracker` in AI Service and real-time progress bar tracking on the frontend modal.
  Rationale: Provides users with clear percentage progress (`0-100%`), file counters (`x/y files`), current filename being processed, and stored chunk counts so they can monitor completion before initiating AI chat sessions.

## 2026-08-23 - Knowledge Studio Interactive Tools Modal & DB Notes Persistence

- Decision: Build dedicated interactive tools modal (`KnowledgeStudioModal`) and saved notes viewer (`SavedNoteModal`).
  Rationale: Elevates Knowledge Studio features (Podcast, Flashcards, Quiz, Mindmap, Slide Outline, Academic Report) into spacious, thesis-grade interactive SaaS components with 3D card flips, Web Speech synthesis, Mermaid diagram controls, and full Markdown rendering.

- Decision: Implement Flyway migration `V11__studio_notes.sql` and REST API controller for per-conversation notes persistence.
  Rationale: Ensures user notes generated in Knowledge Studio are saved directly to PostgreSQL DB, auto-associated with active conversation sessions, and loaded on page reload.

## 2026-09-20 - Short-term Conversation Memory & Context Window Compaction (ADR-021)

- Decision: Implement short-term session conversation memory (up to 10 raw message pairs + compacted summary) for AI RAG questioning, without touching long-term user profile persistence.
  Rationale: Empowers multi-turn conversational coherence for iterative student research questions ("Giải thích OOP", "Ví dụ về nó") within the scope of P0 without violating ADR-001 boundaries.

- Decision: Trigger compaction at AI Service when conversation tokens reach 80% of budget (8,500 tokens), using ~2 chars/token ratio for Vietnamese mixed text.
  Rationale: AI Service understands token budgets and LLM prompt mechanics best; compacts old messages into a concise summary while preserving referents for ambiguous pronouns.

- Decision: Store compacted summary in `conversations.summary` and `summary_version` using optimistic locking (`WHERE id = :id AND summary_version = :expectedVersion`).
  Rationale: Ensures concurrency safety and avoids race conditions when multiple queries complete in parallel for the same conversation session.

- Decision: Bypass `RULE_AMBIGUOUS_PRONOUN` CLARIFY rule in `intent_detector.py` when `has_conversation_context=True`.
  Rationale: When previous conversation turns exist, pronouns like "nó là gì", "cái đó là gì" are referential to previous context rather than ambiguous standalone questions.

- Decision: Extract duplicate system prompts from `stream_provider.py` and `llm_provider.py` into shared `prompt_builder.py`.
  Rationale: Eliminates ~50 lines of duplicate prompt text and guarantees prompt consistency between streaming and non-streaming responses.

## 2026-09-20 - Conversation Memory Stabilization & Concurrency Review

- Decision: Add `@Transactional` on `ConversationHistoryBuilder.persistSummary` and `clearAutomatically = true, flushAutomatically = true` on `ConversationRepository.updateSummary`.
  Rationale: Prevents `TransactionRequiredException` when persisting summary from asynchronous streaming threads in `SseChatService`, and prevents Hibernate 1st-level cache stale overwrite during commit.
- Decision: Slice `conv_messages` to last 10 messages when `conversation_summary` is already present, and order SSE thought events chronologically.
  Rationale: Prevents redundant context token explosion and repetitive re-compaction loops on every single turn once a conversation exceeds 20 messages, and ensures frontend visual thought steps are sequential: INTENT (1) -> RETRIEVAL (2) -> COMPACTION (3, optional) -> SYNTHESIS (4) -> GENERATION (5).

## 2026-09-20 - Playwright E2E Automation Suite 05 (Conversation Memory & Compaction)

- Decision: Create dedicated Playwright test suite `automation-tests/specs/05-conversation-memory-compaction.spec.ts`.
  Rationale: Provides comprehensive automated end-to-end verification for multi-turn conversation flow, pronoun resolution continuity, real-time COMPACTION thought event streaming, NotebookLM Thoughts Accordion rendering, and subsequent turns with compacted summary retention.
- Decision: Guard `setDiscussions` against undefined `page.content` in `discussion-page.tsx` and streamline sidebar chat navigation in `04-chat-rag-interface.spec.ts`.
  ## 2026-09-20 - Master E2E Lifecycle & Edge Cases Automation Suite (Suite 06)

- Decision: Create `automation-tests/specs/06-master-conversation-compaction-lifecycle.spec.ts` covering 4 continuous multi-turn interactions, cold start, pronoun resolution, context compaction trigger, working memory continuity, inline LaTeX math, Java code block syntax highlighting, clipboard copying, citation chip inspection, and citation drawer interaction.
  Rationale: Fulfills rigorous thesis-level E2E coverage and provides a long-running recorded test demonstrating all phases of ADR-021 without skipping any interactive UI element or edge case.
- Decision: Configure Playwright video capture with smooth delays (`waitForTimeout`) at critical UX moments (drawer open, thought accordion expansion, compaction badge display).
  Rationale: Generates clear, high-definition video artifacts (`video.webm`) suitable for presentation, defense demos, and automated CI regression verification.

## 2026-09-21 - @AI Replies Keep Their Citations And Their Own Identity

- Decision: Post assistant replies as a dedicated system account (`00000000-0000-0000-0000-0000000000a1`, `assistant@unichat.system`, status `LOCKED`, unusable password hash) instead of reusing the asking member's id.
  Rationale: The thread previously showed a student answering their own question. The account is locked and has no usable credential, so it can never sign in; migration `V19` also repoints the AI replies created before this change.

- Decision: Persist the AI Service `citations` array on `discussion_replies.citations` (JSONB) and resolve each `documentId` to its uploaded file name in the Core API.
  Rationale: The previous code read only `answer` and dropped the sources, leaving a grounded-looking answer a reader could not verify. The AI Service knows ids, not the names the group uploaded documents under, so the name is resolved where the library lives.

- Decision: Trigger the answer from an `AiMentionEvent` handled with `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`, replacing `CompletableFuture.runAsync` with no transaction.
  Rationale: The assistant's reply hangs off the triggering reply via `parent_reply_id`, so that row must be committed first; the old code could also save outside any transaction.

- Decision: Send the internal service token and explicit connect/read timeouts on the AI Service call, and record `retrieval_trace_id` on the reply.
  Rationale: The discussion path was calling the internal endpoint without an `Authorization` header (unlike `ChatService`) and with an unbounded `RestTemplate`; the trace column has existed since `V8` and was never written, so an answer could not be traced back to its retrieval run.

- Decision: Poll for the assistant's reply on the post page (2 s, up to 60 s) and show a pending line.
  Rationale: The answer is written seconds after the comment. Without this the reader sees nothing until a manual reload and assumes the assistant ignored them.

- Decision: Mark `AiReplyService`'s injectable constructor with `@Autowired`.
  Rationale: The class carries a second, package-private constructor so a test can supply a `MockRestServiceServer`-bound `RestTemplate` instead of reaching the network. With two constructors and neither annotated, Spring falls back to a no-arg constructor that does not exist and fails bean creation at startup — a trap `mvn test` cannot catch, since only a real context refresh exercises it.

## 2026-09-21 - Unblocking Migrations V17 And V16 On The Shared Dev Database

- Decision: Drop the old `reactions_reaction_type_check` constraint before the data migration in `V17`, not after it.
  Rationale: The script set rows to `LIKE` while the constraint from `V8` still allowed only `UPVOTE`/`DOWNVOTE`/`HELPFUL`, so the `UPDATE` violated the very constraint it was about to replace. Postgres rolls a failed script back whole, so `V17` had never applied on any database since it was written, and the app could not start.

- Decision: Renumber `V16__post_attachments.sql` to `V20__post_attachments.sql`.
  Rationale: Flyway's schema history on the shared dev database already recorded version 16 as `V16__conversation_summary.sql` — a teammate's migration applied directly, not present in this working tree. With `validate-on-migrate: false`, Flyway trusts the version number alone, so it treated version 16 as done and silently skipped this branch's script: `post_attachments`, `discussions.edited_at` and the `DELETED` status value were never created, surfacing only later as a Hibernate schema-validation failure. Verified that no Java code and no later migration (V17–V19) references the file by version number before renaming it.

- Note: both were found by starting Core API end-to-end against the real development database. `mvnw clean test` passed throughout and could not have caught either, since neither Flyway nor schema validation runs in the unit suite.

## 2026-09-21 - AI Summaries For Document Attachments

- Decision: Trigger summarisation from the existing RabbitMQ ingestion callback via a `DocumentProcessedEvent`, rather than adding an AI Service endpoint.
  Rationale: `/retrieval/answers` already takes `allowedDocumentIds`. Passing exactly one id makes the answer a summary of that file alone, so the feature needed no AI Service change and no coordination with the teammate who owns that service.

- Decision: Store the summary on `post_attachments` with a four-value `summary_state`, rather than posting it as a reply in the thread.
  Rationale: The summary belongs with the file, not in the conversation; a post with three attachments would otherwise produce three assistant comments. The states separate "still coming" from "never coming" — a member's contribution sits at PENDING until an owner approves it, and an image is NOT_APPLICABLE rather than merely unsummarised.

- Decision: A refusal is never stored as a summary; the attachment is marked UNAVAILABLE instead.
  Rationale: Storing `refusalReason` in the summary field would render the assistant's apology where the reader expects the document's contents.

- Decision: Extract `AiRetrievalClient` from `AiReplyService`.
  Rationale: Two features now call the same endpoint with the same service token and timeouts; duplicating that in both would let them drift apart.

## 2026-09-21 - Duplicate Detection While Composing A Post

- Decision: Search existing posts as the title is typed, debounced at 300 ms, using the existing indexed full-text query and never calling the AI Service.
  Rationale: A group where the same question is asked five times is one where nobody finds the answer the sixth time. Keeping it to one indexed query is what makes it safe to run on every keystroke; a retrieval call per keystroke would be both slow and wasteful.

- Decision: Sort suggestions so posts with an accepted answer come first.
  Rationale: A resolved thread ends the reader's search; a merely related one does not.

- Decision: Report the count of approved documents alongside the suggestions.
  Rationale: It answers, cheaply and honestly, whether the assistant has anything to read in this group. It deliberately does not claim the answer exists — only that there is something to search.

- Decision: Give the compose modal a separate `onOpenExisting` callback instead of reusing `onCreated`.
  Rationale: Opening a suggested post creates nothing. Both existing callers happened to only navigate, so reuse would have worked today, but `onCreated` also refreshes feed statistics and any future caller would reasonably treat it as "a post now exists".

## 2026-09-22 - One Search Across Posts And Documents

- Decision: Scope the search to the caller's active memberships, resolved on the server, with no workspace parameter in the request.
  Rationale: A workspace id in the query string is an id a client can substitute. Deriving scope from membership means the endpoint cannot be widened from outside, and matches the rule the rest of the product follows: the Core API decides what may be read.

- Decision: Return posts and documents as two lists rather than one ranked list.
  Rationale: They are not comparable. Someone searching for a file wants to see files, not a file ranked below three discussions that happen to mention it.

- Decision: Match documents on file name only, not contents.
  Rationale: Searching inside documents is what retrieval already does, with embeddings and a re-ranker. Reimplementing it in SQL would produce a worse answer by a second route, and the two would disagree.

- Decision: Report per document whether the assistant can read it, using the same `PROCESSED` rule retrieval applies.
  Rationale: A file name does not say whether a contribution was approved, and that is exactly what someone deciding whether to ask the assistant needs to know.

- Decision: A query of two characters or more replaces the feed list with unified results, and the feed fetch is skipped while it does.
  Rationale: Filtering the feed would hide any matching document, which is the whole point of searching. Fetching a feed nobody renders is a wasted request, and the pager belongs to the feed rather than to search results.

## 2026-09-22 - Work Chat, Persistence And Authorization

- Decision: Messaging is allowed only between people who share a group, decided in a separate `ContactDirectory`.
  Rationale: On a campus platform, everyone being reachable by every stranger is a way to be harassed rather than a feature, and a shared group is the relationship the product already models. Keeping the rule in one class means the service asks it rather than each call site re-deriving who counts as a contact. The assistant account is excluded explicitly: it is not a person anyone can message.

- Decision: Store the two participants in a fixed order (`participant_low < participant_high`) rather than as starter and recipient.
  Rationale: Without the ordering, (a,b) and (b,a) are two rows, so the same pair would get two conversations depending on who opened first and the unique constraint would not prevent it. Enforced by a CHECK in the schema and by making `DirectConversation.between` the only way to construct one.

- Decision: A conversation the caller does not belong to returns the same "not found" as one that does not exist.
  Rationale: A conversation id is a UUID a caller can present. Distinguishing the two answers would confirm to a stranger that a given conversation exists.

- Decision: Unread counts exclude the caller's own messages.
  Rationale: Otherwise every thread the caller has spoken in carries an unread badge for its own author.

- Decision: Denormalise `last_message_at` onto the conversation.
  Rationale: The conversation list sorts by recent activity on every load; reading it from the messages table would mean a join or a subquery per row for a value that changes once per message.

- Scope held deliberately narrow for the deadline: one-to-one, text only, no attachments and no group threads. Adding either later needs a schema change rather than a flag, which is the honest signal that they were not designed for.

## 2026-09-22 - Work Chat, Realtime Delivery

- Decision: Added `spring-boot-starter-websocket`, flagged to the user before doing so per the standards on unapproved packages.
  Rationale: Realtime delivery needs it, and the plan the supervisor approved names WebSocket/STOMP. It is a first-party Spring Boot starter whose version comes from the parent BOM (spring-websocket 7.0.8), so it stays pinned with the rest of the framework.

- Decision: Authenticate on the STOMP CONNECT frame rather than at the HTTP handshake, and permit `/ws/work-chat/**` in the security chain.
  Rationale: A browser cannot set an Authorization header on a WebSocket handshake. The handshake is therefore open — verified returning 101 — but a connection that never sends a valid CONNECT cannot subscribe or send anything. Only CONNECT is inspected: a SEND must not be able to re-authenticate itself as someone else mid-connection, which is covered by a test.

- Decision: Deliver only to user destinations (`/user/queue/messages`), with the principal named by user id.
  Rationale: Spring routes user destinations by principal name, so a subscriber receives their own queue and cannot name someone else's. Every message here belongs to exactly one recipient, so there is no topic for anyone else to subscribe to at all.

- Decision: Broadcast from a `DirectMessageSentEvent` handled after commit, rather than pushing from the service that saves the message.
  Rationale: Pushing a message whose transaction then rolled back would show the recipient something that does not exist, and nothing later would take it away. It also keeps the service free of the broker, so it works and stays testable without one.

- Decision: Track presence in process memory, counting sessions per user rather than flagging.
  Rationale: Presence is disposable — a stale dot costs a moment of confusion, not data. Counting sessions means someone with two tabs open does not appear offline when they close one. The limitation to state in the thesis: with more than one instance, each reports only the clients connected to itself.

- Decision: The presence endpoint returns only the caller's contacts who are online, not everyone online.
  Rationale: Otherwise it becomes a way to watch people the caller shares no group with.

## 2026-09-22 - Work Chat, User Interface

- Decision: Added `@stomp/stompjs@7.3.0`, pinned exactly, flagged before installing.
  Rationale: A STOMP client is needed to read the queue the backend publishes to. Hand-rolling frame encoding, heartbeats and reconnection is where subtle bugs live, and this package has no transitive dependencies at all, so the cost is one file's worth of code rather than a tree.

- Decision: Sending goes over REST; the socket only delivers.
  Rationale: The socket is a convenience, not the source of truth. A page that cannot connect still sends, still loads history, and shows an unobtrusive "reconnecting" line rather than blocking the composer.

- Decision: Keep the draft when a send fails.
  Rationale: Clearing the box on failure loses what the person wrote, which is worse than the failure itself.

- Decision: Read the push handler from a ref, assigned in an effect rather than during render.
  Rationale: Capturing the handler would reconnect the socket on every new callback identity, tearing it down constantly; mutating a ref while rendering is not safe under concurrent rendering.

- Note: `npm audit` reports two pre-existing high-severity advisories in `react-router-dom` 7.18.1 (RSC-mode CSRF bypass), fixed in 7.18.4. Not introduced here and not upgraded mid-feature; it belongs in the phase 8 cleanup.

- Not yet verified: two real users exchanging a message over the socket. That needs two signed-in accounts, and test users were deliberately not created in the shared development database.

## 2026-09-23 - Feed And Work Chat Redesign (Direction B)

- Decision: Added a `--ws-*` surface scale rather than retuning the existing Material tokens.
  Rationale: Retuning `--color-*` would restyle every screen at once, including ones not reviewed (documents, workspaces, AI chat, admin). The new scale is applied to the feed and Work Chat first; the rest keep the old look until they are moved deliberately.

- Decision: Cards separate by elevation, not by a 1px outline.
  Rationale: With a border on every card, sidebar and input, nothing stands out and the whole page reads as a wireframe.

- Decision: Dropped the 44px status rail from the feed card; resolution state is a chip in the header row.
  Rationale: The rail cost a column of width to display one number, and squeezed the title — the part a reader actually scans.

- Decision: Replaced `--color-primary-fixed` (#dce1ff) as the active/state colour with the navy `#1e3a8a`.
  Rationale: The lavender is washed out, gives weak contrast for text placed on it, and makes the product look like nobody chose a colour.

- Fixed while here: `.work-chat` used `height: calc(100vh - 64px)`, subtracting a top bar the shell does not have — it has only a left rail — so the page fell 64px short. Introduced with Work Chat's UI, not by this redesign.

## 2026-09-23 - A Display Name Separate From The Email

- Decision: Added `users.display_name`, backfilled from the email local part, and replaced all ten sites that derived a name with `split("@")[0]`.
  Rationale: Every name in the product was a piece of the member's email address, shown to everyone in their groups. Besides reading as unfinished, it leaks the local part of an address. Backfilling to exactly what was displayed before means nothing changes visually until someone chooses a name.

- Decision: The `@mention` handle stays derived from the email and is NOT the display name.
  Rationale: A handle has to be unique, which the unique index on lower(email) already guarantees; display names are free text, so two members may share one and `@lan` would be ambiguous. This is the Slack split between username and display name.

- Decision: Removed the "Trợ lý AI" name override in `DiscussionService` now that migration V23 stores that name on the assistant's row.
  Rationale: Keeping both would leave two sources of truth for the same string.

## 2026-09-23 - Profile Pictures

- Decision: An upload is decoded, redrawn at a fixed 256px square and re-encoded as PNG; the original bytes are never stored.
  Rationale: Two reasons. It caps what a huge file costs to serve, and it drops every metadata chunk the original carried — a phone photo otherwise ships GPS coordinates to everyone in the member's groups. Decoding is also the real check that the file is an image, since the declared content type is only what the client claimed; a test covers a non-image claiming to be a PNG.

- Decision: The letter avatar stays the default rather than a placeholder to be replaced.
  Rationale: Nobody should have to upload a photo to be recognisable in a list. A chosen colour gives members a way to be distinguishable without one.

- Decision: Avatar colours are a fixed set of six names, not free-form hex.
  Rationale: An arbitrary colour behind white initials is easily unreadable. Storing the name and keeping the hex in the stylesheet also stops the two drifting apart about what "navy" means.

- Decision: Pictures are fetched as blobs through a shared per-user cache.
  Rationale: `<img src>` cannot send a bearer token, so each picture has to be read with fetch. Without the cache, a feed of twenty posts by four people would issue twenty requests; with it, one per person, and one in-flight promise per person so simultaneous mounts do not race.

- Decision: Serving an avatar requires authentication but not a per-request membership check.
  Rationale: Checking group membership per avatar would mean twenty queries for a twenty-post feed. The user id needed to ask is a UUID, not guessable, and is only learned from content the caller can already see. Recorded as a deliberate trade-off on the endpoint.

- Decision: Deleting the picture an upload replaced is best-effort and never fails the upload.
  Rationale: An orphaned blob costs storage; a failed upload costs the member the thing they just did.

## 2026-09-23 - Member Profiles

- Decision: A profile shows only the groups the viewer and the subject share, and counts contributions inside those groups alone.
  Rationale: Listing everything someone belongs to would tell a viewer where that person studies and works beyond anything the viewer is part of. This reuses the rule Work Chat already applies to decide who may be messaged, so there is one answer to "what may this person see of that one". Viewing your own profile scopes to all your groups, which is the same rule.

- Decision: A member sharing no group is reported as not found, not as an empty profile.
  Rationale: Found-but-empty still confirms the account exists to anyone probing user ids.

- Decision: Statistics are shown as pairs — documents approved of contributed, answers accepted of replies written.
  Rationale: A bare "23 replies" flatters someone who posted 23 times and resolved nothing. The ratio is what says whether the contribution was usable, and it is the number that makes the community's effect on the knowledge base legible for the thesis.

- Decision: "Top tags" are taken from questions the member has replied to, not the ones they asked.
  Rationale: What somebody answers about says where to send a question; what they ask about says the opposite. This is the piece that connects a profile to knowledge-gap escalation.

- Decision: The profile carries the mention handle explicitly.
  Rationale: Now that the display name is free text, the name on screen is no longer what you type to mention someone, and the profile is where a viewer would look to find out.

## 2026-09-23 - A Second Migration Version Collision, And Its Root Cause

- Incident: `V23__user_display_name.sql` never ran. The shared development database already had version 23 recorded as `V23__enable_rls_defense_in_depth_v2.sql`, applied from another branch earlier the same day. Flyway skipped this branch's V23 in silence, and the failure surfaced only as Hibernate reporting `missing column [display_name]`. This is the second time — V16 collided with `V16__conversation_summary.sql` the same way.

- Decision: Renumbered to `V25__user_display_name.sql`.
  Rationale: The same remedy as V16 to V20. Nothing in V24 depends on it, so the order is free.

- Decision: Turned `validate-on-migrate` back on.
  Rationale: This is what made both collisions silent. With validation on, a version already recorded under a different script fails the startup loudly instead of being skipped. The existing `ignore-migration-patterns: "*:missing,*:ignored"` still tolerates migrations applied from another branch that are not in this tree, which is why this can be enabled without first reconciling those. Verified by starting the application: it migrates and boots clean.

- Still open, and not something code can fix: two people are numbering migrations independently against one shared database. Agreeing on disjoint ranges, or on who adds migrations, would stop the collision happening at all. Validation only turns a silent skip into a loud stop.

## 2026-09-23 - Merging main Into feat/knowledge-gap-escalation

- Decision: Merged `origin/main` (8 commits: conversation memory compaction, chat streaming UI, citation drawer, studio tools, Playwright suites) rather than continuing to diverge.
  Rationale: The branches had split at `ae0706f`, 8 commits against 29. Only four files conflicted, and waiting would have made every one of them worse.

- Decision: `login-form.tsx` resolved to main's side, dropping the demo login button.
  Rationale: That button set client auth state from a hardcoded JWT. Its signature never passed the server, so it granted nothing, but it had no place in a submission. Main had already removed it; this takes that removal.

- Decision: `discussion-page.tsx` resolved by combining both sides.
  Rationale: This branch added the in-group search argument and main added a guard for a response without a content array. Taking either side alone would have dropped a real improvement.

- Decision: `document-table.tsx` resolved by keeping the role-aware hint and folding main's new text into the editor branch.
  Rationale: An editor needs to know what the ingestion pipeline accepts; a contributor needs to know their file waits for approval. Main's single line answered only the first.

- Decision: `conversation_summary` renumbered to V26 and made idempotent with IF NOT EXISTS, rather than repairing the database.
  Rationale: The file was applied to the shared database as version 16 from a working copy that was never committed, then committed on main as version 12. Version 12 is taken here by `V12__remove_mock_seed_data.sql`, and no revision in git matches the checksum recorded for 16 — verified by restoring main's exact bytes and watching validation still reject it. A fresh number is only safe if re-running is harmless, hence IF NOT EXISTS: a no-op where the columns exist, correct on a fresh database. This avoids writing to the shared database at all, which `flyway repair` would have required.

- Note: validation earned its keep immediately. Turned on hours earlier, it caught this checksum mismatch at startup instead of letting the merge appear to succeed and fail later somewhere unrelated.

## 2026-09-26 - Removing Post Tags

- Decision: Removed tags from the product entirely — the input in the compose modal, the chips on the feed card and post detail, the "Chủ đề đang bàn" sidebar list, the `?tag=` feed filter, the `/feed/trending-tags` endpoint, and "Hay trả lời về" on the profile.
  Rationale: Measured before deciding. The live database holds 5 posts, all 5 untagged, and 0 distinct tags across the whole table. The input was free text with no suggestions and no autocomplete, so two people writing about the same thing produce two different tags — which is why a tag taxonomy needs a scale this product does not have. Every feature built on top was reading an empty column: the sidebar rendered its empty state permanently, the filter could never be reached, and the profile line never appeared.

- Decision: Left the `tags jsonb` column and `idx_discussions_tags` in place rather than adding a migration to drop them.
  Rationale: The column is `NOT NULL DEFAULT '[]'`, so Postgres fills it on every insert once the entity field is gone — verified before removing the mapping. Dropping it would be a one-way migration against a database a teammate shares, for no gain: Hibernate `ddl-auto: validate` checks that mapped columns exist, not that every column is mapped. `V13__feed_enhancements.sql` is already applied and must not be edited, since Flyway checksums the whole file.

- Decision: Dropped the expertise-routing suggestion from the summary document along with the feature.
  Rationale: That proposal was to route unanswered questions to whoever answers about a tag most often. It was the only remaining argument for keeping tags, and it rests on the same empty data — routing computed from 0 tags routes nothing. Keeping the suggestion while removing its foundation would have left the document claiming a cheap next step that is not cheap.

## 2026-09-26 - Workspace Cards: Covers, Faces, and a Hardcoded Zero

- Decision: Declined shadcn/ui and added no UI dependency.
  Rationale: shadcn/ui is not an installable component library — it is copy-paste source built on Radix and Tailwind utility classes, so adopting it means adopting Tailwind. This codebase is plain CSS with BEM naming and a `--ws-*` token set added days ago for the "Mạch lạc" direction; Tailwind's preflight would reset styles app-wide and leave three styling systems coexisting, since the documents, chat and admin screens are still on the old Material tokens. It would also not have addressed the complaint: shadcn's `Card` is a bordered div with padding, and the gap against the reference screenshot was cover art, real numbers and density, not component primitives.

- Decision: Fixed `documentCount`, which `WorkspaceService.toResponse` had been passing as a hardcoded `0`.
  Rationale: The comment above it read "Document count is 0 until the document feature is implemented" and had outlived its truth — `DocumentRepository.countByWorkspaceId` already existed, unused. The zero surfaced in three places at once: every workspace card, the header stat (which sums the cards), and the group header's "0 tệp" — the inconsistency reported earlier against a library of six files. This was outside the batch of extra work chosen for this round, and is included anyway because the same round rebuilds the card footer that displays it; shipping a redesigned card that still prints a known-false number is worse than either leaving the card alone or fixing the number.

- Decision: Generated gradients are the cover default, with upload as the override.
  Rationale: The chosen direction was upload. The reference screenshots are Google's curated notebooks with commissioned artwork, which a user's own notebooks do not have — so upload alone predicts cards that stay blank, because most groups will never upload anything. The gradient is derived from the workspace id, which means it is stable across renders (the same group appears in both "Truy cập nhanh" and the list below) and survives renaming.

- Decision: Card statistics load per page through `WorkspaceStatsLoader`, not per card.
  Rationale: The existing mapping already ran one member count per workspace, so a page of twenty groups cost twenty round trips; adding documents, activity and faces the same way would have made it eighty. Four grouped queries cover the whole page instead, so the fix removes the prior N+1 rather than multiplying it. Faces are ranked with `ROW_NUMBER() OVER (PARTITION BY workspace_id)` so the per-group limit applies inside the query — fetching every member of every listed group and trimming in Java would read the whole membership table for a page of large groups.

- Decision: Covers are re-encoded as JPEG, unlike avatars, which are PNG.
  Rationale: A cover is a wide photograph at 1200x400. The same picture as lossless PNG is several megabytes on a screen that lists twenty of them. Re-encoding at all is what strips the metadata a phone photo carries, which is the same reason avatars are re-encoded.

- Decision: `V27__workspace_cover.sql` adds one nullable column and nothing else.
  Rationale: Checked every remote branch before choosing the number — the highest migration anywhere else is V12, and the database is at 26. `validate-on-migrate` now catches a collision at startup if a teammate takes 27 first.

## 2026-09-28 - Workspace Cards, Second Pass

- Decision: Rebuilt the card so the picture fills it and the text sits on top, replacing the cover band above a white panel.
  Rationale: The first pass split the card into two zones — picture, then a white content block. That reads as a form rather than as something worth opening, and it was the specific thing the reference product does differently: there the image is the card and the title sits over it.

- Decision: Dropped the description from the card entirely.
  Rationale: Two reasons, one of which was only visible on screen. Most groups have no description, so the line rendered as "Chưa có mô tả" on nearly every card. Worse, because the content block is anchored to the bottom, a card that *did* have a description pushed its title about 40px above its neighbours', so a row of three titles sat at two different heights. Removing it makes every card structurally identical. The description still appears on the group's own page, where there is room for it.

- Decision: Moved the cover upload from the About tab to a banner across the top of the group page.
  Rationale: It was reported as missing, and it effectively was: it sat on the fourth tab, behind a label ("Giới thiệu") nobody reads as "change the picture". On the banner the control is next to the thing it changes. The About-tab copy was deleted rather than kept as a second entry point, so there is one implementation.

- Decision: Rewrote the gradient themes as deep three-stop bases with a radial highlight, and gave the initial letter a low-opacity watermark treatment.
  Rationale: The first set was flat, saturated and light at the bottom, which left white text needing a heavy scrim to survive — and the scrim then crushed the card to near-black. Deep bases carry white text with a lighter scrim. The centred letter was the loudest element on the card while carrying the least information, since the name is written in full underneath it.

- Decision: Checked the result by rendering it, rather than shipping on tests alone.
  Rationale: Two rounds of this work were delivered without anyone looking at the output, and both were rejected on sight. There is no browser tool in this session, so the real stylesheets were bundled against the components' exact markup and screenshotted with the Chromium binary Playwright had already installed. That is what surfaced the misaligned titles and a list mode that was tall, empty and badly aligned — neither of which any passing test would have caught. The preview lives in the scratchpad, not the repo.

- Decision: Added `workspace-card.test.tsx`, including a test asserting no description element renders.
  Rationale: The alignment bug came from an element existing on some cards and not others. A test that pins the card's structure is the only thing that stops it returning, since the symptom is a layout difference no assertion about text would notice.

## 2026-09-28 - Vibrant Card Palette

- Decision: Replaced the six card themes with two-hue gradients plus a mesh of overlapping colour blobs.
  Rationale: The previous set shaded one hue from dark to bright to dark (indigo-900 → indigo-600 → indigo-950), which reads as corporate rather than energetic. Travelling across two hues — violet to fuchsia, cyan to blue, amber to pink — is the difference between a gradient that looks current and one that looks like a 2015 page header. Each theme now also carries two radial blobs of further hues, which gives depth instead of one flat sweep.

- Decision: The final gradient stop stays a deep 800/900-level tint of the hue, never black.
  Rationale: The title sits there. A bright bottom would need a heavy scrim to carry white text, and that scrim would drain the colour straight back out — the exact problem the change was meant to fix.

- Decision: Lightened the scrim from 74% to 46% at the bottom edge.
  Rationale: Measured rather than guessed. Rendering the gradient stacks without text, decoding the PNG and computing WCAG ratios against white showed 6.93:1 at the worst point for a title needing 3.0 — two to three times more scrim than legibility required, spent on muting the colour. At 46% the worst case is 5.19:1 for the title and 6.41:1 for the 11px meta line (needs 4.5), so every theme still clears AA with margin while the colour reaches the bottom of the card.

- Note: the contrast check reads the themes and the scrim out of the real source files rather than restating them, so the measurement cannot drift from what ships. The script is in the scratchpad; re-run it after any palette or scrim change.

## 2026-09-28 - Page Chrome Brought In Line With the Cards

- Decision: Restyled the banner, tabs, stat cards and control row, rather than leaving them on the old Material look.
  Rationale: The cards now carry vibrant multi-hue gradients while the surrounding page was flat navy, pastel Material tiles and hairline 1px outlines. Two visual languages on one screen, and the older one made the newer one look pasted in.

- Decision: The chrome supports the cards; it does not compete with them.
  Rationale: The obvious move — gradients everywhere — makes a page where nothing stands out. The banner gets one bold gradient because it is the hero and the eye lands there first; everything else is calm, and the palette appears only in small doses (the three stat tiles, the active filter chip, the create button). The cards stay the loudest thing on the page, which is correct, because they are what the page is for.

- Decision: The banner travels navy → indigo → violet rather than shading one navy.
  Rationale: It keeps the brand blue at the point the eye lands while speaking the same two-hue language as the cards. A flat navy block above vibrant cards read as a header from a different product.

- Decision: The two dashboard tabs became a segmented control instead of an underline.
  Rationale: A 2px rule under one of two items is a weak signal, and its hover state applied a rounded background that only covered the top corners, which looked like a rendering fault. A segmented pill also keeps a different shape from the filter chips below it, so "which view" and "which subset" no longer look like the same kind of control.

- Decision: Dropped the 1px outline from search, chips, sort and the view toggle in favour of filled shapes.
  Rationale: An outline around every control is what made the page read as a form. Filled pills with a focus ring carry the same affordance with less visual noise, and match the cards' borderless, shadow-based depth.

- Fixed a regression introduced in the previous pass: `explore-card.css` had been rewritten with `aspect-ratio: 16/11` and absolutely-positioned content but no list-mode rules, while `explore-grid--list` exists — so switching Khám phá to list view would have rendered each card as a full-width banner. Found by grepping which files reuse the restyled classes, not by a test; there is no coverage of that view.

## 2026-09-28 - One Colour Per Group, Everywhere

- Decision: Extracted the card palette into `frontend/src/features/workspaces/group-theme.ts` as the single source of truth for what colour a group is.
  Rationale: The cover hashed the workspace id while the rail's letter avatar hashed the group's *name*, so the same group was violet on its card and pink in the sidebar. Colour is only worth having if it is identity, and identity that disagrees with itself is worse than no colour at all. The module exports the theme table plus `coverBackground`, `coverMesh` and `markBackground`, so a large panel and a 24px tile derive from the same entry.

- Decision: Small marks use a two-stop gradient, not the cover's three stops plus mesh.
  Rationale: At 24px the deep anchor and the blobs only muddy the tile. The point of a mark is that the hue is recognisable at a glance, which the first two stops already carry.

- Decision: Grew the palette from six themes to twelve.
  Rationale: Found by rendering the rail beside the cards rather than by reasoning. With six themes, someone in six groups should expect only about four distinct colours — roughly two colliding pairs — which defeats the identity the change was made for. Twelve brings the expected distinct count to about five of six. All twelve were re-measured for contrast; the tightest is 5.41:1 for the 11px meta line against the 4.5 it needs.

- Decision: Replaced the letter avatar for groups in all five places, not only the rail that was reported.
  Rationale: The rail was what got noticed, but the feed card, post detail, profile group list and the group page header had the same mismatch. Fixing only the reported one would have left the same bug in four places for the user to find next.

- Note: `EntityAvatar` stays for *people*, which is what it is for — a letter on a colour derived from a name, with an uploaded picture when there is one. Only groups moved to `GroupMark`.

- Caught while swapping the group page header: `.group-page__header--under-cover .entity-avatar` styled the white ring that makes the avatar straddle the cover banner. Changing the component would have left that rule matching nothing and the ring would have quietly disappeared, with no test and no lint error to say so.

- Rail restyled to match: the brand tile and the active item now use the navy → indigo → violet gradient the hero banner and the create button already use, so "selected" means one thing across the app. The solid navy block it replaced was blunt against the softer page.

## 2026-09-28 - Coloured Backgrounds for Short Posts

- Note first: posting images was already built. Upload, storage, the attachment row and the preview grid on the feed card all shipped earlier, so the request's "đăng kèm ảnh" half needed no work — only the coloured background was new. Checked before building rather than after.

- Decision: Stored the preset key, never the colours.
  Rationale: `V28__post_background.sql` adds one nullable `background_key VARCHAR(24)`. The gradients live in the frontend's `post-background.ts`, so restyling the set never needs a migration and no row is ever left holding a colour the design has dropped. The trade is that the server must validate the key it does not own; it does, because an unknown key renders as no background at all, which loses the author's choice silently.

- Decision: A background applies only to a short post with no attachments, and both rules are enforced where they can actually be enforced.
  Rationale: A gradient stops being readable past a line or two, and a photo grid over one is noise. Length is checked server-side in `PostBackground.validate` and mirrored in the picker, which hides itself past the limit so the rule is met before the request is sent. Attachments could not be checked at create time — they are uploaded after the post exists — so `PostAttachmentService` clears the key when the first file lands. That is the first moment the two are known to coexist.

- Decision: The picker withdraws rather than greying out.
  Rationale: A control that is visible but refuses to work invites "why not", and the honest answer is that the result would not read well. Showing that is shorter than explaining it.

- Decision: The compose box previews the post on its colour as it is typed.
  Rationale: Choosing from a 32px swatch is not the same decision as seeing the actual words on it.

- Caught while wiring the edit path: `handleUpdate` sent only title and body, and an absent key means "no background" to the server — so editing a coloured post would have stripped its colour every time. The key is now carried through explicitly.

- All eight presets were measured, not eyeballed: the gradients were rendered alone, the PNG decoded, and white-text contrast computed over the band the centred text occupies. The tightest is `sunrise` at 4.09:1 against the 3.0 that 25px bold needs. The first run silently measured only six of eight because the probe window was too short to fit the last row; the script now reports "measured N of 8" and fails loudly rather than passing on a partial sample.

## 2026-09-28 - Why the Background Did Not Appear

- Cause: the backend process serving the app started at 01:06, and `backgroundKey` was added to `CreateDiscussionRequest` at 02:07 — the running server was an hour older than the field. Spring Boot leaves `FAIL_ON_UNKNOWN_PROPERTIES` off, so the compose screen sent the key, Jackson discarded it as unknown, the row saved with null, and the feed response had no such field to render. Nothing failed, which is why it looked like a bug in the feature.

- Diagnosed by querying the database rather than reading code: the column existed and every row was null, which ruled out rendering and pointed at the write path. The process start time then settled it.

- Decision: Added `DiscussionBackgroundTest` covering create, edit, removal and rejection.
  Rationale: `PostBackgroundTest` only exercised the validation helper in isolation, so nothing asserted that a request's key reaches the saved row. That is exactly the link that appeared broken. The test would not have caught a stale server, but it pins the wiring so a real silent drop — a renamed field, a DTO left out of a refactor — fails in the build instead of in the feed.

- Not changed: `FAIL_ON_UNKNOWN_PROPERTIES` stays off. Turning it on globally would make every client break on any field the server does not yet know, which trades one silent drop for a class of hard failures across unrelated endpoints. The real remedy is restarting the server after a backend change, which is a habit, not a setting.

## 2026-09-28 - Comments Open In Place

- Decision: Reused `ReplyThread` and `ReplyForm` in the feed rather than writing a lighter inline thread.
  Rationale: Both already take everything through props, so nesting, citations, reactions and the assistant's answers behave in the feed exactly as they do on the post page — because it is the same code. A second, simpler implementation would have drifted, and the first difference anyone noticed would have been a bug report.

- Decision: The thread component mounts only when opened, so the fetch is lazy by construction.
  Rationale: A feed of twenty cards must not fire twenty reply requests. Making the mount the trigger means there is no separate "have I loaded this yet" flag to get wrong. A test asserts no request is made before the first click.

- Decision: The reply count is held on the card and updated from the thread.
  Rationale: Refetching the feed after every comment would rebuild the list and throw away the reader's scroll position — which is the exact cost that made the old navigate-away flow annoying.

- Decision: The title still opens the post's own page; only the comment button changed.
  Rationale: The permalink is worth keeping — it is what someone sends to a colleague, and the detail page has room for the accept-answer control and the reader list, which do not belong on a feed card.

- Caught by the test run, not by review: the first fixtures used `as never` casts and invented a `mine` field on `ReactionSummary`, which the real type calls `myReaction`; replies also carry their own reactions, which the fixture omitted. `ReactionBar` threw on undefined. Rewritten against the real `ReactionSummary` and `ReplyResponse` types with no casts, so the fixtures now fail to compile if those shapes change rather than throwing at runtime.

## 2026-09-28 - The Group Name Hidden Behind Its Own Cover

- Cause: two faults from the same line. `.group-page__header--under-cover` carried `margin-top: -26px` to make the avatar straddle the banner, which pulled the *entire* header — name included — up into the banner's box. `.cover-banner` is `position: relative` while the header was not, and a positioned element paints after in-flow non-positioned blocks, so the banner covered the name. The same negative margin also dragged the header's "Trợ lý AI" and overflow buttons into the banner's own "Thêm ảnh bìa" control at the bottom right.

- Decision: Raise only the mark, not the row.
  Rationale: The mark is the only thing that should straddle the edge. It gets `align-self: flex-start` and its own negative margin, so the header stays in normal flow below the banner: the name is readable, and the two button clusters no longer occupy the same band. Adding `z-index` to the header would have fixed the paint order alone, but left dark heading text sitting on a saturated gradient — legible in the stacking sense and unreadable in every other.

- Also moved `.cover-banner__tools` from the bottom edge to the top, so the cover's control and the page header's controls are never adjacent even as text lengths change.

- Note on how this was missed: the cover banner shipped two rounds ago and was flagged then as not visually checked — "chưa xem tận mắt: header trang nhóm". It was reported by the user before that check happened. Rendering the header at the time would have shown it immediately; no test asserts paint order, and none reasonably could.

## 2026-09-28 - One Post Card, Not Two

- Cause of the report: the group's own post list rendered `DiscussionCard`, a second card component living inside `discussion-page.tsx`. It predated the feed work and never received any of it — no coloured background, no attachments, old styling, and "N Bình luận" was a `<span>` inside a card whose whole surface navigated away. Everything built for the feed over the last several rounds simply did not exist there.

- Decision: Deleted `DiscussionCard` and used `FeedCard` on both screens, rather than porting the features across.
  Rationale: Porting would have produced two implementations that agree today and drift by the next change — which is exactly how this gap appeared in the first place. One component means the background, the attachments and the inline comments behave identically in both places because it is the same code drawing them.

- Decision: The group page adapts its data rather than the card accepting two shapes.
  Rationale: `DiscussionResponse` and `FeedPostResponse` carry the same post under slightly different names, so a small `toFeedPost` mapper at the call site keeps the card with one prop type. `hasAcceptedAnswer` derives from `acceptedReplyId`; bookmarks are a feed concept and are mapped to false.

- Decision: The card gained `hideGroup`, `pinned`, and an optional `onBookmark`.
  Rationale: Three real differences between the two contexts, each expressed as a prop rather than a second component. Omitting `onBookmark` is how a caller says "there is no bookmark list here", which hides the button rather than rendering one that does nothing.

- Removed the 16 orphaned `.disc-card*` rules. The `.reply-*` rules in the same stylesheet stay: `ReplyThread` and `ReplyForm` still use them, including inside the feed's inline comments.

- Note: the earlier inline-comments round reused `ReplyThread` specifically to avoid a second implementation, and this round found an older second implementation one level up. Worth checking whether the post detail page renders the post body through yet a third path.

## 2026-09-28 - Account Settings Brought Onto the Same Design

- Decision: Restyled the settings page with the vocabulary the rest of the app now uses, rather than inventing a look for it.
  Rationale: Underline tabs, hairline-bordered cards, flat navy buttons and outlined inputs were the last screen still speaking the pre-redesign language. The changes are all substitutions of an existing pattern: segmented tabs (as on the dashboard and the group page), borderless cards with a soft shadow, the navy→indigo→violet gradient for primary actions, filled inputs with an indigo focus ring, and a gradient icon tile for section headers matching the dashboard's stat tiles.

- Decision: The avatar colour swatches became rounded squares with the same selection ring as the post-background picker.
  Rationale: Two places in the app ask "pick a colour"; they should look like the same question. The ring is drawn transparent when unselected so choosing one does not shift the row.

- Caught by rendering: the preview showed "Tải ảnh lên" stretched to full width, which looked like a bug in the new styling. It was not — the preview markup I wrote used `.account-btn--primary`, while the real component uses `.avatar-picker__upload`, a class I had not restyled at all. Re-reading the component and rebuilding the preview from its actual markup showed the real button still had the old flat style. Both were then fixed. The lesson is narrow and worth keeping: a hand-written preview only proves something about the classes the real component actually uses.

- Replaced the last four `--ws-*` token references in `avatar-picker.css` with their `--color-*` equivalents. That file was mixing the feed's token family with this page's; both resolve, so nothing looked broken, but one stylesheet drawing from two token sets is the drift that made the app look like two products in the first place.

## 2026-09-28 - Opening a Group Lands on Giới thiệu

- Changed the group's index route from `discussions` to `about`.

- Decision: Also pointed the four links that named `/discussions` explicitly at the group root.
  Rationale: Three entry points used the index route (the left rail, the workspace card, and the redirect after joining from Khám phá) while four others named the posts tab directly — the group name on a feed card, two on the post detail page, and the group list on a profile. Changing only the index would have made "click a group" mean Giới thiệu in some places and Bài viết in others. One rule is less surprising than two, and it keeps the landing tab a single line to change if that judgement turns out wrong.
