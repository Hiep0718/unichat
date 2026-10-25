# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning after the first tagged release.

## [Unreleased]

### Fixed

- Improved document-only RAG answers to address every part of the question with source-supported explanations instead of returning only chapter or slide titles; insufficient source detail is stated explicitly without external-knowledge fallback.
- Prevented high-similarity title-only chunks from passing definition Evidence Gate or appearing as supporting citations; definition answers now receive only substantive retrieved evidence.
- Updated Hive generation defaults to the official CDN V3 endpoint and the approved DeepSeek V4.1 Flash `-1017` model identifier.
- Aligned Hive DeepSeek requests with `max_completion_tokens` and added actionable client messages for incompatible requests and paused/underfunded organizations.
- Preserved actual generation model attribution through private RAG responses and distinguished provider transport failures from completed evidence refusals.
- Propagated private stream cancellation through compaction and generation without cancelling durable operations on a public subscriber disconnect.
- Reconnected AI chat messages, processing steps, answer content and action buttons to their existing styles; restored the message avatars and responsive action layout.
- Unified full-screen session, lazy-route and workspace loading into one persistent indicator so phase transitions update the message without restarting the loading animation.
- Simplified the full-screen loading screen by removing rotating square frames and logo bobbing while preserving the static brand mark and loading dots.
- Reconnected the AI chat composer and admin controls/tables to their component styles so they no longer render as browser-default form elements.
- Mobile development now rejects incomplete API origins and derives the Core API host from Expo's reachable host when no valid URL is configured; the web session-verification state now has a branded responsive loading screen.
- Added V46 to restore the nullable `direct_messages.read_at` column after V45 removed it, resolving Core API schema validation failures without defaults, backfills, or read-receipt loss.

### Changed

- Made the disabled-AI workspace notice a persistent, high-contrast banner below the chat header, with an owner link directly to AI & privacy settings and an explanation of cloud data processing.
- Kept the canonical readiness status at `NOT READY` until two-machine evidence is merged.
- Aligned the JWT public-key example with `JWT_PUBLIC_KEY_LOCATION` and removed speculative JWT/refresh-token variables from the active environment contract.
- Hardened the Windows Maven Wrapper path handling for non-symlink Maven homes.
- Clarified reviewed manifest/lockfile usage per ecosystem and cross-review ownership.
- Reorganized all seven thesis document groups under `docs/thesis` without changing their group names.
- Published durable product specifications under `docs/specifications` and current security debt under `docs/security`.
- Moved backups, generated thesis HTML, archived documents and AI-local temporary artifacts into the Git-ignored `.local-archive` area without permanent deletion.
- Kept the product `.pipeline` unchanged and local-only; repository-reorganization evidence uses a separate ignored artifact area.

### Added

- Added bounded contextual retrieval for explicit follow-up questions while preserving the original question for generation and applying the same authorized-document filter.
- Added lossless, locator-homogeneous text chunks with versioned metadata and heading-aware embeddings that keep cited source text unchanged.
- Made configured Chroma connection/query failures return operational errors instead of silently producing empty evidence through an ephemeral fallback.
- Made evaluation draft generation fail explicitly when its Chroma corpus is unavailable instead of producing cases from empty evidence.
- Hive DeepSeek generation adapter using the existing HTTPX dependency, bounded SSE parsing, explicit provider configuration and manual Gemini rollback.
- PostgreSQL-backed AI admission states and ADMIN controls for draining active requests before provider cutover; prepared V40 migration requires separate application approval.
- Provider-aware diagnostics, nullable token usage, friendly Hive/maintenance errors and a controlled generation key probe.
- MIT License naming Nguyễn Thanh Hiệp and Hoàng Phi Hùng as copyright holders.
- Contribution workflow for the two-person cross-review model.
- Required dependency audit policy with an explicit scoped `SEC-DEBT-001` exception.
- Approved monorepo scaffold plan for React, Spring Boot and FastAPI.
- Code quality, security, test and CI foundations.
- Phase 2 design and TASK-013 approval checkpoint.
- Core API request ID filter, typed errors and RFC 7807 global error boundary.
- Core API MVC tests for validation, authorization, request ID and safe internal errors.

### Security

- Environment-only secrets and private AI/data service boundaries.
- Structured error logs retain request context and sanitized stack traces without exception messages.
- ChromaDB Critical finding remains deferred as SEC-DEBT-001 and blocks Chroma-backed work or deployment.
