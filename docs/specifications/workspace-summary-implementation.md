# Workspace-wide Hierarchical Summary

## Implemented behavior

- `taskType=WORKSPACE_SUMMARY` reserves an asynchronous operation for every active document in the workspace. The source set is paginated during reservation and verified again before completion and result reads.
- Core requires authorization, `PROCESSED` status and a valid ingestion manifest for each document. Legacy documents can be queued for re-ingestion through `POST /api/v1/workspaces/{workspaceId}/documents/repair-manifests` by an editor or owner.
- AI reads exact Chroma chunk IDs and validates workspace, document, ingestion version, content hash, chunk order/count and indexed character count. It maps every chunk and recursively reduces every document and the workspace.
- Core stores per-document checkpoints, verifies them against the final payload and commits one canonical artifact, assistant message and completed operation atomically. A source or permission change rejects finalization.
- RabbitMQ delivery has a transactional outbox, bounded retry queues, dead-letter queue and a Core-validated heartbeat. Duplicate deliveries cannot create a second artifact.
- Web and mobile submit user questions naturally without a dedicated summary button: when `taskType` is omitted, Core's `ChatTaskRouter` and `WorkspaceSummaryIntentDetector` route un-negated collection-wide summary prompts to `WORKSPACE_SUMMARY` (when `unichat.workspace-summary.enabled=true`) and keep scoped/topic summaries or flag-disabled requests on Adaptive Retrieval (`QUESTION`). Clients handle `202` responses transparently, show count-based progress, discover an active operation after reload and load per-document result pages. Citation reads reauthorize the complete source snapshot and resolve original chunk metadata from the canonical artifact. Web opens PDF citations at the recorded page; mobile displays the original excerpt and locator.
- The workspace Vector DB action queues missing manifests through Core ingestion and reports outstanding manifests and failed documents.
- `GET /api/v1/workspaces/{workspaceId}/documents/manifest-status` returns `missingManifests` and `failedDocuments` to authorized editors. `GET /api/v1/workspaces/{workspaceId}/workspace-summaries/{summaryId}` returns the current overview; `GET /api/v1/workspaces/{workspaceId}/workspace-summaries/{summaryId}/citations/{chunkId}` returns the authorized document name, locator, excerpt, chunk hash and ingestion version.
- The summary feature flags remain disabled by default. Phase 2 natural-language fallback and exact cache are not enabled.

## Release gates still open

- V48 was applied to the Supabase database selected by the user on 2026-10-30; Flyway recorded version 48 as successful. No re-ingestion was triggered by the migration itself.
- Mobile displays the verified excerpt and locator but does not yet open the original PDF at its cited page. DOCX and TXT citations display the excerpt and locator rather than navigating inside the original file.
- Repair requests are not deduplicated across concurrent clients and have no durable per-request job status; repeated requests can enqueue the same document. A failed document requires separate remediation.
- Core/AI integration tests with PostgreSQL, RabbitMQ and Chroma, web/mobile E2E, and 1/10/50/100/max-workspace capacity benchmarks remain unrun. Production concurrency, input budget and runtime values must be set from those results.
- Provider token accounting still uses a conservative character bound; a model-specific context-window gate has not been proven against live provider routing.
- The feature flag must stay off until these gates pass and deployment is approved.

## Verification on 2026-10-30

- Flyway read-only verification returned version 48 with `success=true` for the selected Supabase database.
- Focused Core tests covered repair authorization, checkpoint integrity, source provenance and a 101-document snapshot. AI summary tests covered source locator extraction. Web tests covered repair submission, citation authorization failure and PDF page navigation; web/mobile typecheck and lint passed.
- These checks do not establish live ingestion, mobile PDF navigation, end-to-end operation recovery or production capacity.
