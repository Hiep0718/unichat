# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning after the first tagged release.

## [Unreleased]

### Fixed

- The mobile Tệp screen reported every finished file as still waiting: its badge matched a `'COMPLETED'` status the Core API has never sent — it sends `PROCESSED` — so each ready document fell through to the default branch and read "Đang chờ". The `DocumentItem` type declared that phantom value too, and a test fixture had encoded it; both now carry the seven statuses the server actually sends. Correcting the type is what surfaced both call sites.
- Choosing a letter-avatar colour could never be stored: JPA wrote the enum's own name (`NAVY`) while `chk_users_avatar_color` from migration V24 admits only the lowercase keys, so every attempt failed the check constraint and the avatars fell back to the colour derived from the name everywhere. The column mapping now writes the form the column accepts; no migration and no data to rewrite, because the constraint had refused every uppercase value. Nothing in the test suite had covered the path.
- The group's member list reports `displayName`, `hasAvatar` and `avatarColor`, so the Thành viên tab draws a member's real picture instead of always a letter; the already-loaded user rows mean this costs no further query. `invitedById` is typed nullable on the client, matching what the Core API sends.
- The group's post list reports which posts the assistant has answered (`hasAiAnswer`), and a workspace reports its total post count (`postCount`) alongside the existing one-week count; a tab badge drawn from the weekly count read 0 for any group that had simply been quiet. Both are batched one query per page.
- Removed two fields the web client's `DiscussionResponse` type declared but the Core API never sends. One of them, `isBookmarked`, is read by the post detail page's "Lưu" button, which therefore cannot reflect the real state; the field is now typed as optional so the gap is visible rather than implied.
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

- The mobile group screen was rebuilt to its mockup: a cover band carrying the group's name, counts, a back button and an overflow menu, a full-width way into the assistant, and four tabs — Bài viết, Tệp, Thành viên, Giới thiệu — that all stay inside the screen. It previously showed a statistics card and three cards linking out, so Tệp lived on a separate screen and Thành viên and Giới thiệu did not exist on mobile at all. Lịch sử hội thoại and deleting the group moved into the overflow menu, where leaving is what a menu is for.
- The mobile app reads a group's members and its posts, which it previously could not: both endpoints were missing from its API layer. The posts tab reuses the same card the global feed draws, which now also marks a pinned post and says when the group's assistant has answered.
- The group's Tệp tab was rebuilt to its mockup: the heading now says how many of the files the assistant can actually read, the upload area states what it takes in a sentence, and each row carries the file's kind beside its name, its size, and its state in product language — "Sẵn sàng cho AI" and "Đang xử lý" rather than "Vector DB Ready" and "Tách Vector...". Rows whose name another file shares say so, since nothing else told them apart. Paging appears only when there is more than one page.
- The group's Thành viên tab became a list of members with their pictures, their role named in Vietnamese and the viewer's own row marked, replacing a table that printed `OWNER`/`VIEWER` and reported failures through `alert()`.
- The group's Giới thiệu tab follows its mockup: the assistant card is the page's inverse rather than a pale tint, its "RAG" badge is gone, and an empty description now invites the owner to write the first one instead of only stating that there is none.
- The group page was rebuilt to its mockup: a taller cover band, counts beside the Bài viết, Tệp and Thành viên tabs, and a right-hand rail carrying the group's assistant and its members. The Bài viết tab now puts search and "Tạo bài viết" on one row, offers the post kinds as chips and the two orderings as one Mới|Nổi bật control, and marks the posts the group's assistant has already answered.
- The mobile Workspace tab's greeting band carries new artwork, and the navigator header above it ("Không gian làm việc") is hidden for that tab: the band already states the brand, the date and the greeting, and it is drawn to sit under the status bar. The floating bottom tab bar is unchanged.
- The mobile Account tab was rebuilt to its mockup: a dark header band carrying the screen title, then Profile, Appearance and Security cards. The profile card now edits the display name, uploads or removes the avatar picture and picks one of the six letter-avatar colours the Core API accepts, reaching the same endpoints the web settings page does. The floating bottom tab bar is unchanged; the navigator header is hidden for this tab only, because the band carries the title itself. The dark theme option is shown but says plainly that it is not available yet, since the mobile app has no dark palette.
- Workspace cards now show a photograph of what the group is about, one per topic in the Core API vocabulary, instead of an abstract picture dealt from the group id; groups with no topic keep the abstract set.
- The mobile app reads a workspace's topics, which it previously ignored, so a group looks the same on a phone as it does in the browser.
- Upgraded the mobile app to Expo SDK 58 (React Native 0.88.1, React 19.3.0) so it opens in the current Expo Go on iOS, where Apple serves only the latest build; see ADR-0006.
- Pinned a single `react-native` resolution for the workspace, ending a duplicate 0.86.3/0.88.1 tree that made third-party component types disagree with application code.
- Aligned the monorepo on React 19.3.0, the version Expo SDK 58 pins, moving the web frontend up from 19.2.7; a split React/React DOM resolution was breaking the web app at startup.
- Declared the ESLint toolchain in the mobile workspace, which previously relied on the frontend's copies being hoisted to the repository root.
- Migrated the mobile test suite to the asynchronous React Native Testing Library v14 API, and the tab bar to expo-router 58's `emitter`/`navigateToTab` props.
- Kept the canonical readiness status at `NOT READY` until two-machine evidence is merged.
- Aligned the JWT public-key example with `JWT_PUBLIC_KEY_LOCATION` and removed speculative JWT/refresh-token variables from the active environment contract.
- Hardened the Windows Maven Wrapper path handling for non-symlink Maven homes.
- Clarified reviewed manifest/lockfile usage per ecosystem and cross-review ownership.
- Reorganized all seven thesis document groups under `docs/thesis` without changing their group names.
- Published durable product specifications under `docs/specifications` and current security debt under `docs/security`.
- Moved backups, generated thesis HTML, archived documents and AI-local temporary artifacts into the Git-ignored `.local-archive` area without permanent deletion.
- Kept the product `.pipeline` unchanged and local-only; repository-reorganization evidence uses a separate ignored artifact area.

### Added

- Group conversations in Work Chat: a group of up to fifty people, named, with an owner who adds and removes members and hands the group on when they leave. Everyone added must be someone you could already message one-to-one, so a group cannot become a way around that rule. Read state became a per-person watermark, so a
  conversation reports an unread count rather than a flag on each message (ADR-023).
- Files in Work Chat: a message may carry up to five images or documents (PNG, JPEG, WebP, GIF, PDF, DOCX, TXT) totalling 20 MiB, sent together with its text in one request. Images render inline in the bubble; everything else is a download. Chat files stay private to the conversation and never enter a workspace's document library (ADR-022).
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
