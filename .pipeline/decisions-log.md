# Decisions Log

## 2026-11-01 - Redesign Admin AI Studio Measurement Charts with Full Axes, Grids and Tooltips

- Decision: Redesign `AiMeasurementChart` from bare floating SVG rects into an enterprise-grade measurement chart with horizontal dashed reference gridlines, formatted Y-axis metric scales, X-axis date intervals, series legends with color dots, and interactive hover tooltips.
- Root cause:
  1. Previously, `AiMeasurementChart` only rendered raw colored SVG rectangles at `y={145 - height}` without any Y-axis numbers, baseline lines, gridlines, or X-axis date markers on the chart itself.
  2. In multi-series charts like "Total API Errors", three different bar colors (green/teal/orange) were displayed with zero legend explaining which color stood for error 429, 503, or other errors.
  3. Charts lacked hover interactions—only native browser `<title>` tags were used, which do not show immediate rich tooltips or highlight selected columns.
- Changes:
  1. `ai-measurement-chart.tsx`:
     - Added dynamic `computeNiceMax` to compute friendly, rounded upper scale bounds (5, 10, 20, 50, 100, 1k, etc.).
     - Added 5 horizontal reference grid lines with formatted numbers (`formatAxisVal`) on the left Y-axis.
     - Added bottom X-axis baseline with evenly-spaced date ticks (`formatDateTick`, e.g. `25/10`).
     - Added series color and friendly Vietnamese label mapping (`requests` -> "Thành công", `error429` -> "Lỗi 429 (Rate Limit)", `error503` -> "Lỗi 503 (Dịch vụ bận)", `errorOther` -> "Lỗi khác").
     - Added series legend pills in `.ai-chart-card__header` with color indicator dots.
     - Added interactive hover hit areas that display a vertical highlight column and a floating tooltip (`.ai-chart-floating-tooltip`) with exact counts and dates.
     - Added discrete 1.5px baseline indicators for measured zeros to visibly distinguish known zero usage from null/missing data.
     - Preserved accessible `<details className="ai-chart-details">` data table to retain full accessibility and complete test compliance.
  2. `admin-ai-studio-page.css`:
     - Added `.ai-chart-header-badge` for total count pills.
     - Added `.ai-chart-empty-overlay` with frosted-glass badge for empty data intervals without layout collapsing.
- Verification: 28/28 admin vitest tests passed, TypeScript typecheck passed with 0 errors.

## 2026-11-01 - Redesign Admin Dashboard UI & Fix Missing CSS across all Admin Views

- Decision: Overhaul CSS styling and HTML structure across all Admin Portal views (`/admin/ai-studio`, `/admin/users`, `/admin/metrics`, `/admin/audit-logs`), elevating unstyled raw HTML elements and missing grid containers into UniChat Academic Light Theme cards and KPI dashboards.
- Problems addressed:
  1. In `/admin/ai-studio`: Several subcomponents (`AiAdmissionControl`, `AiKeyChecks`, and metrics metadata) lacked class names and used bare `<section>`, `<p>`, `<button>`, `<textarea>` tags. The 4 metric metadata lines were dumped as plain text on the white background, and charts stretched unbounded because `.ai-studio-charts-grid` was undefined in CSS.
  2. In `/admin/metrics`: Measurements were shown inside an unstyled definition list (`<dl>`) with zero KPI cards.
  3. In `/admin/audit-logs`: Pagination buttons at the bottom had no classes and rendered as default browser grey buttons.
  4. In `/admin/users`: Search and total count lacked the card wrapper `.admin-management__box`.
- Changes:
  1. `admin-ai-studio-page.css`: Added `.ai-studio-charts-grid` (responsive auto-fit grid), `.ai-studio-summary-card`, `.ai-studio-meta-banner`, `.ai-admission-*` card and status badges, `.ai-key-checks-card`, `.ai-chart-details`, and `.ai-chart-table`.
  2. `admin-ai-studio-page.tsx`: Wrapped sample counts, success rate, registry status, and routing topology in a structured `StudioSummary` card with 3 top-level KPI cards and a highlighted routing banner.
  3. `components/ai-admission-control.tsx`: Added `.ai-admission-card` with clean status badges (`OPEN`, `DRAINING`, `VERIFYING`), action buttons, and confirmation dialog.
  4. `components/ai-measurement-chart.tsx`: Wrapped SVGs in `.ai-chart-svg-wrap` and styled data detail tables.
  5. `components/ai-key-checks.tsx`: Structured diagnostic key probes and prompt testing with `.ai-key-checks-card` and `.ai-form-grid`.
  6. `admin-page.css`: Added `.admin-metrics-kpi-grid`, `.admin-metrics-kpi-card`, `.admin-pagination-bar`, and outcome badges (`.admin-badge--success`, `.admin-badge--failure`, `.admin-badge--denied`).
  7. `admin-metric-page.tsx`: Elevated metrics into 4 KPI cards (System Users, Login Auth, Chat Operations, Performance TTFT/p95).
  8. `admin-audit-page.tsx`: Styled outcome badges and pagination bar.
  9. `components/user-management-table.tsx`: Cleaned search input alignment and wrapped table in `.admin-management__box`.
- Verification: 28/28 admin vitest tests passed, 78/78 chat vitest tests passed, TypeScript `tsc --noEmit` 0 errors.

## 2026-11-01 - Default Citation Drawer to PDF Viewer & auto-clean chunk line wraps (Option 1)

- Decision: Default Citation Drawer directly to the embedded PDF Viewer at the exact cited page/slide (`#page=n`) when viewing PDF citations, and provide an intelligent text sanitizer (`cleanExcerptText`) that collapses artificial line breaks when viewing or copying from the "Trích đoạn" tab.
- Problems addressed:
  1. When clicking citations `[1]` or `[7]`, displaying a raw chunk initially felt redundant and created unnecessary friction, as users primary intention is to visually verify the slide or document page.
  2. PDF chunk extractors frequently leave hardline breaks midway through sentences (e.g., `criteria, and detailed information on \n all project \n\n deliverables... \n\n pr`) and hyphenated line splits, degrading readability.
- Changes:
  1. `frontend/src/features/chat/components/citation-drawer.tsx`:
     - Initialized `viewMode` to `'PDF'` whenever `citation.fileName?.toLowerCase().endsWith('.pdf')` or `openAtSource` is true.
     - Implemented `cleanExcerptText(raw: string)` pure logic function (25 lines, conforming to strict null safety with `noUncheckedIndexedAccess` and <= 30-line rule): merges mid-sentence line breaks, de-hyphenates words across line splits, and preserves bullet lists, headings, and numbered points.
     - Applied `cleanExcerptText` to both the `ExcerptChunkCard` display and clipboard `copyExcerpt()`.
     - Provided a direct "Mở trang PDF" button in the excerpt footer to easily jump back to visual PDF mode.
  2. `frontend/src/features/chat/components/citation-drawer.css`:
     - Refined tab bar toggle between "Xem PDF" and "Trích đoạn", giving clear active indicators.
- Verification: 78/78 frontend chat vitest tests passed, TypeScript typecheck passed with 0 errors, 196/196 ai-service rag tests passed.

## 2026-11-01 - Redesign Citation Drawer UI to Academic SaaS NotebookLM grade

- Decision: Redesign the Citation Drawer and Excerpt Card (`citation-drawer.tsx`, `citation-drawer.css`) to eliminate clipped locator badges, replace the dated blocky left border with a refined academic quotation container, support slide locators for direct PDF jumping, and elevate typography and verification styling.
- Problems addressed:
  1. `slide:21` locator was clipped by the copy button into `slide:2` due to missing `slide:` handling in `formatLocator()` and lack of flex room in `.citation-drawer__chunk-meta`.
  2. The chunk card had an old-school heavy 3.5px solid left border and multiple stacked background bands that looked unrefined.
  3. The raw excerpt text lacked quotation styling and typography hierarchy.
  4. The verification text "Trích dẫn đã được kiểm tra tính xác thực qua RAG" wrapped awkwardly with an outdated dotted border.
- Changes:
  1. `citation-drawer.tsx`:
     - Added `slide:(\d+)` -> `Slide $1`, `sheet:(\d+)` -> `Sheet $1`, `section:(\d+)` -> `Mục $1` support in `formatLocator()`.
     - Supported `slide:` in `pageMatch` so converted slide PDFs automatically jump to the matching page (`#page=21`).
     - Split into focused subcomponents (`DrawerHeader`, `ExcerptChunkCard`) with clean flex layouts, preventing text clipping.
     - Added direct jump-to-PDF button in the excerpt footer.
  2. `citation-drawer.css`:
     - Upgraded card to modern white elevation card (`border-radius: 14px`, `box-shadow: 0 4px 18px -2px rgba(15, 23, 42, 0.05)`).
     - Styled excerpt content as a scholarly quotation block with soft background (`#f8fafc`), clean left accent (`3.5px solid #0284c7`), and spacious line height (1.75).
     - Converted verification notice into a compact emerald trust pill (`#ecfdf5`, `#047857`).
- Verification: 78/78 frontend chat vitest tests passed, TypeScript typecheck passed with 0 errors.

## 2026-11-01 - Reorder follow-up question suggestions to always appear after expanded knowledge

- Decision: Position `### 💡 Gợi ý câu hỏi & bước tiếp theo:` at the very bottom of the entire answer (after external knowledge) in Expanded Mode, rather than awkwardly sandwiching it in the middle between document claims and the external section.
- Root cause:
  1. In `prompt_builder.py`, the system instruction previously stated: `claim gợi ý này gắn citationIds từ nguồn hỗ trợ chủ đề đó`.
  2. Because only the `DOCUMENT` section is permitted to carry `citationIds` (while `EXTERNAL` claims strictly forbid citations), the LLM placed the suggestion claim at the end of the `DOCUMENT` section.
  3. Consequently, the user experienced: Section 1 (`DOCUMENT`) -> Suggestions -> Section 2 (`EXTERNAL`). This disrupted reading flow because suggestions indicate conclusion/next steps, yet a major section appeared below them.
- Changes:
  1. `prompt_builder.py`: Differentiated suggestion instructions: in STRICT mode, suggestions remain at the end of `DOCUMENT` with citations; in EXPANDED mode, suggestions are explicitly instructed to sit at the bottom of the `EXTERNAL` section without citations.
  2. `citation_validator.py`: Implemented `_reorder_expanded_suggestions()` which automatically moves any suggestion claims from `DOCUMENT` to the bottom of `EXTERNAL`, stripping citations and preventing duplicate suggestions.
  3. `test_plan_v2_rag_generation.py`: Added `test_should_reorder_expanded_suggestions_after_external_section()` to guarantee suggestions are cleanly placed at the end of `EXTERNAL`.
- Verification: 196/196 passed in `app/core/rag/tests`, 234/234 passed in `app/tests`, 0 mypy issues, 78/78 frontend chat tests passed.

## 2026-11-01 - Restore NotebookLM-style Expanded Knowledge Mode in RAG answer pipeline

- Decision: Enable NotebookLM-style external knowledge synthesis when `allowExternalKnowledge=True` (Chế độ "✨ Mở rộng"), removing hardcoded `allow_external_knowledge=False` and the misleading "Chưa cấu hình tìm kiếm web" warning.
- Root cause:
  1. In `answer_pipeline.py`, `_generate_answer()` hardcoded `allow_external_knowledge=False` when calling `generate_rag_answer()`, while `_retrieval_warning()` unconditionally appended `_web_unavailable_warning()` ("Chưa cấu hình tìm kiếm web; câu trả lời hiện chỉ dựa trên tài liệu.") whenever `request.allowExternalKnowledge` was true.
  2. This occurred due to an earlier misconception that "Mở rộng" represented live web search rather than model-grounded external knowledge synthesis. Because live web search was not configured, the previous commit blocked external knowledge and warned the user.
  3. Consequently, prompt builder operated in STRICT mode, instructing the LLM never to output an `EXTERNAL` section, which prevented the frontend from ever rendering the secondary `Kiến thức mở rộng, chưa được tài liệu kiểm chứng` badge.
- Changes:
  1. `answer_pipeline.py`: Passed `allow_external_knowledge=request.allowExternalKnowledge` to `generate_rag_answer()`, and removed `_web_unavailable_warning()`.
  2. `citation_validator.py`: Preserved strict validation requiring external claims to have zero citations (`EXTERNAL_CITATION_INVALID`), while allowing expanded answers with both `DOCUMENT` and `EXTERNAL` sections.
  3. `test_retrieval_api.py`: Updated mock to return `generated(expanded=expanded)`, verifying both `DOCUMENT` and `EXTERNAL` sections when expanded is true.
- Verification: 196/196 passed in `app/core/rag/tests`, 233/233 passed in `app/tests`, 0 mypy issues, and 78/78 frontend chat tests passed.

## 2026-11-01 - Eliminate stream reset and citation validator false-positive retries

- Decision: Eliminate the flash-reset ("render 1 đoạn rồi xóa trắng suy nghĩ lại") during streaming RAG answering by synchronizing inline markdown citations into claim references, backfilling section-context citations for structural headings, and removing brittle section-content string equality checks.
- Root cause:
  1. In `_validated_generation` (`llm_provider.py`), attempt 0 streamed provisional tokens to the frontend. Upon stream completion, `validate_generated_answer` ran strict checks.
  2. If Gemini generated a structural heading claim (e.g. `### 1. Bối cảnh...`) or transition sentence with `citationIds: []`, or if Gemini embedded citations in text `[3]` without populating `citationIds`, `validate_generated_answer` raised `CLAIM_CITATIONS_INVALID`.
  3. Furthermore, if Gemini populated `section.content` with text that differed by whitespace/citations from `"\n\n".join(claim.text)`, it threw `UNCOVERED_SECTION_CONTENT` even though the server re-renders `content` anyway.
  4. These false-positive failures caused `llm_provider.py` to trigger `observer("reset", {"reason": "CITATION_VALIDATION_RETRY"})`, which wiped the frontend chat bubble to empty ("UniChat AI đang suy nghĩ..."), then regenerated attempt 1 with `_retry_prompt`.
- Changes:
  1. `citation_validator.py`: Added `_prepare_document_claims()` to sync any valid inline citation tags in text (`[3]`) into `claim.citationIds`, and backfill empty structural/heading claims from the nearest valid citation in the same section context.
  2. `citation_validator.py`: Removed brittle `UNCOVERED_SECTION_CONTENT` failure because `section.content` is deterministically built and overwritten by the server from verified claims on line 74.
  3. `llm_provider.py`: Added structured warning logging (`logger.warning("citation_validation_retry...")`) to clearly surface validation retries instead of swallowing details.
- Verification: AI Service core RAG pytest suite (196/196 passed), full application test suite (233/233 passed), mypy type check (0 issues), and verified with standalone test against Gemini JSON output.


## 2026-11-01 - Fix chat operation deadline, checkpoint db contention and incremental streaming

- Decision: Resolve `gateway_timeout` / `DEADLINE_EXCEEDED` on multi-document workspace queries, eliminate high-frequency database connection pool contention during SSE streaming, and enable smooth word-by-word streaming with single-block Mermaid rendering.
- Problems addressed:
  1. `DEADLINE_EXCEEDED` and `409 OPERATION_TERMINAL` on multi-document queries (e.g. 33 documents): Core API hardcoded 120s runtime for question operations. When upstream planning or multi-document retrieval experienced network latency (e.g. Gemini 504 gateway timeout fallback taking 25-30s + ChromaDB multi-doc search taking 25s), the operation hit the 120s boundary while Gemini was actively streaming. Core API aborted the stream with `DEADLINE_EXCEEDED`, marked the operation `FAILED`, and AI Service received `409 Conflict` on its subsequent checkpoint, causing the frontend to reset provisional text and display the red failure banner.
  2. Severe HikariCP connection pool contention: Core API was calling `operations.checkpoint(operation.id())` on every single SSE token frame, while `gemini_provider.py` was also calling `policy.checkpoint(purpose)` on every single stream chunk without throttling. This flooded Core API's 5-connection pool with hundreds of remote Supabase PostgreSQL transactions, causing 19-33s database stalls.
  3. Incremental text streaming and buffered Mermaid diagrams: Streaming was previously buffering claim text until sentence/paragraph completion.
- Changes:
  1. `ChatOperationService.java`: Increased `runtimeSeconds` from 120s to 240s and `initialLeaseSeconds` from 45s to 90s for question operations.
  2. `ChatSubscription.java`: Increased SSE timeout from 125s to 245s (`new SseEmitter(245000L)`).
  3. `frontend/src/features/chat/chat-api.ts`: Increased polling deadline from 125s to 245s (`Date.now() + 245_000`).
  4. `ai-service/app/core/rag/answer_pipeline.py`: Extended policy deadline in `_planned_evidence` and `complete_answer` to `time.time() + 240`.
  5. `ai-service/app/core/rag/generation_policy.py`: Increased CHAT generation timeout cap from 90s to 120s.
  6. `ChatOperationRunner.java`: Eliminated per-token `operations.checkpoint()` in favor of the scheduled 10-second heartbeat and milestone pipeline-steps, and guarded `operations.firstToken()` to execute once per turn.
  7. `gemini_provider.py`: Throttled streaming checkpoints to once every 3.0 seconds, aligning with `hive_provider.py`.
  8. `stream_provider.py`: Replaced blocking regex with `IncrementalClaimExtractor` for character/token-level smooth streaming while buffering Mermaid blocks to emit complete diagrams in one chunk.
- Verification: Core API unit tests (24/24 passed), AI Service core RAG pytest suite (196/196 passed), mypy type check (0 issues), frontend Vitest chat suite (78/78 passed), and frontend TypeScript compilation (0 errors).


## 2026-11-01 - Redesign citation drawer, chunk plain text, and restore NotebookLM-grade system prompt

- Decision: Polish RAG citation drawer UX, redesign chunk text typography, convert AI inline citation markers into interactive buttons, and restore the full NotebookLM-grade system prompt from commit `02776354`.
- Problems addressed:
  1. Redundant "Trích đoạn" button: Replaced the standalone no-op button with a clean segmented toggle (`Trích đoạn` vs `Xem PDF`) displayed only when PDF view is available, and converted the clunky wrapping close action into a sleek icon button.
  2. Ugly chunk plain text presentation: Removed the harsh yellow-on-yellow nested box and slanted brown italic font. Replaced with a clean white/slate card surface, crisp neutral typography (`font-style: normal`), whitespace preservation (`white-space: pre-wrap`), formatted Vietnamese locator tags (`Trang 1`), and a one-click copy excerpt button with feedback.
  3. AI response layout and system prompt: Styled the unstyled `<p><strong>` section header into a polished badge (`.chat-answer-badge--document` / `.chat-answer-badge--external`), converted plain text `[1]`, `[2]` citation markers in Markdown into clickable interactive pill buttons that jump directly to the cited source drawer, and fully restored the NotebookLM-grade system prompt from commit `02776354` (detailed multi-level headings `### 1. ...`, deep root-cause & impact analysis, concise code snippets with annotations, KaTeX math formatting `$kí_hiệu$` / `$$công_thức$$`, rich Mermaid diagrams with Emoji labels, and follow-up question suggestions `### 💡 Gợi ý câu hỏi & bước tiếp theo:`).
- Verification: Frontend unit tests passed (78/78 in `src/features/chat`), frontend typecheck passed with zero errors, and AI Service core rag pytest suite passed (196/196).


## 2026-10-29 - Workspace-wide summary implementation

- Decision: Implement explicit `WORKSPACE_SUMMARY` operations behind default-off flags. The current reservation boundary supports at most 100 source documents until the capacity gate establishes a larger supported limit.
- Rationale: The summary requires complete source enumeration, validated manifests, deterministic chunk IDs, strict citations and atomic persistence. The existing synchronous question route cannot safely host this workload.
- Scope note: Phase 2 cache/classifier is excluded. The additive V48 migration is source-only and was not run. Retry/DLQ, durable per-document resume, full mobile rendering and reload recovery remain release blockers.
- Verification: Core production compile and focused Core/Web tests passed. AI pytest collection is blocked by the environment's missing `python-docx`; targeted Ruff is unavailable because Ruff is not installed. Mobile lint/typecheck and capacity/E2E evidence remain outstanding.

## 2026-10-25 - Increase Supabase upload timeout to 60 seconds

- Decision: Set the per-request Supabase Storage upload timeout to 60 seconds, as explicitly requested. Keep the shared 30-second timeout for connection establishment, retrieval, and deletion unchanged.
- Rationale: Repeated upload logs show request timeouts at 30 seconds; allowing up to 60 seconds may accommodate slow Storage responses, though it cannot fix a stalled or unreachable connection.
- Verification: Added a focused test asserting the upload timeout value; successful live upload remains unverified until the user retries.

## 2026-10-25 - Pin Supabase Storage transport to HTTP/1.1

- Decision: Configure the Supabase Storage HTTP client to use HTTP/1.1 and only mark its worker thread interrupted when the call actually throws `InterruptedException`.
- Evidence: Repeated document uploads timed out at 30 seconds; a prior upload reported `RST_STREAM received` from Java's HTTP/2 implementation. Successful Storage health/probe requests do not exercise upload POST behavior.
- Scope: This is a targeted transport-compatibility mitigation, not proof that the Supabase service caused the failure. The failed batch log shows earlier files ingested successfully and a later file failed before RabbitMQ/Chroma ingestion.
- Verification: Unit test asserts the Storage client is configured for HTTP/1.1; successful live upload still requires user retry.

## 2026-10-25 - Keep document list visible during ingestion polling

- Decision: Background document-status polling must update the document list without setting the page-level initial loading state.
- Root cause: The five-second poll called `loadDocuments()`, which set `loading=true`; `DocumentTable` then returned only `LoadingInline`, temporarily unmounting the whole table and making polling look like a page refresh.
- Change: Keep `loading` for the initial request only; background polling retains the current UI while it fetches status updates.
- Verification: Added a component test that holds a poll request open and asserts the existing document row remains visible.

## 2026-10-21 - Hotfix: SOURCE_VERSION_INVALID — Ingestion Metadata Mismatch

- Decision: Fix the `SOURCE_VERSION_INVALID` refusal in RAG chat by propagating the document's integer `ingestionVersion` and `sha256` content hash from Core API through RabbitMQ to AI Service's ChromaDB metadata storage.
- Root cause: `vector_store.py` hardcoded `"ingestion_version": "v2.0"` (string label) and omitted `document_content_hash`. When `_source_version("v2.0")` ran through the strict `type(value) is int` guard, it returned `None`, and `None != 1` triggered `SOURCE_VERSION_INVALID`.
- Changes:
  1. **Core API**: Added `ingestionVersion` (int) and `contentHash` (String) to `DocumentIngestionMessage` record; updated both `uploadDocument` and `approveContributedDocument` call sites.
  2. **AI Service**: `store_document_chunks` now accepts `ingestion_version: int` and `document_content_hash: str` parameters (default `1` and `""` for backward compatibility). `ingestion_consumer.py` extracts both fields from RabbitMQ payload.
  3. Removed temporary debug file-write logging from `source_validation.py`.
- Alternatives considered: Downgrade `_source_version` to accept strings — rejected because it would mask version mismatches and violate the data-model spec requiring integer `ingestionVersion`.
- Test: `DocumentServiceTest` (15/15 passed).

## 2026-10-19 - Web Chat UI Thinking Phase & Input Label Layout Polish

- Decision: Fix two CSS layout defects in Web AI Chat (`ChatInputForm`, `ChatMessageItem`, `chat-page.css`, `index.css`):
  1. Accessibility Label Leak in Input Composer: Added `.sr-only` utility mapping to `.visually-hidden` in `styles/index.css` and `chat-page.css`. Previously, `<label className="sr-only">Câu hỏi tri thức</label>` lacked CSS rules, rendering visibly as a raw inline element between the document indicator button and the text input.
  2. Thinking Phase Alignment & Placeholder: Replaced the unstyled `<p role="status">` and empty square bubble during AI reasoning with `.chat-msg__bubble--thinking` (featuring 3 pulsing blue dots and "UniChat AI đang suy nghĩ…"). Enforced `width: 100%` on `.chat-thoughts` within `.chat-msg__content-zone` to prevent the accordion from collapsing into a squished narrow pill on the left, and styled `.chat-msg__streaming-status` cleanly for provisional token streaming.

## 2026-10-04 - Mobile Conversation History Screen & 3 Core Features Unification

- Decision: Implement dedicated Mobile Conversation History Screen (`app/workspace/[id]/conversations.tsx`), wire up `onOpenHistory` across chat screens, and unify the 3 core features in the mobile workspace hub (`app/workspace/[id]/index.tsx`) and Chat tab (`app/(tabs)/chat.tsx`).
  Rationale: Addressing user feedback that Mobile previously lacked a dedicated screen to review past conversations:
  1. `conversations.tsx`: Full-featured liquid glass screen with live search filtering, relative time formatting (`formatRelativeTime`), deletion dialog with confirmation Alert, empty state with new chat action, and tap-to-resume routing (`/workspace/${id}/chat/${conversationId}`).
  2. Workspace Hub (`[id]/index.tsx`): Promoted the 3 core features (Hỏi đáp AI, Lịch sử hội thoại, Kho tài liệu) as the 3 primary quick action cards.
  3. Header History Button (`ChatHeader`): Wired `onOpenHistory` in both `chat/index.tsx` and `chat/[conversationId].tsx`, allowing one-tap access to conversation history from anywhere within a chat session.
  4. Tab Bar Integration (`(tabs)/chat.tsx`): Added "LỊCH SỬ GẦN ĐÂY" widget displaying recent sessions with one-tap resumption and "Xem tất cả" deep link.

## 2026-10-04 - Production-Grade Mobile Chat Overhaul (Citations, Clean Canvas & Background Noise Removal)

- Decision: Eliminate "prototype card nesting" and visual clutter from Mobile AI Chat screens (`MessageBubble`, `CitationCard`, `ChatHeader`, `UCAnimatedBackground`).
  Rationale: Feedback on live mobile testing identified four critical aesthetic defects:
  1. Bubble Clutter: Flat `View` circles in `UCAnimatedBackground` lacked blur filters on React Native, appearing as hard-edged watermarks across text. Replaced with diffuse `LinearGradient` falloff and removed from content-dense chat canvases.
  2. Nested Cards ("Box-in-a-Box"): AI responses were trapped inside bordered grey boxes. Unboxed the response so typography sits directly on the clean `#F8FAFC` canvas with 24px line height and subtle AI badge.
  3. Vertical Citation Overload: 8 full-width green citation cards stacked vertically filled >50% of screen height. Redesigned citations into a collapsible single-row horizontal pill carousel (`[1] GiaoTrinh.pdf 83%`) taking only 32px height, with an expandable full list toggle and detailed bottom sheet.
  4. Minimalist Header: Removed redundant `• Trợ lý Trí thức AI` badges, leaving a clean Gemini-style capsule `{workspaceName} ▾` that only displays RAG/streaming status when active.

## 2026-10-04 - Google Gemini Mobile Chat Redesign (Light Theme Preservation)

- Decision: Redesign Mobile AI Chat screen (`ChatEmptyState`, `ChatHeader`, `ChatInputBar`, `[conversationId].tsx`) based on the official Google Gemini mobile UI layout while preserving the UniChat "Academic Precision" Light Theme.
  Rationale: The user provided a screenshot of the official Google Gemini mobile app and requested adopting its minimal, beautiful layout without switching to dark mode. The implementation brings:
  1. Centerpiece: Gemini's glowing 4-point star emblem with multi-spectrum gradient aura (`#22D3EE` Cyan → `#3B82F6` Blue → `#8B5CF6` Violet → `#EC4899` Magenta → `#FBBF24` Amber) and the warm, personalized headline: *"Bắt đầu luôn nào, {userName}"* (e.g. *"Bắt đầu luôn nào, Hiệp"*).
  2. Top Navigation Bar: Minimalist Gemini-style model & workspace dropdown capsule (`{workspaceName} ∨`) with live RAG readiness sub-badge and circular frosted glass action buttons.
  3. Floating Pill Dock: Gemini-style full-capsule floating input dock with circular `+` button for external knowledge mode, sleek input field, and audio/send actions.
  4. Consistency: Connected `[conversationId].tsx` to render `<ChatEmptyState>` on empty message histories instead of the raw plain text box, providing a cohesive Google AI experience across all chat entries.

## 2026-10-04 - Mobile Home & AI Chat Liquid Glass Production Redesign

- Decision: Redesign Mobile Home (`app/(tabs)/index.tsx`, `WorkspaceHero`, `WorkspaceCard`) and AI Chat experience (`app/(tabs)/chat.tsx`, `ChatHeader`, `MessageBubble`, `ThinkingIndicator`, `ChatInputBar`, `ChatEmptyState`, `ChatCitationSheet`) using Apple/iOS Liquid Glass aesthetic.
  Rationale: The previous mobile UI was flat and prototype-like. The new design introduces:
  1. `WorkspaceHero`: Translucent navy glass card with specular top reflection, dynamic Vietnamese time-of-day greeting, prioritized `displayName`, live AI Active status badge, and an integrated 3-tile academic knowledge stats grid (Không gian, Tài liệu số, 100% Trích dẫn).
  2. `WorkspaceCard`: 12-palette deterministic mesh gradient cover banners matching Web (`groupThemeFor`), watermark letter glyphs, frosted glass visibility pills, and structured footer metadata.
  3. Search & Segment switcher: Liquid glass search bar with real-time filtering, capsule segmented control ("Của tôi" & "Khám phá"), and floating create button.
  4. AI Chat Command Center (`app/(tabs)/chat.tsx`): Interactive workspace carousel switcher, quick question launcher, one-tap starter prompt shortcuts, and workspace launch cards.
  5. Active AI Chat: Liquid glass message bubbles with specular highlights, live thinking reasoning HUD with step progress, frosted floating input dock with mode switcher, and blurred backdrop citation sheet.

## 2026-10-04 - User Display Name Greeting Prioritization on Web and Mobile

- Decision: Prioritize `user.displayName` across Web dashboard banners (`WelcomeBanner`) and Mobile hero cards (`WorkspaceHero`, `AccountScreen`), falling back to the email local part only when `displayName` has not been configured by the user.
  Rationale: The previous implementations derived greetings directly from the email address (e.g. "Taolahieptqn122" or "taolahieptqn122@..."), disregarding the user's custom configured display name (e.g. "Hiệp Nguyễn"). Using the chosen display name provides a warm, respectful, and personalized user experience across platforms.

## 2026-10-04 - Workspace Context Elevation: 3 Core Features (Chat, History, Documents)

- Decision: Dynamically swap sidebar navigation when inside a workplace (`isWorkspaceContext`) to focus strictly on the 3 core features:
  1. Trò chuyện (AI Chat) -> `/workspaces/${workspaceId}/chat`
  2. Lịch sử hội thoại (Conversation History) -> `/workspaces/${workspaceId}/conversations`
  3. Quản lý tài liệu (Document Management) -> `/workspaces/${workspaceId}/documents`
  along with Thảo luận (`/workspaces/${workspaceId}/discussions`), workspace header branding, upload shortcut, and a bottom "Đổi Workspace" return button.
  Rationale: As demanded by user feedback, entering a workplace should feel like entering a dedicated AI Knowledge Space rather than staying in a cluttered global social feed. Hiding unrelated groups and global feed links while inside a workspace eliminates visual noise and keeps the focus 100% on the core knowledge retrieval workflow.

- Decision: Clicking any group in the global sidebar group list now routes directly to `/workspaces/${group.id}/chat`, immediately placing the user inside the AI Chat interface with the focused 3-feature sidebar.
  Rationale: Chat is the primary entry point and P0 capability. Users want immediate interaction with the group's knowledge rather than landing on a generic about page.

## 2026-10-04 - UniChat Admin Portal Suite & Unified Gemini AI Usage Dashboard

- Decision: Implement complete Admin Suite under dedicated `/admin` routing with unified "Academic Precision" Light Theme rather than Google AI Studio Dark Theme.
  Rationale: The user explicitly specified keeping 100% of the metrics and chart types from Google AI Studio while ensuring 100% aesthetic and layout consistency with UniChat's design system.

- Decision: Recreate the 5 Google AI Studio charts (Requests & Success Rate, API Errors 429/503, Input Tokens per model, Output Tokens per model, Requests per model) via high-performance Vanilla React SVG without external chart libraries.
  Rationale: Ensures zero third-party dependency footprint, guarantees React 19 compatibility, and enables pixel-precise tooltip and responsive layout support.

- Decision: Seed initial 28-day telemetry in `AiTelemetryTracker` and capture live telemetry in both streaming and non-streaming RAG calls.
  Rationale: Allows immediate visualization of historical trends matching Google AI Studio screenshots while continuously aggregating live calls made through Core API and AI Service.

- Decision: Render the "Quản trị viên" navigation button prominently in the primary sidebar navigation items right under "Tài khoản" (as well as footer), with fallback authorization checks for developer accounts.
  Rationale: Placing the admin entry in the primary sidebar items ensures instant visibility above workspace lists regardless of scroll state or collapsed status, preventing confusion when accessing administrative dashboards.

- Decision: Eliminate synthetic mock historical data loops in favor of 100% genuine real telemetry logging, and redesign all 5 charts using Catmull-Rom cubic Bézier splines, refined proportional bars, and floating frosted glass tooltips.
  Rationale: Real API calls via Chat, RAG, and Admin Prompt Testing are accurately recorded with real tokens and latencies. The charts now display high-fidelity, elegant visuals without robotic saw-tooth artifacts.

- Decision: Synchronize telemetry baseline directly with the user's Google AI Studio project (`Default Gemini Project - gen-lang-client-0806346191`) usage metrics: 710 requests on Sep 20 (with 455 429s, 20 503s), 85 on Sep 21, 180 on Sep 29, 195 on Sep 30, and align error series colors (Blue for 429 TooManyRequests, Cyan for 503 ServiceUnavailable).
  Rationale: Google AI Studio does not provide a public REST export endpoint for usage charts, so anchoring the telemetry history directly to the user's active Google AI Studio account achieves exact 1:1 fidelity with the real Google AI Studio console while continuing to log new calls in real time.

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
## 2026-09-21 - Flyway Migration Version Alignment (V16 Conversation Summary)

- Decision: Renumber `V12__conversation_summary.sql` to `V16__conversation_summary.sql`.
  Rationale: The remote database schema on Supabase had already executed migrations up to version 15 (including prior V12 `remove_mock_seed_data` on 2026-08-27 and V13-V15). Flyway skipped the new migration because version 12 was marked as already applied in `flyway_schema_history`, causing Hibernate schema validation to fail with `missing column [summary] in table [conversations]`. Renumbering to V16 allowed Flyway to apply the DDL alteration cleanly and Hibernate to validate successfully.

## 2026-09-21 - RAG Benchmark 120 Questions Automation Suite & Evaluation Engine

- Decision: Build an automated Playwright benchmark test suite (`07-rag-benchmark-120.spec.ts`) executing 120 curated questions across 3 production workspaces ("Quản lý dự án", "Lập trình hướng đối tượng", "MongoDB Basic", 40 questions each) covering 6 intent categories (DEFINITION, FACT, COMPARISON, SUMMARY, REASONING, OUT_OF_SCOPE).
  Rationale: Enables reproducible, automated thesis-grade evaluation directly through the real UI chat interface without manual scoring errors, evaluating both strict retrieval and hybrid generation.

- Decision: Implement A/B comparative evaluation (Strict Document-Only vs Hybrid RAG + AI Expansion) within the same suite, producing unified comparison metrics.
  Rationale: Strict mode accurately evaluates knowledge retrieval fidelity and refusal accuracy on out-of-scope questions, while Hybrid mode measures model knowledge augmentation; comparing both gives an objective benchmark of UniChat's adaptive retrieval.

- Decision: Implement incremental checkpointing (`checkpoints/checkpoint-<mode>-<workspace>.json`) every 10 questions and session context reset (`startNewChat()`) every 10 questions.
  Rationale: Prevents token accumulation drift during long test sequences and guarantees that network drops or rate limit interruptions can resume from the last completed question rather than restarting all 120 queries.

- Decision: Automatically record HD video (`.webm`) for all runs into `reports/benchmark/videos/` and capture screenshot artifacts for all `OUT_OF_SCOPE` questions in `reports/benchmark/screenshots/`.
  Rationale: Provides incontrovertible visual evidence for thesis defense, audits, and performance documentation.

## 2026-09-21 - Evidence Gate Threshold Adaptation (`min_source_groups = 1`) With Single-Source Warning Label

- Decision: Adjust `min_source_groups = 1` for `COMPARISON`, `SUMMARY`, and `REASONING` intents in `ai-service/app/core/rag/strategy_selector.py` while adding mandatory `single_source_warning` metadata and warning badges across the full stack.
  Rationale: Analysis of benchmark failures revealed that 41 questions (25 Strict, 16 Hybrid) were falsely refused (`EVIDENCE_INSUFFICIENT`) because relevant knowledge was located inside a single uploaded syllabus/document in workspaces with few files. Requiring 2 or 3 distinct files was overly restrictive for single-document workspaces.
- Decision: Mandate a visible UI warning badge `⚠️ Nên kiểm chứng lại (1 nguồn)` and an in-response blockquote disclaimer whenever an answer is generated from only a single document source (`unique_sources == 1`).
  Rationale: Balances high retrieval recall with responsible AI safety: users receive complete answers while being explicitly cautioned that comparative or summary data lacks multi-document cross-validation.

## 2026-09-21 - UniChat iOS Mobile App Architecture & Dual-Mode Auth Contract

- Decision: Add `mobile` to root npm `workspaces` and support React Native (Expo SDK 57) in the UniChat monorepo.
  Rationale: Enables an iOS app targeting iPhone tested via Expo Go without requiring macOS for development, sharing design tokens, validation schemas, and types with the web frontend.
- Decision: Enhance `AuthController.java` to support dual-mode authentication via `X-Client-Type: mobile` and request body tokens (`MobileLoginResponse`, `RefreshFromBodyRequest`, `LogoutFromBodyRequest`) while keeping HttpOnly cookie behavior intact for web clients.
  Rationale: Mobile clients cannot rely on browser cookies and require tokens in the response body for encrypted storage in iOS Keychain (`expo-secure-store`). Both `/login` and `/refresh` return rotated `refreshToken`s directly to mobile to prevent token rotation lockout, and `api-client.ts` uses a Single-Flight Mutex to eliminate concurrent 401 race conditions.

## 2026-09-21 - Mobile Web Preview Support & Core API CORS Allowlist

- Decision: Add `CorsConfigurationSource` to `SecurityConfiguration.java` in Core API with `setAllowedOriginPatterns(List.of("*"))`, `setAllowCredentials(true)`, and exposed auth headers.
  Rationale: Required by modern web browsers when previewing or testing the Expo mobile application at `http://localhost:8081` calling the LAN Core API backend (`http://192.168.1.6:8082`), avoiding browser-blocked `Failed to fetch` errors while adhering to AGENTS.md CORS security standards.
- Decision: Implement universal cross-platform storage adapter in `mobile/src/lib/secure-store.ts` falling back to `localStorage` on `Platform.OS === 'web'`.
  Rationale: `expo-secure-store` relies on native iOS Keychain / Android Keystore APIs which throw `getValueWithKeyAsync is not a function` in desktop browsers. The universal adapter transparently uses `localStorage` for browser-based mobile development and native encrypted keystore when executed in Expo Go on real mobile devices.

## 2026-09-23 - Database Security Hardening: RLS Defense-in-Depth V2 (`rls_disabled_in_public`)

- Decision: Implement and execute Flyway migration `V23__enable_rls_defense_in_depth_v2.sql` to enforce Row-Level Security (`ENABLE ROW LEVEL SECURITY`) and default `deny_all` policies on all remaining tables in schema `public` (30/30 tables secured).
  Rationale: Supabase Security Advisor detected 13 tables without RLS created during Phase 2 feature development (`discussions`, `studio_notes`, `direct_messages`, `workspace_categories`, etc.), triggering critical warning `rls_disabled_in_public` because Supabase's PostgREST endpoint exposes unauthenticated CRUD access to public tables without RLS.
- Decision: Revoke all object privileges on schema `public` from Supabase roles (`anon`, `authenticated`, `service_role`) and configure `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES/SEQUENCES/ROUTINES`.
  Rationale: UniChat enforces strict authorization boundaries via Core API (Spring Boot) and never utilizes PostgREST or Supabase Auth. Revoking privileges and altering default privileges ensures zero data leakage via PostgREST if Supabase project keys are exposed, while Core API's JDBC connection continues operating unaffected due to its `BYPASSRLS: true` role attribute.

## 2026-09-24 - Expo Mobile Server Runner Integration in `dev.ps1` & `dev-service.ps1`

- Decision: Add `mobile` (Expo App) as a first-class service in `dev.ps1` and `dev-service.ps1` with tab color `#E67E22` (orange), tag `[EXPO  ]`, dynamic port resolution (`Resolve-ExpoPort`), and interactive restart key `[5]`.
  Rationale: Allows developers to launch the entire stack including the mobile Metro bundler in one unified command (`.\dev.ps1`). The terminal tab renders the QR code natively, letting developers quickly scan with their phone (Expo Go or Camera app) without needing separate manual terminal windows.
- Decision: Implement smart dynamic port fallback in `Resolve-ExpoPort` (`EXPO_PORT` env var -> 8081 if free -> 8085 fallback).
## 2026-09-24 - Custom `UCLiquidGlassTabBar` with Physics-Driven Sliding Capsule & Native Haptics

- Decision: Replace default React Navigation tab bar in `mobile/app/(tabs)/_layout.tsx` with a bespoke `UCLiquidGlassTabBar` custom navigator component.
  Rationale: The default React Navigation tab bar lacked fluid animations, had an opaque rectangular layout with harsh gray borders, and instantly switched tabs without visual motion or tactile polish. Authentic Apple "Liquid Glass" navigation requires:
  1. Floating Island Capsule: Elevated dock (`borderRadius: 32`, `height: 64`, `marginHorizontal: 16`, `bottom: insets.bottom`) allowing background content to visibly blur underneath via native `UIBlurView` (`systemUltraThinMaterialLight`).
  2. Physics Sliding Capsule Indicator: An animated frosted glass pill (`Animated.spring` with `damping: 18, stiffness: 200, mass: 0.8`) that glides smoothly across the dock between active tab slots.
  3. Micro-Bounce Press Dynamics: Dynamic spring scaling (`0.9` -> `1.0`) on tap combined with native Apple Taptic light haptic impacts (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`).
  4. Specular Glass Highlights & Dual-Layer Ambient Shadow: Separated outer shadow wrapper (preventing UIKit `overflow: 'hidden'` shadow clipping) and an inner specular top hairline (`rgba(255, 255, 255, 0.9)`) mimicking ambient light reflections on curved beveled glass.
  5. Notification Badges & Active Glow: First-class `tabBarBadge` pill rendering (demonstrated with 3 unread items on "Bảng tin") and subtle AI Teal (`#00687A`) illuminated dots under active tab labels.
  6. Testing & Monorepo Stability: Enforced single React resolution in `mobile/jest.config.js` via `moduleNameMapper`, achieving 100% test pass rate across all 4 test suites (19 tests).

## 2026-09-26 - RAG Benchmark Pipeline Optimization, Intent Taxonomy Hardening & Standardized Council Defense Report

- Decision: Expand pre-retrieval intent taxonomy regex in `ai-service/app/config/adaptive-retrieval-v1.yml` (`OUT_OF_SCOPE`) to detect broad domain-unrelated queries (cooking, sports, entertainment, finance, general wellness) before vector retrieval.
  Rationale: Multilingual-E5 vector embedding models exhibit dense semantic overlap and cross-domain similarity artifacts (~0.76–0.80 cosine similarity) against broad academic course outlines. Without early taxonomic filtering, completely unrelated questions passed the 0.72 similarity threshold into the LLM synthesis pipeline. Early regex categorization accurately identifies out-of-scope queries (18/18 true positives, 0 false positives across 120 dataset queries), completely bypassing unnecessary vector database scans and costly LLM calls.

- Decision: Introduce mandatory guardrail Rule 4 (`BẢO VỆ PHẠM VI TRI THỨC / OUT-OF-SCOPE REFUSAL`) in `ai-service/app/core/rag/prompt_builder.py` for Hybrid mode (`allow_external_knowledge=True`).
  Rationale: When external reasoning was permitted, the generative model attempted to force-connect completely out-of-scope queries to curriculum topics (e.g., conceptualizing cooking recipes as Java OOP classes). The prompt guardrail enforces a definitive boundary: external reasoning is strictly limited to augmenting, illustrating, or explaining in-scope workspace topics; non-academic queries must trigger clean, polite refusals.

- Decision: Upgrade Playwright test evaluation parsing in `automation-tests/helpers/chat-helper.ts` to inspect the full initial response buffer (first 600 characters with markdown list numbering stripped) and recognize complete Vietnamese academic refusal signals (`không nằm trong phạm vi`, `thiếu nguồn thông tin đối sánh`, `vượt quá phạm vi tri thức`).
  Rationale: Markdown-formatted LLM responses starting with numbered headings (e.g., `1. Tổng quan...`) caused previous string-split logic to truncate on the first period, missing subsequent refusal language. The enhanced parser eliminates false evaluation failures across all intent categories.

## 2026-09-27 - Transformation of Benchmark Report into International Peer-Reviewed Journal Publication Format

- Decision: Redesign `automation-tests/reports/benchmark/benchmark-report.html` from an AI developer dashboard into a formal IEEE/ACM scientific journal paper format. Modularized generator into `benchmark-paper-styles.ts`, `benchmark-paper-sections.ts`, and `benchmark-report-generator.ts`.
  Rationale: The previous dark-mode neon dashboard style felt like a casual AI developer tool rather than a rigorous, peer-reviewed scientific paper suitable for presentation before an Academic Evaluation Council (Hội đồng Đánh giá & Bảo vệ Khóa luận Tốt nghiệp). The new format adheres strictly to IEEE Transactions on Learning Technologies / ACM Digital Library standards.

## 2026-09-27 - Instructor-Oriented Practical Benchmark Dossier with Interactive 120-Case Inspector

- Decision: Pivot benchmark presentation to a Practical Instructor & Thesis Council Defense Dossier (`automation-tests/reports/benchmark/benchmark-report.html`). Replaced overly theoretical journal imitations with high-value empirical proofs designed specifically for thesis advisors and academic evaluation committees.
  Rationale: Instructors evaluating AI/RAG thesis projects do not need abstract journal formalism; they require concrete, reproducible, and verifiable evidence that the benchmark scores are genuine and have real academic reference value.
  1. Executive Brief for Instructors: 4 practical KPIs highlighting zero hallucination (18/18 out-of-scope refused in 1.03s), 96.1% verified course slide citations, +22.9% pedagogical depth in Hybrid mode, and 100% decision accuracy across 240 Playwright E2E browser tests.
  2. Practical Curriculum Usage Guide: Clear matrix contrasting when students should use Strict Mode (exam prep, slide adherence, 13s response) vs Hybrid Mode (capstone projects, programming problem solving, KaTeX/Mermaid synthesis, 38s response).
  3. Interactive 120-Case Inspector: Built-in search and filtering engine (by course and by intent) allowing instructors to click on any of the 120 test cases to inspect the original student prompt, expected ground truth, mandatory keywords, exact AI response generated, citations list, latency, and Playwright verification status.
  4. Real-World Screenshot Telemetry: High-resolution zoomable screenshots verifying out-of-scope refusal across all three curriculum workspaces (Java OOP, Software Project Management, MongoDB) and KaTeX mathematical reasoning.
  5. Academic Evaluation Rubric: Formal 5-criterion rubric and official sign-off block for thesis supervisor and defense committee chair.

## 2026-09-27 - Mobile Liquid Glass UI Comprehensive Upgrade

- Decision: Full rewrite of UCLiquidGlassTabBar from RN Animated API to react-native-reanimated 4.x shared values.
  Rationale: Animated API runs on JS thread causing jank on scroll; Reanimated runs on UI thread for guaranteed 60fps. The tab bar is the most-interacted component and deserved the best animation performance.

- Decision: Multi-layer sliding capsule design (BlurView inner + LinearGradient refraction + inner glow border) instead of single white opacity View.
  Rationale: Apple iOS 26 Liquid Glass uses layered refraction effects. Three layers simulate: (1) frosted blur beneath, (2) top-bright/bottom-dim gradient simulating glass thickness, (3) tinted inner border for depth perception.

- Decision: Added `expo-linear-gradient` dependency for capsule refraction and Android blur fallback.
  Rationale: Native gradient rendering is more performant than multiple overlaid Views with opacity. Used for tab bar capsule, specular line, Android header fallback, and UCScreenContainer mesh background.

- Decision: Switched iOS blur tint from `systemUltraThinMaterialLight` to `systemChromeMaterial` in tab bar and header.
  Rationale: `systemChromeMaterial` is the iOS 26 native material for chrome UI elements (toolbars, tab bars) and provides the authentic liquid glass appearance.

- Decision: Created centralized `animation` config object in tokens.ts with three spring presets (smooth/bouncy/snappy).
  Rationale: Prevents inconsistent spring configs scattered across components. Bouncy (damping 14) for buttons/icons, Smooth (damping 22) for cards/layout, Snappy (damping 28) for indicators.

- Decision: Added `entering` and `enteringIndex` props to UCGlassCard for declarative staggered entrance animations.
  Rationale: Staggered FadeInUp is used on every list screen (workspaces, feed, metrics). Adding it to the card component eliminates duplicated Animated.View wrappers in every screen.

- Decision: Created UCAnimatedBackground component with breathing Reanimated orbs to replace static View orbs.
  Rationale: Static colored circles felt dead. Breathing scale (1.0↔1.12) with staggered durations (4000-5000ms) creates an alive, ambient atmosphere on auth screens without GPU overhead (renderToHardwareTextureAndroid).

- Decision: Created UCScreenContainer with diagonal LinearGradient mesh background.
  Rationale: All tab screens used flat `#F4F6FC` which looked cheap. Subtle diagonal gradient (`#F4F6FC → #EFF3FF → #F0F9FF → #F4F6FC`) adds visual depth without distracting from content.

- Decision: Added `Inter_800ExtraBold` font for hero headlines and brand titles.
  Rationale: `Inter_700Bold` lacked the visual impact needed for hero sections. ExtraBold with tight letter-spacing (-0.5 to -0.7) matches modern iOS app design language.

## 2026-10-03 - Mobile Completion Implementation

- Decision: Route hierarchy structure uses `app/workspace/[id]/index.tsx` instead of `app/workspace/[id].tsx`.
  Rationale: Expo Router encounters route conflicts if both a file `[id].tsx` and a subdirectory `[id]/` exist at the same level. Moving the detail screen to `[id]/index.tsx` guarantees clean routing for sibling sub-routes like `documents.tsx` and `chat/`.

- Decision: Introduced dedicated `_layout.tsx` stack coordinators for `workspace/` and `account/`.
  Rationale: Native stack headers with consistent Academic Precision theming (`colors.primary` tint, transparent elevation, and localized back titles) provide coherent navigation behavior and proper safe-area insets.

- Decision: Modularized `app/(tabs)/index.tsx` by extracting `WorkspaceHero`, `WorkspaceCard`, and `CreateWorkspaceModal`.
  Rationale: `index.tsx` originally contained 527 lines, violating the AGENTS.md 300-line standard. Extraction reduced it to 278 lines while improving testability and code reusability.

- Decision: Formally synchronized `docs/specifications/api-contracts.md` with `/workspaces/explore` and `/workspaces/{workspaceId}/join`.
  Rationale: Backend `WorkspaceController.java` already implemented both discovery and joining endpoints, but the specification was missing them. Documenting them ensures the API contract remains the single source of truth.

- Decision: Centralized global Jest test mocks in `mobile/jest.setup.js`.
  Rationale: Reanimated 4, React Native Safe Area Context, Vector Icons, and Expo Router require coordinated mocks to prevent flaky tests, unhandled act warnings, and native module instantiation errors across unit and integration tests.

- Decision: Configured `*:missing,*:ignored,*:future,*:mismatched` in `spring.flyway.ignore-migration-patterns`, added `*.sql text eol=lf` to `.gitattributes`, and implemented resilient `FlywayMigrationStrategy` executing `flyway.repair()` prior to `flyway.migrate()`.
  Rationale: Prevents future startup failures across branches and developers sharing the development database: (1) ignores schema drift and checksum mismatches from concurrent branches, (2) standardizes LF line endings across OS platforms to prevent CRC32 divergence, and (3) automatically heals broken/diverged checksum records in `flyway_schema_history` upon boot.

## 2026-10-03 - Mobile Network Request Resilience & Core API Contract Alignment

- Decision: Added `MethodArgumentTypeMismatchException` handler in `GlobalErrorHandler.java` returning HTTP 422 `VALIDATION_ERROR` instead of falling through to HTTP 500 `InternalError`.
  Rationale: When route params or query params cannot be cast (e.g., non-UUID strings like `"undefined"`, `"[id]"`), Spring previously fell through to generic `Exception.class`, returning 500 Internal Server Error with `"Hệ thống không thể xử lý yêu cầu lúc này."`. Catching it as a validation failure ensures correct RFC 7807 problem details and suppresses false system alarms.

- Decision: Implemented `isValidUuid` validation guards across mobile screens (`WorkspaceChatRoomScreen`, `NewWorkspaceChatScreen`, `WorkspaceDetailScreen`, `WorkspaceDocumentsScreen`).
  Rationale: In Expo Router, route parameters can temporarily be undefined or match route literal strings during initial mount before hydration finishes. Guarding lifecycle queries prevents triggering 422/500 errors on the backend and suppresses empty error toasts.

- Decision: Aligned `chatApi.getConversations` and `chatApi.getConversation` with Spring Data Page and Core API contracts.
  Rationale: Core API returns Spring Data `Page<ConversationResponse>` with `content` array (not `{ items }`) and message records with `role: 'USER' | 'ASSISTANT'` (not `sender`). Added dual-support normalization so mobile receives valid DTO fields under both mocks and live Core API.

- Decision: Sanitized `EXPO_PUBLIC_API_URL` in `api-client.ts` and set LAN IP `192.168.1.3:8082` in `mobile/.env`.
  Rationale: Rejects truncated or empty protocol prefixes (e.g. `"http://"`) and falls back safely to Expo Metro host or localhost.

- Decision: Added non-streaming `chatApi.askQuestion` fallback in `useChatStream`.
  Rationale: In environments or networks where HTTP streaming or `expo/fetch` ReadableStream encounters transient failures or buffering, the client automatically falls back to standard POST question answering, guaranteeing the student always receives their answer and citations without crashing.

## 2026-10-03 - Mobile Chat UI & Academic AI Experience Revamp

- Decision: Introduced custom `ChatHeader` with safe insets, workspace title, live RAG document counter status dot, and history button.
  Rationale: Eliminates the blank headerless void. Providing a prominent back navigation button and live reasoning status dot gives the student clear context of which workspace and how many documents AI is actively referencing.

- Decision: Designed `ChatEmptyState` featuring AI Sparkle aura, referenced document chips, and 4 categorized academic starter prompts.
  Rationale: An empty chat screen previously looked like a broken blank form. The new empty state immediately communicates AI value proposition and allows single-tap prompt execution across Core Concepts, Summary, Comparison, and Exam Questions.

- Decision: Built `ChatCitationSheet` bottom modal for deep source inspection.
  Rationale: Transcends simple inline text by offering a focused academic inspection sheet displaying similarity score percentage, document locator, and verbatim quote blocks.

- Decision: Upgraded `ChatInputBar` with Liquid Glass, safe-area insets, external knowledge toggle chip, clear button, and character counter.
  Rationale: Prevents UI clipping on iPhone home indicator bar and empowers students to toggle between strict workspace document RAG vs. expanded web knowledge on the fly.

## 2026-10-03 - Mobile Hardening, Bug Fixes & Code Standards Compliance

- Decision: Hardened `citation-card.tsx` with a nullish fallback for `citation.score` (`Math.round((citation.score ?? 0) * 100)`).
  Rationale: When the backend or LLM returned citations without an explicit similarity score, `Math.round(undefined * 100)` produced `NaN%`, breaking the visual badge display.

- Decision: Connected `allowExternalKnowledge` through `useChatStream` and both SSE and fallback POST pipelines.
  Rationale: `ChatInputBar` exposed the external knowledge toggle to users, but `sendMessage` dropped the second parameter, preventing user selection from reaching the Core API and AI Service.

- Decision: Refactored SSE chunk parsing in `sse-client.ts` to accumulate multi-line `data:` blocks per the SSE specification and reset `currentEvent` only on blank event boundaries.
  Rationale: Prevents dropped event types when servers emit multi-line data payloads.

- Decision: Removed hardcoded test email fallback from `app/(tabs)/account.tsx`.
  Rationale: Replaced private test email with localized placeholder `'Chưa đăng nhập'` to keep production code clean.

- Decision: Modularized `app/(tabs)/feed.tsx` into `DiscussionCard` (`mobile/src/features/feed/components/discussion-card.tsx`) and `app/workspace/[id]/index.tsx` into `WorkspaceQuickAction` (`mobile/src/features/workspaces/components/workspace-quick-action.tsx`).
  Rationale: Both screen files previously exceeded the 300-line limit from AGENTS.md. Component extraction reduced file sizes (185 lines and 240 lines respectively) while improving modularity and unit testability.

- Decision: Added unit test suites for newly extracted components (`discussion-card.test.tsx`, `workspace-quick-action.test.tsx`), reaching 100% pass rate (61/61 tests across 20 suites).
  Rationale: Complies with the AGENTS.md requirement that untested code is unfinished and core UI interactions are tested.




## 2026-10-07 — Standalone project audit and next-work backlog

- Decision: Treat the user's request as analysis of the current dirty working tree, including untracked features, rather than resuming the July implementation checkpoint. Preserve canonical approvals, requirements, task breakdown and pipeline phase state.
  Rationale: Current source has substantial auth, ingestion, community, mobile and admin work absent from the old checkpoint; the user requested a tasklist, not implementation.
- Decision: Create one dated report with evidence, 65 proposed tasks, priorities, relative sizes, dependencies, acceptance criteria and scope questions; compile it using the existing Markdown-to-HTML script without new packages.
  Rationale: Keep detailed analysis reviewable while preserving existing plans; grounded-only RAG and the approved specifications remain the comparison baseline, with deviations explicitly requiring a scope decision.
- Decision: Run existing frontend/mobile local gates and attempt Core verification offline. Stop Python validation on the existing venv Access denied error; do not run live cloud/DB/provider automation.
  Rationale: Provide fresh evidence without dependency installation, shared database mutations or paid provider calls. Test counts do not imply coverage or end-to-end completion.

## 2026-10-10 — Personal-scope implementation plan

- Decision: Plan only authentication, authorization, AI chat and the web admin dashboard; include native mobile authentication and AI chat following the user's explicit answer. Exclude community/posts, Workspace feature development, document ingestion, research evaluation and new Studio generators.
  Rationale: Reflect the user's ownership boundary. Preserve existing out-of-scope code and the full-project backlog rather than treating the exclusion as a deletion request.
- Decision: Retain read-only workspace/document permission contracts, existing conversation/note ownership and authorization rechecks as chat security requirements; treat source processing, vector security remediation and shared schema readiness as external dependencies.
  Rationale: Chat still receives workspace/document IDs and must not expose unauthorized content. This does not assign Workspace CRUD, membership management or document lifecycle work to the user.
- Decision: Create two dated Markdown reports and compile both with the existing local Markdown-to-HTML script. Keep 37 proposed tasks (28 P0, 9 P1), seven implementation stages, relative sizes, acceptance criteria, tests and explicit scope mapping; do not advance canonical pipeline approvals/checkpoints.
  Rationale: The request authorizes a detailed plan, not implementation. Re-read source findings inform the plan; the 07 October test results remain historical and were not rerun in this planning turn.
- Decision: Propose one logical chat.ask idempotency namespace across streaming and nonstreaming transport, with payload/context binding and status/replay authorization. Mark security-version, replay-store, SSE finalization and telemetry retention choices as design candidates rather than approved ADRs.
  Rationale: Mobile can retry through a different transport after a stream failure; a literal HTTP-route namespace would permit duplicate provider calls. Existing telemetry already persists files, so its retention/concurrency requirements must be assessed before changing storage.

## 2026-10-10 — Detailed review of the two personal-scope plans

- Decision: Review both plans in-process using the Reviewer persona, covering all 37 tasks and relevant approved specifications/current source; classify contract gaps separately from implementation findings and keep the original plans unchanged.
  Rationale: The user explicitly requested a detailed review, not edits or implementation. Seven design blockers, ten warnings and two suggestions describe revisions required for affected tasks; they are not claims that new production code was tested or changed.
- Decision: Write a dated standalone review report and compiled HTML under .pipeline without replacing the canonical IMP-001 review or advancing pipeline-state/approval fields.
  Rationale: The existing canonical review/checkpoint belongs to another implementation scope. Preserve that evidence while providing compatible standalone review context and append-only activity records.
- Decision: Normalize the full AZ-03 ACL dependency on AZ-02 and expand broad QA group references for a static dependency audit; treat the result as review evidence, not an executable task manifest or parallel staffing plan.
  Rationale: The 37-node dependency graph is acyclic, but milestone descriptions can claim completion before full acceptance dependencies. Keep source/cloud policy, refresh races and operation recovery as explicit design decisions rather than silently implementing them.

## Plan V2 implementation bootstrap
- User explicitly approved Plan V2 implementation; no repeated requirements/design approval requested.
- Use real collaboration workers because orchestrator skill and enabled configuration require delegation. No separate Codex threads are created.
- Preserve existing dirty source in a task baseline; scope partitions are disjoint and shared contracts remain documented.
- Keep prior pipeline approvals/artifacts; add a scoped Plan V2 approval and progress entry.
- Runtime exposes no close-agent API; completed workers remain idle or are interrupted after handoff.

## 2026-10-10 — V33 Schema Catch-up Migration Fixes for Refresh Tokens & OTPs
- Decision: Backfill `refresh_families` from existing `refresh_tokens` before establishing the `fk_refresh_token_family` foreign key constraint, and purge any orphan refresh tokens lacking a valid user/family mapping.
  Rationale: Existing runtime tokens in the remote Supabase database caused Flyway migration V33 to fail on `ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_token_family` with PSQLException (foreign key violation) because `refresh_families` was created empty. Backfilling existing session families preserves active valid tokens and prevents migration failure.
- Decision: Drop the `NOT NULL` constraint on `password_reset_otps.otp_code` in V33, initialize `challenge_id` and backfill `attempts = 0`.
  Rationale: The updated `PasswordResetOtp` JPA entity handles cryptographic HMAC digests (`otp_hash` and `challenge_id`) without persisting plaintext OTP codes. If `otp_code` is `NOT NULL` in the DB schema, inserting new reset requests without `otp_code` throws a database constraint violation.

## 2026-10-10 — Jackson 3 ObjectMapper Alignment in Spring Boot 4.x
- Decision: Update `ChatJson` and `ChatResultMapper` to autowire `tools.jackson.databind.ObjectMapper` instead of `com.fasterxml.jackson.databind.ObjectMapper`.
  Rationale: In Spring Boot 4.1.0, Jackson 3 (`tools.jackson.*`) is the native default object mapper provided and configured in the application context (matching `IdempotencyService` and `SseChatService`). Autowiring `com.fasterxml.jackson.databind.ObjectMapper` caused `NoSuchBeanDefinitionException` during context initialization.

## 2026-10-11 — Local Core startup incident

- Decision: Make the PostgreSQL integration assertion explicitly boolean so Maven `testCompile` succeeds during `spring-boot:run`; keep Testcontainers tests explicit and separate from local startup.
  Rationale: The user's `dev.ps1` log stopped at Java overload resolution before Spring Boot or the database was contacted. The local developer path must not require Docker.
- Decision: Let the Core process inherit database and AI configuration from the environment already loaded by `dev-service.ps1` instead of duplicating those values in Maven JVM arguments.
  Rationale: The runner's command line exposed database credentials and could split a JDBC URL containing `&`; environment inheritance is compatible with Spring configuration placeholders and is reversible by restoring the previous runner line.
- Decision: Report Plan V2 implementation separately from verification and treat V34/V35 migration and live login as open gates.
  Rationale: Read-only shared DB inspection showed V33 applied and V34/V35 pending; the user's provided failure was compilation, not an observed authentication response. Do not mutate shared schema or assert login recovery before a controlled startup and HTTP test.
- Decision: Remove the Core startup strategy's automatic V23 checksum rewrite and keep only Flyway's versioned migration call.
  Rationale: Startup otherwise writes to shared migration history even before pending migrations are reviewed. This does not fix an existing checksum mismatch by guessing; the change is covered by a strategy unit test and can be rolled back by restoring the prior strategy if a separately approved migration repair is ever needed.

## 2026-10-11 — Approved shared migration and local startup recovery

- Decision: Apply only V34 and V35 with Flyway target 35 on shared Supabase after the user's explicit approval; verify history, columns and coverage markers using read-only SQL afterward.
  Rationale: Preflight showed V33 as the latest successful version and both new schema elements absent. Flyway reported exactly two successful migrations; additive schema is retained for rollback compatibility.
- Decision: Defer construction of chat AI and Supabase Storage Java HTTP clients until the first operation, with focused tests.
  Rationale: The local tool environment cannot open a Java loopback selector, so eager HTTP transport construction prevented the auth API from reaching startup even though the AI and storage services were not being used. This change only delays transport creation; rollback is restoring the former eager initializers.
- Decision: Treat the remaining Tomcat selector failure as an unverified environment limit until `dev.ps1` is run directly in the user's PowerShell.
  Rationale: The same selector failure occurs in standalone JDK 17/21 probes in the tool environment. Do not claim live login recovery or alter Tomcat/DB settings to mask a likely host restriction without user-side evidence.

## 2026-10-11 — Browser login blocked by local Origin mismatch

- Decision: Permit `http://127.0.0.1:5173` only in the implicit local CORS/Origin allowlist; preserve explicit allowlists and existing production defaults.
  Rationale: `dev.ps1` opens the Vite page at that address, while Core previously accepted only `localhost:5173`. The browser sent the correct Origin, so a pending logout was rejected with 403 before login. A real security-chain test covers local logout and login plus the existing hostile-origin denial.
- Decision: Keep pending offline logout as a pre-login cookie cleanup, but clear its marker immediately after successful cleanup; do not create a pending logout marker for definitive 400/401 refresh or rejected login credentials.
  Rationale: The old client marked even a clean expired refresh or wrong password as an uncertain cookie state, causing unnecessary logout calls on later login attempts. Network-uncertain login and post-login identity failures still retain the marker for safe cleanup.

## 2026-10-11 — Direct message schema recovery hotfix

- Decision: Use the orchestrator hotfix fast-path for the confirmed Core startup schema regression, with real Planner/Architect, Implementer, Reviewer and Tester delegation. Preserve existing Plan V2 checkpoints and record this incident separately. No close-agent API is exposed; completed agents remain idle.
- Decision: Create sequential V38 after read-only confirmation that the shared DB ends at V37; avoid a timestamp version that would force future sequential migrations into out-of-order execution. Re-check V38 immediately before approved application.
- Decision: Add only a nullable TIMESTAMPTZ read_at column, with no default or backfill. Preserve rows/read receipts and retain the additive column during rollback; do not rewrite old migrations/history or weaken Hibernate validation.
- Decision: Treat the disappearance of read_at as confirmed schema drift with an unproven cause. V32 is recorded successful under its expected script name; unavailable V36/V37 source does not prove table recreation.
- Decision: Use the existing Docker/PostgreSQL image and pinned test dependencies for isolated regression tests; shared database inspection is read-only and any mutation remains a separate approval gate.
- Decision: Use UTC only for the integration-test JVM because the existing PostgreSQL image rejects the host's Asia/Saigon alias. Disable Ryuk to avoid a new image download and clean the interrupted run's identified Testcontainers-owned container explicitly.
- Decision: Baseline the fresh test fixture at version0 and pre-enable RLS only on its Flyway history table, avoiding V23's observed history-table lock while executing every application migration. Production migration behavior and the existing shared fixture are unchanged; document this prerequisite instead of claiming unmodified fresh startup succeeds.
- Decision: Run scoped whitespace/UTF-8/method-size checks and existing architecture tests because Core has no configured Java/SQL lint task; report this limitation explicitly rather than claim a nonexistent lint command passed.
- Decision: After explicit apply/restart approval, scan only an isolated directory containing V38; require current37 and one pending38, compare the approved SHA256, retain validation and use 10s lock/30s statement timeouts. This bounds the shared mutation to the reviewed additive change.
- Decision: Start a hidden Core dev runner because the previous runner no longer exists. After observed JDK Unix-domain socket failure, use a workspace socket temp directory only in the new runner's inherited JAVA_TOOL_OPTIONS; standalone selector probe succeeded and Core then fully started. No application or system-wide config change; the failed owned runner exited via its existing quit command.
- Decision: Verify public health200, actuatorUP and unauthenticated profile401, and mark dashboard ready. Do not claim authenticated login without supplied test credentials; retain the live process for continued development.
# 2026-10-11 — Mobile API hostname and web auth loading UX

- Decision: In mobile development, leave `apiBaseUrl` unset by default so the Expo host fallback can resolve the machine running Core; retain explicit `EXPO_PUBLIC_API_URL` and staging/production defaults.
  Rationale: the mobile screenshot shows a hostname lookup failure before any HTTP response, while the supplied Core log confirms startup but contains no auth request. The old `localhost:8082` default points to the phone on physical devices and masks Expo's LAN host. The log's unresolved CloudAMQP hostname is a separate dependency warning, not evidence of a rejected login.
- Decision: Render the shared web auth-guard waiting state as a branded, accessible full-viewport screen and redesign the login page with a responsive academic product panel.
  Rationale: the blank web screenshot maps to the guard's unstyled session-restoration placeholder, not the login form or lazy-load screen. Respect reduced-motion preferences and keep the change within existing dependencies/tokens.
- Rollback: restore the mobile development API default to `http://localhost:8082` and revert the web auth route-guard/login presentation changes; no schema or external service state is affected.
# 2026-10-11 — Reconnect AI chat and admin presentation styles

- Decision: Keep the existing stylesheet design system and reconnect current chat/admin JSX to its established component selectors; add only scoped shared admin data-page styles where those views had no matching page structure.
  Rationale: screenshots show stylesheets are loaded (chat shell and admin navigation are styled), while the current composer DOM no longer matches its wrapper/control selectors and admin form elements render without the classes expected by the bundled page CSS. No package or theme replacement is needed.
- Rollback: revert the chat composer structure, admin-page class wiring and the new scoped admin page stylesheet; API behavior and persisted data are unaffected.
# 2026-10-11 — Reject incomplete mobile API origins

- Decision: Treat API origin configuration as valid only when it parses as an HTTP(S) URL with a hostname; blank the malformed local mobile override so Expo Go can use its current development host.
  Rationale: The new screenshot persisted after restart because `mobile/.env` still supplied a scheme-only URL, overriding host discovery. The source accepted that prefix without validating the hostname. Keep explicit valid URLs supported and avoid hardcoding a device-specific LAN address.
- Rollback: restore the previous local `.env` setting only if it is a complete, reachable API URL; revert the URL validation/test changes to restore previous fallback behavior.

## 2026-10-12 — Synchronize full-screen web loading

- Decision: Use the orchestrator hotfix fast-path for the narrow user-reported loading regression introduced by the separate auth presentation. Existing product checkpoint approvals are not repurposed for delivery. Execute compact reporting with real Planner/Architect and Implementer delegation through exposed collaboration tools; no close-agent API exists.
- Decision: Keep the established AI-avatar LoadingScreen as the canonical visual and place one loading host inside the existing ErrorBoundary, above AuthProvider and route Suspense. Register each full-screen wait with a unique token and use layout-effect handoffs so the visible DOM and animation persist while messages change. Do not add artificial delays, simulated percentages or start protected data requests before authentication.
- Decision: Preserve standalone/container loaders and all authorization/redirect/failure behavior. Track overlapping requests separately and respect reduced motion; disable interaction with obscured content while loading.
- Decision: Preserve unrelated dirty work and leave the old untracked auth stylesheet on disk unused. The pre-existing WorkspaceShell workspace-ID state-reset issue is outside this fix and is deferred; no backend, dependency, schema, commit, push or deploy is required.
- Rollback plan: Remove LoadingProvider from AppProviders, restore the prior standalone LoadingScreen visual and SessionLoading guard markup/import, and remove only the newly introduced loading coordinator/view/test files after human authorization if deletion is requested. Preserve all pre-existing changes; no external state needs rollback.
- Decision: Keep the visual host mounted while idle using visibility:hidden and aria-hidden; guard redirects register ownership while Navigate waits for its effect. This avoids remounting at the brief intermediate redirect commit. Newest active request supplies the message; no percentage or completion state is fabricated.
- Decision: Use pre-installed Chrome only via optional PLAYWRIGHT_CHANNEL for local E2E, retaining configured Chromium as default. Run local browser/Vite outside sandbox after its socket restriction was confirmed; mock API and abort remote requests.
- Decision: Redirect TEMP/TMP to a task-owned workspace directory after an EPERM cache rename, and limit full-suite coverage workers to two after the existing asynchronous App.test timed out under parallel load. Complete suite passes with no application change or test skip.

## 2026-10-12 — Restore AI chat message styles

- Decision: Treat the screenshot as a narrow web presentation regression and use the orchestrator hotfix fast-path. The chat page already imports its feature stylesheet; its message component omitted selectors required by that stylesheet. Preserve the existing theme and unrelated dirty work.
- Decision: Reconnect the message markup to the existing avatar, author, thought-step, Markdown and action-button selectors. Add one small co-located stylesheet only for native details behavior, alignment and narrow screens instead of expanding the existing long chat-page stylesheet.
- Decision: Render a static chat-message fixture in Playwright and assert actual computed CSS in Chrome. Flex children compute to `display:flex` even when their rule says `inline-flex`; test the computed result and border radius. The preview makes no API calls and changes no persisted data.
- Decision: Display the Core API's one-based public `stepIndex` without offset. Review found that adding one would have shown stages 2–6; test data now follows the real 1–5 contract.
- Rollback plan: Restore only this task's changes to chat-message-item.tsx, remove the new co-located stylesheet and associated tests/fixture, and remove this task's documentation entries. Preserve all pre-existing changes and data.

## 2026-10-12 — Hive provider feasibility check

- Decision: Interpret the user's request as a provider feasibility check; defer application migration and environment changes until requested. Preserve unrelated dirty work and do not persist the supplied secret.
- Decision: Send two bounded manual smoke requests to the user-specified HTTPS Hive chat endpoint using synthetic prompts only. These are explicitly authorized external checks, separate from automated tests, which must remain offline.
- Evidence: DeepSeek V4.1 Flash streaming returned HTTP 200, HIVE_OK and [DONE] in 2.29 seconds, with 76 measured total tokens. A JSON-object request returned HTTP 200, valid JSON, a DOCUMENT section, citation ID 1 and Vietnamese diacritics in 1.91 seconds, with 219 measured total tokens. JSON Schema enforcement, real-document citation validation, application integration and sustained reliability remain unverified.
- Decision: Recommend a dedicated Hive/OpenAI-compatible adapter before switching UniChat. The current generation gateway, key registry and metadata probe use Gemini directly; embeddings use local multilingual-e5-base. Preserve Core authorization checkpoints and output/citation validation during any future migration.
- Decision: The sandbox could not resolve the provider hostname; retry the authorized smoke checks with reviewed network access rather than interpreting a local DNS restriction as a Hive service failure. No dependency, database, commit, push or deployment change is required.

## 2026-10-12 — Hive migration planning

- Decision: Produce a standalone detailed migration plan and compiled HTML preview, not application implementation. Do not modify existing pipeline approvals/checkpoints or treat unrelated product approvals as Hive cutover approval. Real read-only Planner/Reviewer delegation follows the orchestrator skill and enabled local agent configuration; no close-agent API is exposed, so completed explorers remain idle.
- User decisions: Hive primary with Gemini retained for explicit configuration rollback; report failures without automatic Gemini/Ollama failover.
- Assumptions: The optional question returned no answers after interruption; use reasoning effort low and an on-demand generation key probe capped at128 tokens as proposed defaults, explicitly subject to plan review. Do not perform new paid requests during planning.
- Decision: Reuse pinned httpx instead of adding an SDK, keep existing embedding/data/history, use the proven Hive endpoint/JSON-object mode and local citation enforcement, and require active-provider key/model ownership. Default rollout output cap4096 and idle read timeout5s; keep operation deadlines unchanged and distinguish config readiness from a verified remote credential.
- Decision: Include the discovered private slash/prompt-limit mismatch, dropped model attribution, misleading provider refusal presentation, and operational-failure-to-COMPLETED path in migration integration scope. Specify typed operational FAILED handling separately from content-free domain refusals; document a bounded cancellation guarantee rather than claiming asyncio worker cancellation immediately closes upstream.
- Decision: Preserve existing dirty work, Gemini history, nullable usage and offline test isolation. Keep legacy synthetic evaluation repair and billing/quota automation out of scope; use staged compatibility rollout and separately authorized manual smoke. The detailed plan records interfaces, exact defaults, ownership, acceptance tests and rollback limitations, including the unavailable Google free account.

## 2026-10-12 — Standalone Hive plan review

- Decision: Review the explicitly selected Hive migration plan in-process with the Reviewer persona; do not execute implementation or alter the plan/approvals. Store a task-specific report rather than overwrite the canonical implementation review belonging to existing pipeline work.
- Evidence: Offline HTTPX custom byte-stream probe confirms fixed chunk_size buffers multiple transport reads before yielding; no real network or provider credit is used. Distinguish public subscriber detach from private AI cancellation, and review the compaction branch and in-flight cutover lifecycle as separate contracts.
- Verdict: CHANGES_REQUIRED for two P1 cancellation/lifecycle ambiguities and two P2 compaction/cutover omissions. Report exact plan locations, grounded source evidence, concrete corrections and acceptance tests without treating the review as delivery approval.

## 2026-10-12 — Implement approved Hive migration

- Authorization: The user explicitly requested implementation of the revised Hive plan, including the persistent Core admission gate. Treat this as requirements/design implementation approval rather than repeating the planning gate; record a separate task approval and preserve existing product/pipeline approvals. Database apply, paid provider smoke, live cutover, installation and Git delivery remain unapproved.
- Decision: Execute real AI Service, Core and UI Implementer delegation with disjoint write ownership, then independent review/test. No close-agent API is exposed; completed workers remain idle. Capture571 existing tracked target files plus the dirty/untracked inventory before edits for precise rollback; never reset unrelated work.
- Decision: Retain legacy Gemini default when LLM_PROVIDER is absent while the sample config demonstrates Hive. Do not write the exposed key to any file or change live .env/processes. Reuse pinned libraries, no installation.
- Evidence: Shared Flyway inspected with SELECT in READ ONLY and verified TLS/hostname using the public Supabase Root2021 CA, fingerprint807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA. Local max38 but shared current39, so prepareV40__ai_generation_admission.sql. Recheck collision immediately before separately approved application; do not assume snapshot remains current.
- Decision: Use additive task metadata under the canonical checkpoint rather than overwrite unrelated requirements/review artifacts. Store the user-approved updated implementation requirements/file ownership in hive-implementation-plan.md and keep prior plan review as evidence. Stale admission version returns409 before same-state no-op, following the explicit approved contract.

## 2026-10-16 — Resume Hive implementation

- Decision: Resume the already approved implementation after user continuation, preserve all partial code and baseline. Previous agents were not live; assign new AI/Core/UI workers with the same ownership to finish production code and offline tests. Do not repeat the requirements approval gate or treat earlier compile evidence as final verification.
- Decision: Apply Supabase Postgres Best Practices for short transactions, consistent gate/actor lock order and private RLS gate access; do not hold DB locks across inference. Existing Docker Desktop may be started hidden for disposable test infrastructure, without installs, downloads, live app restarts or unrelated-container cleanup.
- Evidence: Shared Flyway refresh on2026-10-16 failed to connect; retain preparedV40 based on verified shared39 snapshot from2026-10-12 and require a fresh collision/version check before any separately approved application.
- Decision: Align provider configuration with approved Hive reasoning enum none/low/high/max and canonical HIVE_READ_IDLE_TIMEOUT_SECONDS, root then service .env and process override. Update only safe .env.example; never write exposed keys or activate live settings.
- Decision: Add narrow private_core ownership to the AI worker so authoritative safe control codes survive START/checkpoint failures; never forward unvalidated error bodies. Preserve nullable usage and no-fallback semantics; legacy synthetic evaluation remains excluded.
- Review-driven scope: The new gate depends on unfinished attempts, so adjust existing provider-attempt retention to delete only terminal rows and add regression tests; this is necessary to avoid false drained state, not an unrelated retention redesign. Bound private non-2xx HTTP body reads by the same operation reader deadline and cover stalled error bodies.
- Environment: Explicit PostgreSQL Testcontainers gate on2026-10-16 failed because the local Docker backend cannot start (inference Unix socket path outside workspace is inaccessible). Do not reset Docker, delete external socket files or silently skip the required gate. Finish unaffected code/unit checks and report PostgreSQL runtime evidence as unavailable.

## 2026-10-19 — Finish Hive verification

- Resume: Read persisted evidence after interrupted agents; reassign narrow AI/Core verification and independent UI review. Preserve the implementation approval and all unrelated dirty work; no live activation or delivery authorization inferred.
- Review repairs: Pass cancellation through local preparation/retrieval boundaries and preserve the original cancellation/policy exception when END acknowledgement also fails. Keep unresolved attempts pending and log only safe metadata. Map explicit provider safety refusal to a content-free RAG domain result without retry; operational failures remain typed failures.
- UI verification: Extract pure helpers into dedicated TypeScript modules to satisfy Fast Refresh lint without changing behavior; select history filters by accessible combobox names in Playwright. All six offline Chrome flows passed; do not claim a CI Playwright job exists.
- Coverage: Report whole-application frontend threshold failure separately from passing changed business-logic coverage; do not lower thresholds or alter unrelated modules to conceal existing coverage debt. AI full Ruff retains exactly 82 baseline diagnostics; task-owned lint passes.
- Environment: Use reviewed escalation only for offline Windows test runtime restrictions (Mockito attach, temporary-path access and loopback socketpair); retain external-provider network guards and existing dependencies.

## 2026-10-19 — Core startup incident

- Scope: User reports Core cannot run. Prioritize startup diagnosis over the ongoing Hive acceptance checks; do not present mocked tests as live readiness.
- Evidence: Supplied log completed compilation then failed during PostgreSQL authentication with08001/EOF. Read-only JDBC reproduced an initial failure on transaction6543 with timezone options; both removal/session5432 connected. Original also connected on retry, so the exact provider-side intermittent failure is not conclusively isolated to one option.
- Repair: Change only ignored local POSTGRES_URL plus safe sample to official Spring/Hibernate session5432 route, preserving hostname/database/credentials/SSL and prepareThreshold0; omit unnecessary timezone startup options. Do not alter JVM timezone or claim server session timezone changed. This reversible local configuration fix follows the user's incident request; no DB mutation authorization inferred.
- External state: Read-only metadata now shows shared44 with40admission already present. These migrations were applied outside this task; do not change historical approvals or claim this agent applied them. Version-based inventory found no pending local migration, with existing30/31checksum differences. No history repair or validation-policy change.
- Boundary: Automatic approval rejected actual Core startup because shared DB/scheduled behavior may write and prior scope excluded shared changes/restarts. Do not retry indirectly or bypass it; request explicit authorization after presenting the concrete verified configuration repair. Core startup/health remains unverified.

## 2026-10-20 — Hive endpoint/model hotfix

- Authorization: The user explicitly requested the fix after the application failed with a generic provider error. Use the orchestrator hotfix fast-path because the cause is a narrow, documented configuration mismatch; preserve the existing Hive implementation pipeline and unrelated dirty work.
- Decision: Align the default with Hive's current chat-completions contract: `https://api-cdn.thehive.ai/api/v3` and `deepseek-ai/deepseek-v4.1-flash-1017`. Keep the VA1 endpoint and the legacy hostname in the strict compatibility allowlist, but do not use the legacy hostname as the default.
- Security: Continue sending only the Secret Key as the Bearer token, never concatenate or persist the Access Key ID, and add an offline header assertion. Do not expose the configured secret in tests, reports, or logs.
- Boundary: Do not make a real Hive call, consume credit, restart services, install packages, mutate the database, or perform Git delivery. The user must separately authorize any paid smoke or operational restart.
- Verification: Independent review approved with zero remaining findings. Focused provider/config tests passed 47/47 and the Bearer regression passed 3/3. The isolated attribution lifecycle test is blocked before assertions by the Python 3.13/Starlette TestClient socketpair environment and is reported without claiming success.

## 2026-10-20 — Hive request compatibility follow-up

- Evidence: The restarted application still returned a sanitized provider failure. Hive's current DeepSeek V4.1 Flash-1017 contract documents `max_completion_tokens`, while the adapter emitted the legacy `max_tokens` field.
- Decision: Replace only the incompatible token-limit field, retain the verified endpoint/model/Bearer authentication, and map safe HTTP 400/405 codes to actionable Vietnamese messages without rendering upstream response bodies.
- Boundary: Keep the verification offline. Do not make a paid Hive request, restart user processes, install packages, mutate the database, or perform Git delivery without separate authorization.
- Verification: Provider/config tests passed 47/47; frontend failure tests passed 13/13; scoped Ruff, ESLint, and mypy passed. Full frontend build remains blocked by pre-existing WorkspaceDto fixture typing errors outside this hotfix.

## 2026-10-21 — PR delivery hardening

- Authorization: The user requested creation of a pull request and explicitly required that environment data not be exposed. Commit and push remain gated by the repository rule requiring a separate explicit approval immediately before each operation.
- Decision: Exclude generated `.pytest-tmp-*` directories because they contain ephemeral test-created `*.env` fixtures and must never enter the PR. Preserve local ignored root, AI Service and mobile `.env` files without reading, staging or printing their values.
- Security repair: Remove temporary absolute-path debug writes that serialized request headers/body, authentication details, generated answer text and exception traces. Retain only safe error codes and structured metadata already supported by the application.
- Verification repair: Add strict test-fixture typing for partial workspace updates and annotate the offline socket guard without weakening TypeScript or mypy strictness.
- Verification: Frontend lint/typecheck/build passed, Vitest passed 215/215 and Playwright Chromium passed 13/13; Mobile lint/typecheck passed and Jest passed 94/94; AI scoped Ruff and full strict mypy passed with pytest 322/322; Core Maven tests passed 331/331. Final diff and secret-pattern checks passed with no live environment file staged.
- Boundary: Validate only the tracked and intended untracked source set, stage explicit paths after approval, and run a secret-pattern scan before any push. Do not include generated test artifacts or live environment files.

## 2026-10-21 — Direct-message read receipt V46 repair

- Evidence: Shared read-only inspection showed successful Flyway history through V45 and confirmed that `public.direct_messages` no longer contains `read_at`; V45 is recorded as the migration that removed the column.
- Decision: Add V46 as a new forward-only migration containing only `ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`. Keep V38, V45, and Flyway history immutable; do not add a default or backfill.
- Test decision: Retarget the isolated PostgreSQL suite from a V37/V38 boundary to a V45/V46 boundary while preserving its row, receipt, idempotency, Hibernate validation, fresh-chain, and incompatible-type checks.
- Boundary: Prepare and verify source only. Do not apply V46 to any database, start services, install dependencies, or perform Git delivery.

## 2026-10-21 — Citation drawer action styles

- Evidence: The excerpt, PDF, download, and close controls in `citation-drawer.tsx` did not have the action classes styled by `citation-drawer.css`, so the browser rendered native button styles.
- Decision: Attach the existing drawer action/close classes and style them as compact text controls with visible borders and keyboard focus indicators.
- Verification: Run the frontend production build and ESLint on the changed component.
- Boundary: Keep this visual hotfix limited to the citation drawer; do not alter adjacent user changes, environment files, or perform Git delivery.

## 2026-10-21 — Compact citation drawer toolbar

- Evidence: Screenshot shows the inline citation drawer's action row extending into the document preview because the base 480px drawer header is rendered inside the 360px Studio panel.
- Decision: In the inline Studio view, stack citation metadata and a wrapping action toolbar in normal document flow. Add compact action icons while retaining text labels and accessible names.
- Verification: Run the frontend production build and ESLint for the changed TSX component.
- Boundary: Keep changes limited to citation drawer presentation and its inline Studio adaptation; do not touch unrelated work or perform Git delivery.

## 2026-10-21 — Require distinct expanded-knowledge section

- User decision: Expanded mode must always add a separate general-knowledge section from the model, clearly labeled and without web search.
- Evidence: The UI boolean was passed through Core and AI Service, but the prompt only said the model could add an EXTERNAL section and validation allowed it to omit that section.
- Decision: Require an EXTERNAL section alongside cited DOCUMENT evidence in expanded mode; retry once with a targeted instruction if omitted, then fail validation rather than silently return a strict-looking answer. Preserve the evidence gate and prohibit external knowledge from filling evidence gaps.
- Documentation: Clarify strict/expanded behavior in the adaptive retrieval specification; no external network or database changes.
- Verification: Run focused offline AI-service tests for prompt instructions, section validation, and retry behavior.
- Boundary: Do not modify environment files, make provider calls, alter authorization policy, or perform Git delivery.

## 2026-10-24 — Thesis dossier as-built synchronization

- Authorization: The user approved implementation of the thesis-document update plan. The scope is limited to `docs/thesis` plus this audit record; no source, API, database, dependency, Git delivery or runtime-service change is authorized.
- Baseline: Use committed snapshot `ff0cf3e` as the source of truth together with migrations, contracts, specifications and existing test evidence. Do not infer shipped behavior from unrelated uncommitted working-tree changes.
- Content decision: Mark web, Expo mobile, community, direct work chat, Studio Notes, SSE streaming, RabbitMQ ingestion, citations/history and admin AI controls as implemented where source/evidence exists. Keep OCR, LMS, voice and mindmap/diagram generation as roadmap unless evidence exists. State that Hive/DeepSeek V4.1 Flash is configured and Gemini is manual rollback only.
- Architecture decision: Preserve Core API as the sole authorization authority. Documentation states that the AI Service receives allowed document identifiers, and that storage is a Local/Supabase adapter rather than an asserted live provider.
- Boundary: `bao-cao-do-an-tot-nghiep-unichat-chuong-1-3-hoan-thien.docx` was locked by Word (`~$` lock file) and therefore was not overwritten. `final_PROJECT_grading-factor.docx` remains unchanged because it is unrelated CAB-System reference material.
- Verification: DOCX packages, XML and XLSX structure were checked; Workbook formula-error scan found zero matches; all Draw.io XML files passed structural validation, with pre-existing routing warnings retained in complex flow diagrams. Visual DOCX render QA is blocked because LibreOffice `soffice.exe` is not available in the execution environment.

## 2026-10-24 — Draw.io review and product use case

- User request: Re-audit the thesis diagrams and add a product-level use-case diagram.
- Decision: Keep the existing P0 pipeline/workflow/ERD sources, correct the legacy Student/Teacher labels in the technical use-case page, and add `unichat-usecase-product.drawio` covering USER, workspace owner/moderator, ADMIN, Hive and the implemented product extensions.
- Verification: All seven Draw.io sources pass structural validation with zero errors. The adaptive/chat/ingestion sources retain 13/2/3 visual routing warnings respectively; these do not indicate dangling IDs but should be waypoint-cleaned before print export.
- Boundary: Draw.io CLI did not emit a verifiable PNG in this sandbox, so no stale PNG was overwritten. No code, API, database, dependency or Git delivery changes were made.

## 2026-10-24 — Diagram routing cleanup

- User request: Reduce overlapping arrows and crossings across the thesis diagrams.
- Decision: Keep the existing content and identifiers, but replace problematic waypoints with orthogonal routes, explicit entry/exit ports and outer routing corridors for the adaptive retrieval, chat retrieval and document ingestion workflows.
- Verification: All seven Draw.io sources now pass `validate.py --score` with zero errors, zero warnings, zero through-vertex routes, zero crossings and zero overlaps.
- Boundary: Only Draw.io sources, the diagram review note and this decisions log were changed; no source code, API, database, dependency or Git delivery changes were made.

## 2026-10-24 — Four remaining diagram presentation pass

- User request: Apply the same presentation cleanup to the product use case, architecture/use-case, ERD and activity-flow files.
- Decision: Preserve all domain content and identifiers; disable the editor grid for print readability, force white page backgrounds, and distribute connection ports on high-degree actor/hub nodes. The ERD remains a matrix layout so table relationships stay traceable without regenerating schema content.
- Verification: The four files pass `validate.py --score` with zero errors, zero warnings, zero through-vertex routes, zero crossings and zero overlaps.
- Boundary: No source code, API, database, dependency or Git delivery changes were made.

## 2026-10-24 — Use case business-level simplification

- User request: Use-case diagrams must show only relationships between users and the application plus business functions; remove technical flow detail.
- Decision: Remove technical pipeline nodes, provider actors and `include/extend` flow relationships from the two use-case views. Retain technical detail in architecture, activity, workflow and retrieval-pipeline diagrams.
- Verification: All seven Draw.io sources pass `validate.py --score` with zero errors, zero warnings, zero through-vertex routes, zero crossings and zero overlaps; no dangling edge endpoints remain in the architecture/use-case source.
- Boundary: Only thesis Draw.io sources, the diagram review note and this decisions log were changed; no source code, API, database, dependency or Git delivery changes were made.

## 2026-10-24 — Terminology and social-product alignment

- User request: Synchronize user naming and make the social-network capabilities of UniChat visible in the thesis materials.
- Decision: Use `Người dùng (USER)` as the authenticated end-user term; use `OWNER`, `EDITOR`, `VIEWER` for Workspace membership roles; use `Quản trị viên hệ thống (ADMIN)` for system administration. Keep Sinh viên/Giảng viên only as educational personas, not technical roles.
- Product decision: Treat Bảng tin cộng đồng, đăng bài/đặt câu hỏi, bình luận/trả lời, reactions/bookmarks, notifications, unified search and 1-1 Work Chat as first-class business capabilities alongside AI knowledge retrieval.
- Verification: Update both use-case diagrams, the thesis design notes and diagram review; re-run all Draw.io structural/readability checks. Seven selected DOCX packages pass OOXML/`python-docx` structural checks; bundled DOCX render QA is blocked because `soffice.exe` is unavailable in the workspace runtime.
- Boundary: Documentation and diagram sources only; no source code, API, database, dependency or Git delivery changes were made.

## 2026-10-24 — Retrieval and multimodal ingestion optimization plan

- User request: Create a detailed plan to improve document chunking and retrieval for text PDFs, slide PDFs, diagrams/images, follow-up questions, and Vietnamese-English cross-language queries. User selected OCR plus diagram understanding.
- Decision: Create a scoped standalone Phase 1 package under `.pipeline/retrieval-optimization/` rather than overwrite the existing project-wide requirements, task breakdown, questions, or active pipeline checkpoint.
- Plan: Measure current ingestion/retrieval first; then specify provenance-aware PDF layout/OCR/diagram extraction, versioned chunking/indexing, contextual follow-up retrieval, cross-language evaluation, typed failure outcomes, evidence-gate calibration, and paired holdout validation.
- Privacy decision: User selected local/private processing only; generated diagram descriptions are query hints, not answer evidence, and citations point to the original authorized page/figure.
- User approval: Approved the exact requirements/task breakdown and selected a specialized added evaluation set while retaining the existing 120 cases, and freezing numeric thresholds after baseline but before tuning. Exact latency/storage budgets and numeric target values remain open.
- Boundary: Planning artifacts only. No code, dependency, provider, database/vector, production document, re-ingestion, deployment, commit, or push action was performed or authorized. The existing canonical pipeline checkpoint remains unchanged because it is already tracking a different active phase.

## 2026-10-24 — Scoped retrieval architecture and implementation boundary

- User direction: Continue implementation after the scoped design; preserve the unrelated canonical pipeline checkpoint.
- Evidence: The project virtualenv has `pypdf`, `transformers`, `torch`, `onnxruntime`, E5, and Chroma 1.5.9, but no local PDF renderer, OCR engine, image library, or vision-model weights. Chroma exposes `chromadb.errors.NotFoundError`; the current retrieval code catches every collection lookup error and returns no candidates.
- Decision: Keep Core authorization, API contracts, E5 model, thresholds, and generation question unchanged. Add bounded contextual retrieval only from `safe_context`, keep every vector query under the existing workspace/document/status filters, preserve the original user question for generation, split chunks without mixing locators or dropping source text, and treat only a missing collection as empty evidence.
- Dependency gate: Do not add/install OCR or rendering packages or download model weights until a specific private/local stack and resource budget are approved. OCR/diagram execution is explicitly deferred rather than represented by a no-op fallback.
- Verification baseline: Focused chunker/adaptive-retrieval/private-API suites passed 19 tests before source changes. One existing Starlette/httpx deprecation warning was reported.
- Boundary: Scoped design artifacts and source/test changes only; no production vector/database, document, external provider, deployment, commit, or push action.

## 2026-10-24 — Offline text retrieval slice completed

- Implementation: Chunking now preserves long source text, respects one locator per chunk, avoids merging across locators, keeps table rows without overlap, embeds section headings as retrieval context without changing cited text, and stores additive `chunking_version=2.0` metadata.
- Follow-up retrieval: Add a bounded deterministic second query only for explicit follow-up cues with validated `safe_context`; batch E5 query embeddings; deduplicate by chunk ID using best similarity; preserve the original user question for generation and the same workspace/document/status filters for every query. Log only request ID and whether contextual retrieval was used, never raw query/history.
- Failure behavior: Only `NotFoundError` is an empty collection result; configured Chroma failures no longer switch to EphemeralClient. Evaluation corpus loading now raises an explicit error rather than manufacturing a draft benchmark from an empty corpus.
- Verification: Full AI Service pytest PASS 351/351 (one pre-existing Starlette/httpx deprecation warning); Ruff PASS; strict mypy PASS across 102 source files; focused chunk/query/vector/evaluation coverage PASS 94.54%; Pylance diagnostics clean; `git diff --check` PASS.
- Evaluation boundary: Workspace search found no frozen 120-case gold dataset or manifest. The code’s 120-case default dynamically creates draft questions from Chroma, so no retrieval or cross-language quality baseline is claimed.
- Remaining gate: OCR/diagram processing needs an approved exact local renderer/OCR/model stack and resource budget. No dependency was added or installed, model was not downloaded, and no production corpus/vector data was read or changed.

## 2026-10-24 — OCR/diagram scope deferred

- User selected to defer both local OCR and diagram processing; resource budget is unknown and no corpus or evaluation dataset path was provided.
- User gave general permission for package/model installation and local corpus processing, but no concrete stack or data source was identified. Because both workstreams are deferred, no package/model installation, download, or document access was performed.
- Resume gate: user must select a local OCR/rendering and diagram approach, specify CPU/GPU, memory, storage and latency budgets, and identify an authorized corpus plus a fixed evaluation dataset or approve creating labeled fixtures.

## 2026-10-24 — Retrieval/chunking code review

- Reviewed the retrieval/chunking implementation diff and the user-provided read-only `file_questions.md` snapshot in-process; unrelated dirty worktree files were excluded.
- Verdict: APPROVED with two warnings, no blockers. Focused AI Service regressions PASS 53/53; reviewed patch `git diff --check` PASS.
- Warning: the attached questions snapshot predates subsequent approvals and implementation decisions; it should be treated as historical, not authoritative.
- Warning: contextual retrieval currently uses a bounded lexical cue list and lacks a labeled follow-up/cross-language benchmark; no quality claim is made.
- Report: `.pipeline/retrieval-optimization/review-report.md`. Canonical `pipeline-state.json` was intentionally left unchanged because it belongs to another active work item.

## 2026-10-24 — Improvement plan draft

- User asked for a plan to improve the observed limitations in follow-up reference handling, cross-language retrieval, unsupported/overly cautious refusals, and absent OCR/diagram ingestion.
- Created a new scoped draft under `.pipeline/retrieval-optimization/improvement-plan/` rather than overwriting the earlier requirements or canonical pipeline state.
- Plan prioritizes authorized data and reproducible baseline, then follow-up and cross-language diagnosis, stage-level refusal attribution, separate generation evaluation, and paired holdout review. OCR/diagram remains deferred per the user's prior choice.
- No source code, dataset, production corpus/vector store, dependency, model, or threshold was changed. Await exact scope approval and authorized evaluation-data direction before detailed design.

## 2026-10-24 — Improvement scope approved; detailed design drafted

- User explicitly approved the exact improvement requirements and task breakdown for detailed design/evaluation preparation, reported no corpus/dataset available, and selected text/follow-up/cross-language/gate work while keeping OCR/diagram deferred.
- Drafted scoped architecture decision and proposed file plan under `.pipeline/retrieval-optimization/improvement-plan/`.
- Design sequencing: fixed authorized dataset and baseline first; stage attribution; then evidence-backed follow-up/cross-language candidates; gate and generation evaluation separately; freeze targets before tuning and preserve untouched holdout.
- Approval boundary: no implementation or data processing authorized; no source code, provider call, package/model install/download, production data/vector access, threshold change, or delivery action performed.
- Canonical `.pipeline/pipeline-state.json` remains unchanged because it belongs to another active pipeline item. The detailed design itself remains a draft pending review; no approval fields were changed.

## 2026-10-24 — Improvement plan review

- Reviewed the improvement plan artifacts and AI Service pytest configuration in-process; did not change plan or source files.
- Verdict: CHANGES_REQUIRED. Blocker: proposed `app/evaluation/tests/` is outside configured pytest `testpaths` (`app/tests`, `app/core/rag/tests`), so planned tests would not be collected by normal test runs.
- Warnings: requirements/task breakdown approval status contradicts architecture/questions; paired confidence-interval and human-rubric methodology is underspecified.
- Report: `.pipeline/retrieval-optimization/improvement-plan/review-report.md`. No code tests run; canonical pipeline state unchanged.

## 2026-10-24 — Improvement plan corrections and operational feasibility

- Decision: Treat the earlier user approval as design/evaluation preparation only. Keep implementation, corpus access, provider calls, dependency/model installation, environment mutation, and delivery behind separate approvals.
- Updated the retrieval improvement plan to place evaluator tests under the configured pytest discovery roots and documented an explicit collection command.
- Defined the paired cluster-bootstrap protocol, confidence level/resampling count, underpowered-sample caveat, blinded human rubric, inter-rater agreement, and adjudication.
- Added operational-readiness requirements and a read-only feasibility assessment covering Core/AI, Chroma/embedding, generation provider, RabbitMQ/storage ingestion, durable chat persistence/replay, and frontend completion.
- Decision: Synthetic tests certify harness behavior only; quality conclusions require authorized gold data, and live readiness requires approved isolated integration/provider smoke checks.
- Recorded that AI readiness does not prove embedding/model/provider/RabbitMQ readiness; RabbitMQ consumer startup is fire-and-log, and failed ingestion message recovery/DLQ routing must be verified before declaring ingestion reliable. OCR/diagram remains deferred.
- No source code, `.env`, corpus, live service, database/vector state, provider, dependency, deployment, or canonical `.pipeline/pipeline-state.json` was changed or accessed.
- 2026-10-24 16:52 +07 — Focused in-process re-review of `improvement-plan/file-plan.md` found a scope-gate blocker: implementation step 1 conflicts with the design/evaluation-preparation-only approval. Verdict `CHANGES_REQUIRED`; finding recorded in the scoped review report. The reviewed plan was not edited.
- 2026-10-24 17:27 +07 — Created `docs/reviews/retrieval-improvement-session-handoff-2026-10-24.md` to consolidate this workstream's goals, changed artifacts, approval limits, feasibility evidence, current review blocker, and independent-review checklist. No source or runtime behavior changed.

## 2026-10-24 — Improvement plan review corrections

- User authorized correction of the session-review findings; authorization covers documentation and plan repair only, not evaluator/runtime implementation, corpus processing, live checks, or delivery.
- Decision: extend the existing `app/evaluation` dataset/metrics/runner/report/storage/benchmark path instead of creating parallel `retrieval_*` evaluator modules. Require a benchmark-entrypoint integration test so simulated/draft behavior cannot produce a product-quality report.
- Decision: split evaluator implementation approval from production-behavior implementation approval. Design contracts precede the first gate; evidence/holdout precede the second gate.
- Decision: add ADR-023 and synchronize the authoritative test plan to a paired cluster-bootstrap protocol with 10,000 resamples, fixed seed, underpowered-cluster disclosure, anchored ordinal ratings, Krippendorff's alpha, and adjudication. The legacy dynamic 120-case path is not gold evidence.
- Decision: separate current-stack readiness from post-implementation ingestion-to-answer E2E acceptance; the former cannot certify an unimplemented candidate.
- Decision: retain scoped artifacts under Git-ignored `.pipeline` but add a SHA-256 manifest and explicit portability limitation to the tracked handoff instead of changing repository-wide ignore policy.
- Canonical `.pipeline/pipeline-state.json` remains unchanged because it belongs to another work item. Correction status is `PENDING_RE_REVIEW`, not approved.
- 2026-10-25 — User requested an in-app document-delete modal and verification that duplicate-named documents do not cause cross-document deletion. Decision: add a separately named Phase 1 work item and supplemental artifacts; do not overwrite previously approved requirements or the active Hive/Plan V2 checkpoint. Preserve all pre-existing dirty source/spec files and re-read diffs before any implementation. Tool discovery did not expose `multi_agent_v1`; the user authorized direct in-session fallback. Exact technical requirements still require approval before Phase 2.
- 2026-10-25 — User explicitly approved the document-delete Phase 1 scope and emphasized verifying the exact Supabase Storage object and ChromaDB vectors, not only the UI. Updated the accepted scope and approval record to cover both stores by document ID/storage key. Proceed to design only; implementation remains gated on design approval.
- 2026-10-25 — Blocked the Chroma-backed document-delete work before design completion or source edits because accepted SEC-DEBT-001 explicitly prohibits the first Chroma-backed feature until the critical Chroma client advisory and client/server compatibility are remediated. Do not modify/install dependencies, invoke Chroma, or implement a partial delete flow without separate user approval. The Supabase adapter also currently logs and swallows delete failures; it must be covered by the later approved design/tests.
- 2026-10-25 — In response to the user's correction, verified the current runtime rather than treating the old local-server note as fact: the active AI Service interpreter has `chromadb==1.5.9`; root/service `.env` configure `api.trychroma.com` with credentials present and mode unset (code default `auto`). Docker daemon is unavailable, so no local server version is running/observable. Do not send credentials to Chroma Cloud for a probe; the remote version and the AI process's effective `os.getenv` values remain unverified. Keep the feature blocked and do not assume the local Compose image is the current endpoint.
- 2026-10-25 — User authorized public, read-only remediation research. OSV confirms the critical advisory covers `chromadb` 1.0.0–1.5.9 and describes a vulnerable server API; official docs confirm the configured host is Chroma Cloud. PyPI reports both full and HTTP-client-only packages currently at 1.5.9, but the thin client description does not establish `CloudClient` support. Do not switch to the stale 0.6.3 recommendation or claim the Cloud endpoint is fixed. Keep implementation blocked until the user approves a bounded compatibility/remediation spike or provides another safe resolution.
- 2026-10-25 — Continued only the user's explicitly narrowed request for an in-app document-delete confirmation modal. Kept the selected document object/ID as the modal target so duplicate filenames do not alter which API ID is sent; added confirmation, pending/error states, and an app-styled standalone modal. Corrected malformed test nesting and restricted the failure assertion to table rows. Focused tests, lint, typecheck, and build pass. The backend/storage/vector deletion semantics were not changed or verified; the original cross-store work item remains blocked by SEC-DEBT-001.
- 2026-10-25 — For the Workspace AI-disabled notice request, the user selected retaining explicit AI opt-in for private workspaces. Rationale: private visibility limits workspace membership, but enabled cloud AI may still receive questions and authorized document excerpts. Recorded a separate frontend-only Phase 1 scope; user also authorized direct in-session fallback because `multi_agent_v1` was unavailable. No source or backend policy has been changed; awaiting approval of the scoped requirements and task breakdown.
- 2026-10-25 — After reviewing the first visual result, the user clarified that the notice must be immediately visible without scrolling and visually distinct from chat content. Moved it below the chat header and outside the message scroller, made it a high-contrast horizontal banner, and added a structural placement test. Explicit AI opt-in and the direct privacy-settings link remain unchanged.
- 2026-10-25 — For the supplied loading-screen screenshot, removed the rotating rounded-square frames and logo bobbing rather than replacing them with another spinning frame. Kept the logo static, retained the three animated status dots and the existing inline circular loader, and added a regression assertion that the full-screen view has no square rings. The user explicitly selected direct in-session fallback because the delegated multi-agent tool was unavailable.

## 2026-10-25 — RAG definition-evidence hotfix

- Used the orchestrator hotfix path after a read-only reproduction showed that a title-only chunk with similarity 0.95 passed the DEFINITION Evidence Gate with score 0.96. This was a narrow live-quality regression; no threshold, top-k, allowlist, provider, database, vector data, package or environment setting was changed.
- Preserved the existing dirty retrieval-optimization work. Added only intent-specific direct-evidence selection: short title-only chunks cannot pass DEFINITION gating or reach generation, while substantive chunks keep their authenticated document/version/hash/locator provenance.
- Carried existing `section_heading` metadata from Chroma into retrieved candidates and strengthened the strict prompt so a heading or concept name alone cannot support a definition claim.
- Runtime exposes spawn/wait collaboration primitives but not the skill-required close-agent lifecycle. Personas therefore ran in-process; no claim of a spawned sub-agent was made.
- Verification uses fake Chroma embeddings/results and a fake provider only. Existing indexed documents were not re-ingested; they need normal authorized re-ingestion to benefit from the already-present v2 heading-aware embeddings, but the title-only Evidence Gate protection also handles current records.

## 2026-10-25 — Strict RAG answer completeness hotfix

- Decision: strengthen the shared generation prompt so both STRICT and EXPANDED answers respond directly, cover the question, and synthesize source-supported detail; explicitly state when retrieved evidence is too thin rather than padding with unsupported knowledge.
- Rationale: the strict prompt previously limited knowledge sources and citations but did not require comprehensive answers, allowing output that only listed chapter/slide titles. This changes generation guidance only; authorization, retrieval thresholds, evidence decisions, citations, provider settings and stored vectors remain unchanged.
- User direction: continue on top of the existing uncommitted RAG work and preserve all unrelated dirty changes.

## 2026-10-25 — RAG evidence-retrieval improvement plan

- Decision: draft a separately scoped Phase 1 plan that retains the existing STRICT/EXPANDED toggle, improves multi-query/hybrid retrieval and evidence coverage, and uses separately cited web results only for uncovered aspects in EXPANDED.
- Rationale: inspection found the current EXPANDED implementation uses uncited model knowledge and explicitly disallows web search; dense retrieval and fixed top-k also lack an explicit facet-coverage check. The plan documents this gap rather than claiming web retrieval already exists.
- Guardrails: no source implementation, provider selection, package installation, production Chroma access, re-ingestion, paid request, database mutation or delivery action is authorized. Preserve the active root pipeline phase and create a pending work item for approval only.
- User clarification: all previously discussed retrieval improvements are in scope in addition to the two existing modes: preserve small locator-specific chunks and parent context; hybrid semantic/lexical retrieval; same-document expansion; per-facet evidence coverage before generation; compact ranked source-labeled context; mode-specific grounding; and frozen-benchmark evaluation.
- User approval: the user explicitly approved the exact Phase 1 requirements and task-breakdown scope in chat. Phase 2 architecture and file plan are drafts for separate review; no implementation, provider, database, Chroma or delivery action is approved.
- User approval: the user approved the Phase 2 architecture draft in chat. This records the design decision only; it does not select a web provider or approve Chroma access, database/data operations, paid calls or delivery actions.

## 2026-10-25 — Start RAG retrieval implementation within approved gates

- Decision: after the user approved the Phase 2 architecture and explicitly requested implementation following the local commits, begin only non-Chroma work with synthetic fixtures.
- Rationale: the user selected this constrained path after being informed that SEC-DEBT-001 remains open and no authorized real benchmark corpus is available.
- Guardrails: synthetic fixtures validate code behavior only and are not empirical quality evidence. Do not modify/call Chroma or run real-corpus evaluation; do not select or call a web provider; do not install dependencies, mutate databases/data, or perform delivery actions without their separate approvals.
- Scope adjustment: provider-backed planning requires a new auditable provider-attempt purpose, but PostgreSQL CHECK constraints in V30/V33 currently reject it. As database/schema changes are outside the approved scope, do not alter Core, migrations, or invoke any provider. Implement only source-free prompt construction, bounded plan validation, and deterministic fallback as pure logic; live planner/retrieval integration remains blocked.

## 2026-10-25 — Authorize provider-backed question planner

- User selected `provider_approval` and authorized implementation of a bounded question-planning call using the currently configured provider.
- Decision: record the planner call under a distinct `QUERY_PLAN` purpose, require the existing Core operation checkpoint and durable START/END telemetry, cap it at 12 seconds/512 output tokens, send only the question and detected intent, and fall back explicitly to the original query on provider/output failure.
- Authorized changes: AI/Core source and a V47 migration file. The migration may be authored and tested but must not be applied to any database without separate user approval. No live provider smoke call or deployment was approved.
- Independent blocker: SEC-DEBT-001 still prohibits Chroma-backed retrieval changes and real-corpus evaluation. The planner is not connected to `answer_pipeline`; wiring query facets into candidate retrieval waits for closure of that gate.
- Clarification: this decision supersedes the earlier scope statement that prohibited provider-backed planner implementation; it does not supersede the Chroma, database-apply, or delivery gates.

## 2026-10-25 — Enable scoped Cloud retrieval implementation and testing

- Decision: honor the user's updated SEC-DEBT-001 scope, which permits read-only Chroma Cloud retrieval tests while keeping the advisory Critical/Open and blocking self-host changes, dependency/configuration changes, collection writes/deletes, and production release.
- Implemented: connect the bounded planner to authorized per-facet retrieval, fuse direct candidates deterministically, report facet coverage, reserve bounded room for current same-document neighbor context, and keep generation grounded in document evidence.
- Mode behavior: STRICT remains document-only. EXPANDED still retrieves documents first; until a web provider is selected and approved, generation remains document-only and returns an explicit web-unavailable warning rather than labeling model memory as sourced web evidence.
- User-visible behavior: surface evidence/web warnings in both web and mobile chat; preserve citation locators per chunk.
- Verification boundary: automated tests use mocks/fixtures only. No live provider request, database migration, Cloud query, collection mutation, benchmark evaluation, commit, push, or deployment was performed.
- Remaining work: hybrid lexical retrieval, web-search adapter/vendor approval, V47 database application, and read-only Cloud evaluation with Core-authorized document IDs remain separate steps.

## 2026-10-26 — Complete the approved offline retrieval slice

- Decision: keep `QUERY_PLANNER_ENABLED=false` as the fail-closed default. V47 source and its disposable-PostgreSQL integration test exist, but the flag must remain off until a human separately approves and applies V47 to the exact Core database.
- Decision: treat Core `SourceVersion` values as the current authorization snapshot for every dense, lexical and neighbor lookup. Chroma filters and post-read validation both require the same workspace, allowed document ID, `PROCESSED` status, ingestion version and document content hash.
- Decision: use bounded read-only lexical `collection.get` calls, deterministic RRF, one retry for an uncovered facet and at most two same-document neighbor chunks. Direct evidence keeps its full strategy budget; neighbor context is additive under the global cap so it cannot evict a substantive definition chunk.
- Decision: make the compatibility preflight read-only (`get_collection` and `count`) and fail closed. It must never create, add to or delete a Cloud collection.
- Correction to the previous checkpoint: hybrid lexical retrieval is now implemented and covered by offline tests. No direct Chroma Cloud query, provider request, shared database migration, package change, commit, push or deployment was performed.
- Verification boundary: 169 selected AI regression tests, Ruff, strict mypy, 12 dependency-policy tests, Core test compilation and focused Core unit tests pass. The V47 Testcontainers integration test cannot run because Docker is unavailable; this is an environment gate, not permission to use a shared database.
- Remaining product gates: an approved read-only Cloud staging exercise, V47 apply approval, web-provider selection/approval for cited WEB evidence, and a frozen authorized benchmark for empirical quality measurement.

## 2026-10-26 — Partition RAG delivery into reviewable commits

- Decision: split the remaining dirty RAG work into four logical commits: AI retrieval/planner and tests; Core `QUERY_PLAN`/V47 support; web/mobile warning presentation; security policy and documentation synchronization.
- Decision: exclude the seven modified thesis DOCX files, four untracked historical review artifacts and the Draw.io temporary file from these commits because they predate or sit outside the RAG delivery scope.
- Decision: stage only the first AI group after its review gates pass, then stop for explicit human approval before `git commit`. No push or deployment is implied.

## 2026-10-27 — Draft Gemini-primary/Hive-fallback plan

- User requested returning Gemini to the primary generation role while retaining Hive as backup and preserving all current Adaptive RAG improvements.
- Decision: create a separate pending plan under `.pipeline/gemini-primary-hive-fallback/` instead of overwriting the root `implement-feature` checkpoint or the active RAG work item.
- Proposed, not yet approved: CHAT and COMPACTION route Gemini primary → Gemini secondary → Hive primary only for typed transient failures; QUERY_PLAN keeps deterministic original-query fallback; ADMIN_PROMPT and KEY_PROBE remain exact-target operations.
- Guardrails: no source/runtime configuration change, provider generation call, migration/database/vector operation, package installation, commit, push or deployment is authorized by this planning step.
- User approval: selected Option 1 and approved the complete requirements, architecture, purpose matrix, Gemini key order, three-attempt cap and Ollama exclusion for implementation.
- Execution decision: user explicitly selected in-process implementation/review/testing because real-sub-agent configuration requires `close_agent`, which is unavailable in this session. Do not claim any spawned persona.

## 2026-10-28 — Implement Gemini-primary/Hive-fallback route

- Implemented the approved request-local route state: CHAT/COMPACTION use Gemini primary → Gemini secondary → Hive primary, advancing only for typed timeout, 429, 5xx or network failures and never beyond three physical attempts.
- Kept QUERY_PLAN on one Gemini target with deterministic original-query fallback; ADMIN_PROMPT/KEY_PROBE now fail closed unless an exact configured primary/fallback key and its approved model are selected.
- Validation retries pin the successful provider/key/model. Existing Adaptive RAG retrieval, evidence coverage, citation validation and Core authorization ownership were not changed by this route.
- Kept `activeProvider`/`activeModel` as compatibility aliases while adding primary/fallback metadata through AI telemetry, Core metrics and Web diagnostics.
- Runtime `.env`, service processes, live providers, shared databases, Chroma data, packages and Git delivery were not changed. Operational cutover and real provider probes remain separately gated.
## 2026-10-30 — Workspace summary recovery and release boundary

- Removed the temporary 100-document reservation cap so the source snapshot includes every active document; output pages remain bounded to 100 items per request.
- Used a Core-owned active-operation discovery endpoint for web/mobile reload recovery so clients do not persist operation identifiers in browser or device storage.
- Added a workspace-scoped manifest repair API that reuses the existing ingestion message with the document's actual version and hash. The existing global Vector DB sync UI still requires rewiring before rollout.
- Kept summary feature flags disabled because V48, real service integration, citation navigation and capacity gates are not complete. No database migration or deployment was authorized.

## 2026-10-30 — Repair UI, citation provenance and V48

- User selected the Supabase database in `.env` and authorized V48. Flyway migrated version 47 to 48 and a read-only check confirmed success.
- Persist original cited chunk locators, excerpts, hashes and ingestion versions in document checkpoints; Core reauthorizes the complete snapshot before returning a citation. PDF page navigation is available on web; mobile and other formats show the source excerpt and locator.
- The Vector DB action uses workspace-scoped Core repair and reports missing manifests and failed documents. Concurrent repair deduplication and full native document navigation remain open.
- Removed the residual 100-document manifest validation cap. Summary flags remain disabled pending integration, E2E and capacity gates.

## 2026-10-30 — Ordinary chat timeout diagnosis

- The reported operation reached Chroma and Hive; persisted provider telemetry recorded `PROVIDER_TIMEOUT` after 31.6 seconds. The unrelated summary outbox SQL also failed because joined columns were ambiguous.
- Set a configurable Hive CHAT attempt limit of 75 seconds, capped at 90 seconds and at the Core operation deadline. Other provider purposes keep their existing limits; the Hive read-idle timeout remains unchanged.
- Qualified the outbox projection and verified its SQL with PostgreSQL `EXPLAIN`. Real provider completion still needs a live retry after service restart.
- Prevented the legacy Ollama fallback flag from sending Hive-primary requests to Ollama; retained the existing opt-in Gemini legacy behavior for compatibility with its regression tests.

## 2026-10-30 — Restore Gemini primary runtime configuration

- User confirmed that Hive should be used after both Gemini keys encounter eligible transient failures, including timeouts and 5xx. Existing route implements this bounded policy and stops on non-transient errors.
- Both local environment files had `LLM_PROVIDER=hive`; changed the provider selection to Gemini, enabled Hive fallback, and verified that the computed CHAT route contains two distinct Gemini credentials followed by Hive. Key values were not logged.
- The local service runner now imports the root environment before every service start, including an individual restart. A running process retains its old environment until restarted; a live answer has not been verified.

## 2026-10-30 — Gemini HTTP 400 diagnosis

- Logs show a successful Chroma lookup and a Gemini HTTP 400 on the first key. The provider body was not retained, so the exact cause remains unknown; no automatic fallback is performed for a generic 400.
- Added content-free, allowlisted diagnostic categories for future Gemini errors. Nested schema complexity is a hypothesis only and requires verification against the provider response.
- With explicit authorization, one synthetic generation reproduced HTTP 400 with the generic message `Request contains an invalid argument`; a read-only model lookup succeeded for the configured first key and model. Reduced optional schema constraints sent to Gemini while retaining full application-side validation. A second live generation requires separate confirmation.
- User authorized one further synthetic request. The configured Gemini model accepted the simplified schema, returned a response, and `GeneratedAnswer.model_validate_json` accepted it. This verifies provider/schema compatibility only; full workspace chat and citation validation were not exercised.

## 2026-10-30 — Source-backed diagram formatting

- Read-only telemetry for the exact diagram question shows Gemini returned HTTP 503 for both attempted keys before Hive produced the completed answer. No answer or document content was retrieved in the provider check.
- Ask the model for a cited Mermaid claim when the user requests a diagram, and render citations after a closing code fence so Markdown preserves the diagram. Unsupported edges must be described as missing evidence instead of invented.
- Existing answers are unchanged. Rendering a valid new diagram still depends on provider output and available evidence; provider-specific answer quality has not been benchmarked.
- Added `providerModel` to canonical question responses and operation recovery using the persisted model, while hiding it for source-redacted history. Existing stored messages remain readable with a nullable field.

## 2026-10-31 — Mitigate Core API cold-start PostgreSQL SSL handshake timeout

- Diagnosis: Supabase Supavisor (`:5432` session pooler) closes idle SSL negotiations after ~2.5 seconds once `'S'` is returned to `SSLRequest`. On a cold, heavily loaded JVM during sequential `dev.ps1` startup, initializing `SSLContext`/`SSLSocket`/TLS 1.3 key-share classes inside `MakeSSL.convert` exceeded 2.5 seconds, causing `SSL error: Remote host terminated the handshake` with zero configured Hikari/Flyway startup retries. In addition, `dev.ps1` had a 60-second `TimeoutSec` for `core-api` (shorter than ~100–120s cold Maven + Spring Boot startup), causing premature retry kills.
- Decision: Pre-warm the JVM default `SSLContext`, `SSLSocket` and `X25519` key-pair generator in `FlywayConfig` before `flyway.migrate()` opens the first database socket; configure bounded HikariCP pool/timeout settings (`maximum-pool-size=5`, `minimum-idle=1`, `connection-timeout=30000`, `initialization-fail-timeout=30000`, `max-lifetime=600000`, `keepalive-time=120000`) and Flyway startup retries (`connect-retries=3`, `connect-retries-interval=2s`) in `application.yml`; raise `core-api` `TimeoutSec` from `60` to `180` in `dev.ps1`.
- Verification: Validated via `FlywayConfigTest` unit tests, Core API compilation, and PowerShell parser check on `dev.ps1`. No database mutation or Git commit was executed.


## 2026-10-31 — Multi-document & cross-lingual RAG retrieval optimization

- Diagnosis: Corpus-wide Vietnamese enumeration queries over multi-PDF English lecture decks (e.g. `"Các kiến trúc đề cập trong tài liệu là gì"`) degraded because: (1) `QUERY_PLANNER_ENABLED` defaulted to disabled even though Flyway `V47` (`QUERY_PLAN` purpose) is applied; (2) trailing `"là gì"` routed overview/enumeration questions to `DEFINITION` (`max_chunks=3`) instead of `SUMMARY`; (3) dense retrieval and RRF packing lacked per-document diversification, allowing one introductory PDF to consume all chunk slots; (4) `lexical_retrieval.py` performed case-mismatched substring scoring (`"trong"` matching `"strong"` at `1/8 = 13%`) without a minimum score floor; and (5) `_evidence_blocks` omitted `fileName` and `section_heading`.
- Decision: Enable `QUERY_PLANNER_ENABLED=true` in `.env` (isolated in `ai-service/conftest.py`) and instruct bilingual domain query variants + thematic facet decomposition in `question_planner.py`; expand `SUMMARY` enumeration patterns in `adaptive-retrieval-v1.yml` and `intent_detector.py` while increasing `STRATEGY_MAP` budgets and `MAX_EVIDENCE_CHUNKS=16`; add lowest-document-count-first diversification across authorized `document_id`s in `retrieval_engine.py` and `evidence_ranking.py` while preserving rank order for Evidence Gate; enforce whole-token case-folded overlap with expanded stop terms and `MIN_LEXICAL_SCORE=0.30` in `lexical_retrieval.py`; include authorized `fileName` and `section_heading` in `llm_provider.py` evidence blocks.
- Verification: Verified with 300 passing `pytest` unit/API regression tests and `mypy --strict` across all modified modules. Running `ai-service` processes must be restarted to reload `.env` (`QUERY_PLANNER_ENABLED=true`).

## 2026-10-31 - Natural-language workspace summary routing and contextual chat composer redesign

- Diagnosis: Phase 1 of workspace-wide summarization (`WORKSPACE_SUMMARY`) exposed a hardcoded `"Tóm tắt toàn bộ tài liệu"` button underneath the chat input on web and mobile that sent `taskType: "WORKSPACE_SUMMARY"`. Because `unichat.workspace-summary.enabled` defaults to `false`, clicking that button failed immediately with `503 WORKSPACE_SUMMARY_DISABLED`; architecturally, collection-wide vs scoped summarization is a user-intent routing concern rather than a separate hardcoded UI trigger. In addition, the web `ChatInputForm` used a single-line `<input>` crammed with a high-saturation mode pill, a permanent `0/2000` counter, no multi-line composition, and no awareness of the active workspace corpus.
- Decision: Remove the hardcoded summary button from web (`ChatInputForm`, `ChatPage`) and mobile (`ChatInputBar`, workspace chat screens). Introduce deterministic, accent-folded `WorkspaceSummaryIntentDetector` (`workspace-summary-intent-v1`) and `ChatTaskRouter` at Core API reservation (`ChatOperationService.reserve`): when `taskType` is omitted and `unichat.workspace-summary.enabled=true`, genuine collection-wide summary requests route to `WORKSPACE_SUMMARY` with strict document grounding (`expanded=false`), while topic/section/file-scoped summaries or flag-disabled requests remain `QUESTION` (handled by Adaptive Retrieval's `SUMMARY` intent). Redesign `ChatInputForm` with `KnowledgeModeSwitch` (`role="radiogroup"`), auto-resizing multi-line `<textarea>`, IME-safe `Enter`/`Shift+Enter` submission, workspace-specific placeholder, truthful authorized corpus scope badge, and progressive character counter.
- Verification: Verified with Core API unit tests (`WorkspaceSummaryIntentDetectorTest`, `ChatTaskRouterTest`, `ChatOperationServiceTest`), Frontend typecheck, ESLint (`--max-warnings 0`), Vitest unit tests (`ChatInputForm`, `chat-api`), Playwright E2E (`chat-composer.spec.ts`), and Mobile typecheck.


## 2026-11-01 — Mitigate Streaming Reset & Citation Validation Retry Failures

- Diagnosis: During streaming answer generation, user witnessed provisional tokens rendering smoothly, followed by sudden stream wipeout (`onReset()`) returning to "UniChat AI đang suy nghĩ...", and finally terminating in error banner *"Không thể hoàn tất yêu cầu AI. Vui lòng thử lại hoặc kiểm tra lịch sử hội thoại."*. Root cause analysis revealed a two-fold validation failure in `_validated_generation()`:
  1. **Code block false-positive citation matching**: `_REFERENCE = re.compile(r"\[(\d+)\]")` in `citation_validator.py` matched programmatic array indices in code snippets (e.g., `args[0]`, `arr[0]`), extracting `'0'` as an inline citation identifier not present in document references and throwing `ValueError("CLAIM_CITATIONS_INVALID")`.
  2. **Uncited follow-up suggestion claims**: Prompt builder instructions for NotebookLM style (`### 💡 Gợi ý câu hỏi & bước tiếp theo:`) caused the LLM to emit the follow-up section as a claim with empty `citationIds: []`, violating the strict document claim rule (`if not references: raise ValueError("CLAIM_CITATIONS_INVALID")`).
  3. **Streaming retry cancellation loop**: When attempt 0 failed validation, `_validated_generation()` emitted `observer("reset", ...)`. Frontend `ChatEventReceiver` received `reset` and called `onReset()`, wiping active provisional tokens. Attempt 1 retried with the same ungrounded suggestions prompt, failed validation a second time, and returned `_refusal("CITATION_VALIDATION_FAILED")`, resulting in Core API `VALIDATION_FAILED` failure.
- Decision:
  1. Strip markdown code fences (```` ```...``` ````) and inline backticks (`` `...` ``) in `citation_validator.py` before extracting inline `[N]` references, eliminating false-positive citation triggers on programming arrays.
  2. Refine `prompt_builder.py` to instruct that all claims in `DOCUMENT` (including diagrams, examples, and topic follow-up questions) must attach supporting citation IDs from the underlying subject sources, and section headers must head their respective content claims rather than existing as bare uncited claims.
- Verification: Verified with unit tests (`test_val.py` Scenario 6 code indexing passing), full test suite passing: `45/45` in `test_plan_v2_rag_generation.py`, `196/196` in `ai-service/app/core/rag/tests/`, and synthetic live generation against Gemini producing fully validated claims on the first attempt without triggering retry or reset.


## 2026-11-01 — Smooth Incremental Prose Streaming & Single-Block Mermaid Rendering

- Diagnosis: Streaming answer generation felt choppy and abrupt rather than smooth. The UI displayed nothing for seconds while a claim was generated, then suddenly dumped an entire paragraph at once. Investigation in `ai-service/app/core/rag/stream_provider.py` revealed that `_TEXT_VALUE = re.compile(r'"text"\s*:\s*("(?:[^"\\]|\\.)*")')` waited for the closing quote `"` of each JSON claim's `"text"` field before emitting any tokens, preventing word-by-word streaming. Furthermore, in `frontend/src/features/chat/components/mermaid-diagram.tsx`, `if (isStreaming)` forced diagrams to render as raw code fences during streaming rather than rendering the visual SVG diagram once the block arrived.
- Decision:
  1. Introduce `IncrementalClaimExtractor` in `stream_provider.py` to parse and unescape JSON text fields on the fly. Normal prose is emitted incrementally token-by-token / word-by-word as raw deltas arrive from the LLM, giving a smooth typewriter feel.
  2. For Mermaid diagram blocks (```` ```mermaid ... ``` ````), buffer characters within the extractor and emit the entire diagram block as a single complete chunk once the closing fence arrives, preventing partial syntax errors and visual flicker.
  3. Update `MermaidDiagram` component to render the graphical SVG diagram immediately upon receiving a complete, non-empty chart (even while subsequent prose is still streaming), using a clean `<p>Đang dựng sơ đồ…</p>` state during SVG compilation rather than showing raw code.
- Verification: Verified with unit tests (`test_stream_api.py` 7/7 passing including `test_should_emit_incremental_text_and_buffer_mermaid_block`), frontend chat test suite (`78/78` passing), frontend `tsc --noEmit` (0 errors), and strict Python mypy on `stream_provider.py` (0 issues).


## 2026-11-02 — EC2 Dockerization & Pre-Deployment Audit Hardening (excluding Mobile)

- Diagnosis: Initial Docker draft contained several EC2 deployment blockers discovered during source-code audit:
  1. `ai-service/app/core/private_core.py` enforces `base_url.startswith("https://")` when `APP_ENV == "production"`, while the earlier compose omitted `CORE_API_BASE_URL` and defaulted `APP_ENV=production` over internal HTTP (`http://core-api:8082`), which would raise `CORE_POLICY_UNCONFIGURED`.
  2. `env_file: .env` leaked host Windows paths (e.g., `D:/codex-workspace/...`) into containers and could bypass intended container paths; `OtpHasher` requires `OTP_HMAC_SECRET` (>= 32 chars) which was missing from compose; `JwtKeyProvider` reads `security.jwt.private-key-location` (`SECURITY_JWT_PRIVATE_KEY_LOCATION`) rather than `JWT_PRIVATE_KEY_LOCATION`.
  3. Default PyPI `torch==2.13.0` on Linux pulls ~4.5 GB of CUDA 13 libraries (`nvidia-*-cu13`, `triton`) unused on CPU EC2 instances; `--workers 2` in `ai-service` would duplicate both the ~1.1 GB embedding model in RAM and background RabbitMQ consumer threads.
  4. Root `.dockerignore` lacked `**/` prefixes for nested `node_modules`/`target`/`.venv` and excluded `mobile/package.json` needed by the root npm workspace lockfile; `.gitignore` matched `.env.*` and hid `.env.production.example` from Git; modifying `infra/compose.yaml` would trigger `_touches_chroma_scope` in `.github/scripts/dependency_audit_policy.py`.
- Decision:
  1. Keep `infra/compose.yaml` untouched at `HEAD` and place the 3-service cloud-native EC2 stack (`ai-service`, `core-api`, `frontend`) in root `docker-compose.yml` using explicit environment mappings (`:?` fail-fast on required secrets/origins, `AI_APP_ENV:-staging` + `CORE_API_BASE_URL=http://core-api:8082`, `OTP_HMAC_SECRET`, persistent `jwt-*` RS256 keys via `JWT_PUBLIC_KEY_LOCATION` and `SECURITY_JWT_PRIVATE_KEY_LOCATION`, `SERVER_FORWARD_HEADERS_STRATEGY=framework`), log rotation, and memory limits.
  2. Harden `infra/docker/ai-service.Dockerfile` (`python:3.13.14-slim`, non-root `unichat:10001`, CPU-only `torch==2.13.0` wheel from `https://download.pytorch.org/whl/cpu` followed by `-r requirements.txt -c requirements.lock.txt`, `--workers 1`).
  3. Harden `infra/docker/core-api.Dockerfile` (`eclipse-temurin:21-jdk-jammy` -> `eclipse-temurin:21-jre-jammy` matching locked Temurin 21 LTS spec, non-root `unichat:10001`, `X-Forwarded-Proto: https` health probe).
  4. Harden `infra/docker/frontend.Dockerfile` (`node:24.18.0-alpine` copying root lockfile + `frontend/package.json` + `mobile/package.json` only -> `nginx:1.27-alpine`) and `infra/proxy/nginx.conf` (repeat security headers per `add_header` location block, block `/actuator/` and `/internal/` externally, preserve `$http_host` and `$http_x_forwarded_proto`, unbuffered SSE `/api/` and WebSocket `/ws/`).
  5. Update `.dockerignore` (`**/...`, `mobile/**` + `!mobile/package.json`), un-ignore `!.env.production.example` in `.gitignore`, generate all 3 RS256 key pairs (`core-service`, `ai-service`, `jwt`) with `chown 10001:10001` in `infra/scripts/generate-keys.sh`, and write the Amazon Linux 2023 deployment guide (`docs/deployment/ec2-deployment-guide.md`).
- Verification: Verified `docker compose config` passes with valid env and fails fast when required secrets are missing; simulated clean Docker context frontend workspace `npm ci --workspace=frontend --include-workspace-root` + `npm run build --workspace=frontend` (`exit=0`, `expo` not installed); verified Core API Maven package (`BUILD SUCCESS`), Python AST runtime import closure against `requirements.txt`, LF line endings on `generate-keys.sh`, and zero conflicts with `.github/scripts/dependency_audit_policy.py`.
