# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning after the first tagged release.

## [Unreleased]

### Fixed

- Updated Hive generation defaults to the official CDN V3 endpoint and the approved DeepSeek V4.1 Flash `-1017` model identifier.
- Aligned Hive DeepSeek requests with `max_completion_tokens` and added actionable client messages for incompatible requests and paused/underfunded organizations.
- Preserved actual generation model attribution through private RAG responses and distinguished provider transport failures from completed evidence refusals.
- Propagated private stream cancellation through compaction and generation without cancelling durable operations on a public subscriber disconnect.
- Reconnected AI chat messages, processing steps, answer content and action buttons to their existing styles; restored the message avatars and responsive action layout.
- Unified full-screen session, lazy-route and workspace loading into one persistent indicator so phase transitions update the message without restarting the loading animation.
- Reconnected the AI chat composer and admin controls/tables to their component styles so they no longer render as browser-default form elements.
- Mobile development now rejects incomplete API origins and derives the Core API host from Expo's reachable host when no valid URL is configured; the web session-verification state now has a branded responsive loading screen.
- Added a forward migration to restore a missing nullable `direct_messages.read_at` column and resolve Core API startup schema validation failures while preserving existing read receipts.

### Changed

- Kept the canonical readiness status at `NOT READY` until two-machine evidence is merged.
- Aligned the JWT public-key example with `JWT_PUBLIC_KEY_LOCATION` and removed speculative JWT/refresh-token variables from the active environment contract.
- Hardened the Windows Maven Wrapper path handling for non-symlink Maven homes.
- Clarified reviewed manifest/lockfile usage per ecosystem and cross-review ownership.
- Reorganized all seven thesis document groups under `docs/thesis` without changing their group names.
- Published durable product specifications under `docs/specifications` and current security debt under `docs/security`.
- Moved backups, generated thesis HTML, archived documents and AI-local temporary artifacts into the Git-ignored `.local-archive` area without permanent deletion.
- Kept the product `.pipeline` unchanged and local-only; repository-reorganization evidence uses a separate ignored artifact area.

### Added

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
