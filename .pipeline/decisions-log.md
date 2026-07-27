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
- Implementation note: The main DOCX was locked by another process, so the corrected version was saved as a separate DOCX in the same report folder; the original remains backed up and unchanged until the lock is released.## 2026-07-10 - Chapter 1-3 thesis completion scope

- Decision: Create a revised DOCX copy focused on completing Chapters 1-3 in detail while leaving Chapters 4-7 as outline sections.
- Rationale: The user explicitly clarified that Chapters 4-7 are not needed yet, and preserving the original report avoids overwriting an existing draft.
- Impact: The deliverable will be a new report file in the thesis report folder, based on the current UniChat scope/SRS/design documents.
## 2026-07-10 - Research resources folder for UniChat

- Decision: Added a curated research folder with README, BibTeX, and URL shortcuts instead of downloading copyrighted books or duplicating online documentation.
- Rationale: The user asked for useful books and online materials; link-based references are legal, lightweight, and suitable for thesis citation workflow.
- Impact: The folder `07-tai-lieu-nghien-cuu` now contains recommended RAG, embedding, backend, database, security, frontend, and book resources.
## 2026-07-10 - AI Knowledge Platform Reframing

- Decision: Reframe UniChat as an AI Knowledge Platform for higher education instead of a chatbot/RAG document QA product.
- Rationale: The user's newer product vision emphasizes Knowledge Space, knowledge organization, retrieval adaptation, citation, quality, discovery, and AI-assisted learning; this is a stronger thesis direction than "chat AI đọc PDF".
- Decision: Keep the implementation scope small by treating the thesis MVP as one module inside the platform: Adaptive Knowledge Retrieval & Reasoning.
- Rationale: The module is feasible for the current timeline while still creating novelty through basic intent detection, dynamic retrieval budget, metadata-aware retrieval, uncertainty-aware refusal, citation, and evaluation by question type.
- Impact: Current Word deliverables were updated to align product vision, SRS scope, feature list, architecture proposal, topic proposal, and Chapters 1-3 report wording with this direction. Full platform capabilities such as Knowledge Map, Knowledge Graph, Knowledge Evolution, duplicate/contradiction detection, flashcards, quiz, OCR, voice, LMS integration, and community knowledge remain future-development items.
## 2026-07-12 - RAG Chatbot And AI Knowledge Platform Comparison Report

- Decision: Present the transition as a change in product value center and research focus, not as a complete replacement of the existing architecture.
- Rationale: The current Workspace, ingestion, authorization, citation, history, storage, database, and service split remain valid foundations for the first AI Knowledge Platform module.
- Decision: Use the pre-reframing DOCX backups as the historical RAG chatbot baseline and the current architecture brief plus ADRs as the AI Knowledge Platform target state.
- Rationale: This provides traceable before/after evidence from the actual UniChat project rather than a generic conceptual comparison.
- Impact: Added a comparison report in the system-design folder, with the thesis MVP explicitly limited to Adaptive Knowledge Retrieval & Reasoning.
## 2026-07-13 - Draw.io Alignment With AI Knowledge Platform

- Decision: Preserve the validated layouts and unchanged flows in the existing Draw.io files, then update their terminology and add dedicated Adaptive Retrieval and baseline-evaluation pages.
- Rationale: API authorization, document ingestion, error handling, and basic administration remain valid foundations; replacing every page would add layout risk without improving the new product framing.
- Decision: Keep Core Platform API as the authorization boundary and show AI Knowledge Service as the owner of intent detection, retrieval strategy, evidence gating, answer synthesis, citation, and retrieval traces.
- Rationale: This matches the architecture brief and prevents the AI service from becoming a second authorization authority.
- Decision: Use editable `.drawio` XML plus diagrams.net edit URLs as the delivery fallback because the installed draw.io desktop CLI returned no usable output.
- Rationale: The official skill fallback preserves editability while structural validation still verifies IDs, edges, overlaps, and crossings.
- Impact: Architecture/use-case diagrams now contain 3 pages; activity diagrams contain 6 pages. Both have rollback copies from before the AI Knowledge Platform alignment.
## 2026-07-13 - Orchestrated pre-code readiness pipeline

- Decision: Use `D:\codex-workspace\unichat` as the canonical technical workspace and keep the Google Drive directory as the untouched source/backup until an explicit synchronization task.
  Rationale: Pipeline preflight only permits roots under `D:\codex-workspace`, while a Git working tree inside Google Drive is vulnerable to Office locks and sync conflicts.
- Decision: Run Phase 1 in `strict` mode.
  Rationale: The approved goal includes more than 10 readiness tasks and coordinates three runtimes, two data stores, security boundaries and a research experiment.
- Decision: Use the real Planner sub-agent through the exposed collaboration tools, with no write access.
  Rationale: `subAgents.enabled` is true, but `multi_agent_v1` and a dedicated close operation are not exposed in this session; the available collaboration lifecycle provides an actual isolated Planner result while the Orchestrator owns all writes.
- Decision: Treat the proposed title, permission semantics, evaluation sample size and stack cleanup as recommendations pending explicit approval.
  Rationale: These choices materially affect the thesis and must not be inferred from draft artifacts.
- Decision: Make approved Phase 1 artifacts the future source of truth over corrupted or stale Office tables.
  Rationale: Current DOCX tables and the workbook contain verified drift; source precedence must become unambiguous before implementation.
- Decision: Stop before source scaffolding, package installation and Git initialization.
  Rationale: The orchestrator requires Phase 1 approval, while dependency installation and delivery actions have separate human gates.
## 2026-07-13 - TASK-002 document repair fallback

- Decision: Repair only verified document/table/row/cell targets and preserve six adjacent rollback copies.
  Rationale: The earlier broad keyword mutation corrupted unrelated table schemas; index-targeted edits make the repair deterministic and reviewable.
- Decision: Close TASK-002 at structural-QA level while retaining a mandatory visual-QA rerun before final submission.
  Rationale: The bundled renderer is correct, but LibreOffice/Poppler are absent; the Documents Skill explicitly permits structural fallback in this condition.
- Decision: Treat React/Vite/TypeScript plus PostgreSQL as P0 and label Redis as post-P0 in the proposal.
  Rationale: This is part of the user-approved Phase 1 default package and removes the verified Next.js/MongoDB/Redis conflict.
## 2026-07-13 - Phase 2 design and code-ready preparation

- Decision: Split the 120-case research dataset into 60 development and 60 holdout cases, with 10 cases per intent in each split and topic-group isolation.
  Rationale: This strengthens leakage control and preserves paired baseline/adaptive comparison while remaining feasible for two students.
- Decision: Set the primary quality gates to citation correctness >= 0.90, claim support >= 0.90, out-of-scope refusal >= 0.90 and adaptive p95 latency increase <= 25%.
  Rationale: The thesis needs measurable acceptance thresholds rather than qualitative claims alone.
- Decision: Use Node 24.18.0 LTS, Java 21 LTS, Python 3.13.14 and exact direct dependency pins; retain TypeScript 6.0.3 instead of the newly released major 7.
  Rationale: Reproducibility and ecosystem stability are more important than adopting a fresh major during a thesis schedule.
- Decision: Reuse the three local project templates only after approval, then replace their old manifests/ranges and remove H2/Lombok or unused boilerplate.
  Rationale: Project standards require templates first, but the inspected templates are not version-compatible with the approved architecture as-is.
- Decision: Keep PostgreSQL resource_jobs for asynchronous ingestion and omit Redis/brokers from P0.
  Rationale: Lease-based SKIP LOCKED workers meet P0 reliability needs without adding another operational dependency.
- Decision: Keep M00 at 90% in the synchronized workbook until the mandatory design/scaffold/runtime/dependency/Git approval gate is passed.
  Rationale: Marking 100% would misrepresent code-ready status while TASK-013 and TASK-014 remain open.
- Decision: Use UTF-8 no-BOM WriteAllText as the controlled editing fallback in the D: technical copy after the required apply_patch route returned Access denied.
  Rationale: The canonical copy is outside the session's declared writable roots; the fallback is explicitly allowed by the Windows encoding standard and preserves local scope.
- Decision: Deliver validated Draw.io XML plus Mermaid ERD source without claiming PNG visual QA.
  Rationale: draw.io CLI and Graphviz are unavailable; structural validation passed but visual export cannot be verified.
- Decision: Use a direct styled-row copy for the new workbook meeting entry after artifact_tool exposed no table object through the documented accessor.
  Rationale: The targeted copy preserves the existing workbook style and avoids switching spreadsheet libraries mid-task.
- Decision: Do not synchronize the completed changes back to Google Drive automatically.
  Rationale: The user approved the D: technical copy as canonical and no reverse-sync authorization was granted.
## 2026-07-13 - TASK-013 scaffold and security checkpoint

- Decision: Use official portable Node, Temurin JDK and Maven under ignored `.tools` after the Node installer required UAC.
  Rationale: Keep the approved runtime reproducible inside the canonical workspace.
- Decision: Remove unapproved Hatchling and use exact npm/Python locks plus Maven Wrapper.
  Rationale: Do not add packages outside the approved list.
- Decision: Use standalone MockMvc instead of adding a Spring Boot 4 web MVC test starter.
  Rationale: Preserve endpoint test coverage without a new package.
- Decision: Query the official OSV batch API without installing a scanner.
  Rationale: Audit resolved Python and Java runtime inventories without expanding dependencies.
- Decision: Stop before changing ChromaDB or Logback.
  Rationale: The approved versions have Critical and Low findings; remediation versions require explicit approval.
- Decision: Do not start Docker Desktop only to obtain local image digests.
  Rationale: Compose already validates and the security approval gate remains open.

## 2026-07-13 - ChromaDB 0.6.3 Python 3.13 compatibility gate

- Decision: Stop after the full chromadb 0.6.3 wheel dependency failed to build on Python 3.13.
  Rationale: Installing Microsoft C++ Build Tools or switching to chromadb-client would expand the approved package/tool scope and requires explicit approval.
- Decision: Keep the successfully verified Logback 1.5.35 remediation.
  Rationale: The Core API build passed and the packaged runtime contains logback-core/classic 1.5.35.

## 2026-07-13 - ChromaDB accepted-risk deferral

- Decision: Defer SEC-DEBT-001 at the user's explicit request and permit only features that do not use ChromaDB.
  Rationale: The user chose to address the Critical ChromaDB advisory in a later session.
- Decision: Restore Python manifests to chromadb 1.5.9 while retaining the isolated Chroma server image at 0.6.3.
  Rationale: The manifest now matches the healthy local environment; the server image retains the successful remediation and has no host port on an internal network. Client/server compatibility remains unverified and therefore blocks Chroma-backed work.
- Decision: Require SEC-DEBT-001 closure before the first Chroma-backed feature or any deployment.
  Rationale: Accepted risk is a scheduling decision, not evidence that the vulnerable dependency is production-safe.
- Decision: Keep the verified Logback 1.5.35 remediation.
  Rationale: Maven verify and packaged JAR inspection already passed.

## 2026-07-13 - Curated supervisor presentation workspace

- Decision: Treat the Google Drive thesis folder as a curated presentation workspace and keep the D: workspace as the technical implementation workspace.
  Rationale: The user reports progress to the supervisor from Google Drive and explicitly requested removal of technical clutter.
- Decision: Prohibit bulk synchronization from D: to G: in future sessions.
  Rationale: Bulk synchronization would reintroduce backups, pipeline artifacts and temporary files that were intentionally archived.

## 2026-07-13 - Pipeline checkpoint schema normalization

- Decision: Normalize phaseStatus to `in_progress` and approval statuses to protocol-supported `approved`, while preserving accepted-risk details in scope/result fields.
  Rationale: The prior custom status strings were readable but violated the mandatory pipeline schema and would make hardened checkpoint validation unreliable.

## 2026-07-13 - IMP-001 Core API error boundary

- Decision: Accept a client request ID only when it matches a bounded 1-64 character safe pattern; otherwise generate a UUID.
  Rationale: Preserve cross-service correlation without allowing control characters or unbounded attacker-controlled log fields.
- Decision: Map Spring 7 body, method-parameter and constraint validation failures to the same RFC 7807 validation contract.
  Rationale: Validation semantics must remain stable regardless of which Spring validation path rejects an input.
- Decision: Log unexpected exception class and sanitized stack trace without the original exception message.
  Rationale: Preserve debugging location while preventing SQL, secret, path or document content from entering production logs.

## 2026-07-15 - Supervisor progress report

- Decision: Publish a standalone Vietnamese progress-and-overview report under `docs/reports` and compile a local HTML view from the Markdown source.
  Rationale: The user requested a teacher-facing summary that is easier to review than the technical pipeline artifacts while keeping the existing specifications and evidence unchanged.
- Impact: The report distinguishes verified work, pending P0 flows and the accepted ChromaDB security risk; it does not alter product scope, architecture or delivery status.

## 2026-07-15 - AI chatbot versus Knowledge Platform framing

- Decision: Add a dedicated comparison section to the supervisor report using the existing approved thesis comparison as its evidence source.
  Rationale: The user requested that the report clearly distinguish a conventional AI chatbot from the AI Knowledge Platform direction of UniChat.
- Impact: The report now identifies chat as an interface to Knowledge Space, emphasizes adaptive retrieval and evidence control, and explicitly limits P0 to Adaptive Knowledge Retrieval & Reasoning.

## 2026-07-16 - Workspace versus Chat RAG comparative report and commit push

- Decision: Create the comparative analysis document for Workspace vs Chat RAG under `docs/thesis/03-thiet-ke-he-thong/phan-tich-workspace-va-chat-rag-unichat.md` and as a workspace artifact.
  Rationale: The user requested a detailed comparison of the Workspace and Information Retrieval Chat features based on the thesis files, which will be useful for their graduation report.

- Decision: Commit the documentation changes (Workspace/Chat analysis, progress reports, master data specs) on a new branch `feature/docs-thesis-workspace-chat` and push to GitHub, creating a Pull Request to `main`.
  Rationale: The user explicitly requested to commit, push the changes on a new branch, and create a Pull Request.

- Decision: Create `docs/runbooks/frontend-coding-standards.md` to establish React Vite TypeScript coding conventions and structure.
  Rationale: The user requested a document to standardize coding rules and directory structures for them and their teammate, preventing messy code and aligning with the project's file plan.

- Decision: Generate the `unichat-erd.drawio` diagram in `docs/specifications/diagrams/` and `docs/thesis/05-so-do-drawio/` based on the `unichat-erd.mmd` Mermaid ERD.
  Rationale: The user requested to design and draw the database ERD as a Draw.io file directly to serve system design requirements and graduation thesis documentation.

## 2026-07-16 - Core Backend Features Implementation

- Decision: Implement Flyway initial migration script `V1__init_schema.sql` defining 17 tables and indexes.
  Rationale: The database matches the approved data model and ERD, ensuring consistent local schema creation using Flyway migration rather than hibernate auto-generation.

- Decision: Set Maven Java version compiler target to 17 in `pom.xml`.
  Rationale: The user's system only has JDK 17 installed; configuring compilation version to 17 makes the application build successfully locally while remaining fully compatible.

- Decision: Implement authentication with custom opaque refresh token rotation and family reuse detection.
  Rationale: This provides rotation-based session hardening (protecting against token leakage) and satisfies the requirement for opaque refresh tokens as per security specifications.

- Decision: Implement workspace management CRUD with optimistic locking validation using expected version checks.
  Rationale: Optimistic locking protects against concurrent write overlaps and satisfies the data integrity requirements in the system architecture.

- Decision: Limit workspace visibility error responses to 404 Not Found if the user does not have permission.
  Rationale: Throwing 404 rather than 403 prevents malicious users from scanning the system to discover the existence of private workspaces.
## 2026-07-16 - Postgres 18 Docker Mount Configuration

- Decision: Update Postgres volume mount path in `infra/compose.yaml` from `/var/lib/postgresql/data` to `/var/lib/postgresql`.
  Rationale: Postgres 18+ official Docker images changed their directory layout to be pg_ctlcluster compatible. Mounting directly to `/var/lib/postgresql/data` causes start failures due to pre-existing check logic on the data directory. Mounting to the parent directory `/var/lib/postgresql` resolves this compatibility issue.

- Decision: Update default PostgreSQL URL in `application.yml` to use `127.0.0.1` instead of `localhost`.
  Rationale: On Windows systems, `localhost` often resolves to IPv6 loopback (`::1`). Since Docker Desktop typically binds container ports to the IPv4 loopback (`127.0.0.1`), Java application connections to `localhost:5432` fail with `Connection refused`. Using `127.0.0.1` explicitly avoids this issue.

- Decision: Remove `internal: true` from the `private` network definition in `infra/compose.yaml`.
  Rationale: An internal Docker network blocks all port mapping/publishing to the host machine. Since the Core API runs locally on the developer's host machine (outside Docker) and needs to connect to the PostgreSQL and Chroma databases, the network cannot be marked as internal. Binding the ports specifically to `127.0.0.1` (localhost) still preserves secure network isolation from the outside world.

- Decision: Append `?options=-c%20TimeZone=Asia/Ho_Chi_Minh` to the default database connection URL in `application.yml`.
  Rationale: The PostgreSQL JDBC driver automatically sends the JVM's local timezone (e.g. `Asia/Saigon` on Vietnamese Windows systems) when initiating a connection. However, PostgreSQL 18+ inside the Debian Docker container does not recognize `Asia/Saigon` (it expects `Asia/Ho_Chi_Minh` or standard offsets/UTC), causing a fatal connection startup error. Specifying the options parameter forces the PostgreSQL session to use the recognized `Asia/Ho_Chi_Minh` timezone.

- Decision: Set the default JVM timezone programmatically to `Asia/Ho_Chi_Minh` inside a static block in `UniChatCoreApplication`.
  Rationale: The PostgreSQL JDBC driver still reads the JVM default timezone at startup to send in the connection startup packet, which overrides or happens before option parameter initialization. Setting the default JVM timezone programmatically to `Asia/Ho_Chi_Minh` ensures the driver uses a valid identifier recognized by the database server, regardless of the developer's host OS regional settings, without requiring manual VM Options config.

- Decision: Change Jackson `ObjectMapper` imports from `com.fasterxml.jackson.databind` to `tools.jackson.databind` in `IdempotencyService`.
  Rationale: Spring Boot 4.x and Spring Framework 7 have migrated to Jackson 3.x (`tools.jackson.*`) as the default JSON library. The default registered `ObjectMapper` bean is of type `tools.jackson.databind.ObjectMapper`. Changing the imported package ensures dependency injection matches the auto-configured bean without throwing UnsatisfiedDependencyException.

- Decision: Change default Core API server port from `8080` to `8082` in `application.yml` and `.env` files.
  Rationale: Port `8080` and `8081` are occupied on the developer's system by system services (like `AgentService`), causing Tomcat to fail starting. Using port `8082` (which is verified free) prevents port collision.

## 2026-07-16 - Frontend Design System Implementation

- Decision: Implement the 4 core frontend screens (Landing, Login, Register, Workspace List) using pure Vanilla CSS variables, explicitly rejecting the existing Tailwind prototypes.
  Rationale: The project's `frontend-coding-standards.md` explicitly mandates Vanilla CSS with BEM methodology and CSS variables derived from `DESIGN.md`, forbidding utility-first frameworks like Tailwind unless otherwise approved.

- Decision: Replace the `be-vietnam-pro` font package with `@fontsource-variable/inter`.
  Rationale: The Academic Precision design system specification in `DESIGN.md` explicitly defines `Inter` as the standard font family for the application.


## 2026-07-16 - Password Change Feature Backend and Frontend Integration

- Decision: Add `changePassword` endpoint in backend `UserController` and `UserService` using `@PatchMapping("/users/me/password")`.
  Rationale: Password update is a user profile mutation rather than authentication state management, fitting into user service operations.

- Decision: Implement custom `ChangePasswordRequest` DTO and enforce strict password length validation (12-128 characters) on both backend and frontend.
  Rationale: Keeping validation symmetrical between client and server prevents unexpected API rejections and guarantees credential security.

- Decision: Store `accessToken` in `localStorage` upon successful login, and update frontend `fetchJson` to automatically append the Bearer header and handle token rotation on 401 response status.
  Rationale: This abstracts token attachment and rotation, ensuring all future features automatically get authenticated requests without duplicate logic.

- Decision: Prioritize the `detail` property over `title` in frontend API response parsing within `fetchJson`.
  Rationale: Backend errors conforming to RFC 7807 put specific failure details (e.g., "Mật khẩu hiện tại không chính xác") in the `detail` property, while the generic error type name goes into `title` ("Lỗi hệ thống", "Dữ liệu không hợp lệ"). Prioritizing `detail` ensures specific error reasons are clearly rendered to the end user.

- Decision: Use the white version logo (`logo-white.png`) inside `SideNavBar` instead of the blue version.
  Rationale: Using the white variant logo matches the overall system UI style design requirements in DESIGN.md.

- Decision: Add a logout button to the settings sidebar linked to the `/auth/logout` API.
  Rationale: Providing a direct, accessible way to terminate the active session and revoke the token conforms to user security requirements and session life cycle design.

- Decision: Create an OTP-based password reset feature with `/auth/forgot-password` and `/auth/reset-password` endpoints, storing the temporary OTPs in a dedicated PostgreSQL table `password_reset_otps`.
  Rationale: Keeping the OTP state in PostgreSQL allows our services to stay stateless and configuration-driven while ensuring correct OTP expiration and clean lifecycle management without adding high-complexity brokers like Redis for P0.

- Decision: Integrate `spring-boot-starter-mail` and configure JavaMailSender to send actual emails via Gmail SMTP, with username and password parameters loaded dynamically from `.env` environment variables. Include a robust try-catch fallback to console logging so mail transmission failures do not break the API lifecycle flow.
  Rationale: This provides a production-ready real email sending mechanism while maintaining a dev-friendly fallback when SMTP configuration is missing or incorrect.

## 2026-07-18 - Specification synchronization for implemented auth features

- Decision: Add `POST /auth/forgot-password`, `POST /auth/reset-password` and `PATCH /users/me/password` endpoints to `api-contracts.md` Section 2.
  Rationale: These three endpoints were already implemented and deployed in `AuthController.java` and `UserController.java` but were missing from the API contract specification, creating drift between code and source-of-truth documentation.

- Decision: Add `password_reset_otps` table definition to `data-model.md` Section 2 and its retention policy to Section 8.
  Rationale: The table was created in Flyway migration `V2__password_reset_otps.sql` and used by `PasswordResetOtp.java` entity but was absent from the data model specification.

## 2026-07-18 - Security Hotfixes and Auth Foundation

- Decision: Migrate access token storage from `localStorage` to memory using React Context and token accessors in `api-client.ts`.
  Rationale: Adhere strictly to ADR-005 to mitigate XSS risks and ensure access tokens are not persisted to disk.

- Decision: Enforce generic error responses (`422 ValidationError`) for `POST /auth/register` and silent success returns for `POST /auth/forgot-password`.
  Rationale: Prevent user enumeration attacks by standardizing responses regardless of whether the email exists in the database.

- Decision: Remove OTP codes from application logs in `AuthService.java`.
  Rationale: Adhere to ADR-016 which strictly forbids logging sensitive secrets, ensuring production logs remain clean and secure.

- Decision: Implement `AuthGuard` and `GuestGuard` React components to wrap application routes.
  Rationale: Ensure that unauthenticated users cannot access protected routes and authenticated users cannot access login/register pages.

- Decision: Increment `permissionVersion` when workspace visibility is updated in `WorkspaceService.java`.
  Rationale: Align with data-model §7 requirement that any permission-affecting change increments the permission version to trigger ACL re-evaluation on in-flight requests.

## 2026-07-18 - Structure Alignment and Code Quality

- Decision: Retain `com.unichat.core` as the base package for Core API and formalize it via ADR-0005.
  Rationale: Avoids a massive, low-value refactoring effort (affecting 55+ files) while preventing potential conflicts with future shared or AI modules. Nesting limit adjusted to 5 levels.

- Decision: Extract `AdminController` and `AdminService` from the `User` module.
  Rationale: Aligns with file-plan §7 and separates admin-only operations (e.g., getting all users, locking users) into their own domain boundary.

- Decision: Rename frontend `/settings` route and folder to `/account` and update SideNavBar navigation.
  Rationale: UI Spec §7 designates "Settings" for workspace configurations, not user account settings.

- Decision: Create a unified `AppShell` layout component for authenticated frontend routes.
  Rationale: Removes the need to manually include `<SideNavBar />` in every authenticated page, adhering to DRY principles.

- Decision: Implement `ErrorBoundary` and dedicated 403/404 error pages in the frontend.
  Rationale: Improves application resilience and user experience during unhandled exceptions or invalid navigations.

- Decision: Standardize a `Result<T, E>` type in the frontend (`lib/result.ts`).
  Rationale: Provides a robust way to handle expected service failures without relying on throw/catch patterns, matching file-plan L62.

- Decision: Convert Workspace deletion from hard delete to soft delete using a `status` field.
  Rationale: Prevents cascade-delete issues and allows for a future background saga to asynchronously prune documents and chats (ADR-013).

- Decision: Externalize JWT TTL configuration into `application.yml` via `JwtProperties`.
  Rationale: Avoids hardcoded expiration times in code, enabling easier environment-specific adjustments and token lifecycle management.

## 2026-07-18 - Cloud Database Synchronization via Supabase

- Decision: Migrate local PostgreSQL development database to Supabase Cloud using Supavisor Connection Pooler (Port 6543).
  Rationale: Ensures all team members share a unified database schema and data state without requiring local Docker PostgreSQL setup, accelerating team collaboration.

- Decision: Enforce `prepareThreshold=0` on PostgreSQL JDBC URL for Core API connections.
  Rationale: Required to prevent `prepared statement already exists` exceptions when routing Java JDBC traffic through Supabase's Transaction-mode pooler.

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
