# ADR-0008 — Attachment Summaries Are Produced When a Member Asks

## Status
Accepted

## Context
A document attached to a post was summarised automatically: `AttachmentSummaryService` listened for `DocumentProcessedEvent` and called the AI Service through `AiRetrievalClient`, restricting `allowedDocumentIds` to that one document. Like `@AI` before ADR-0007, the call always failed: the deprecated service token was rejected with 401 and the request lacked the policy fields, so every attachment ended at "Chưa tạo được tóm tắt".

ADR-0007 fixed `@AI` by running it as the asker's chat operation. That cannot be applied as-is here. The AI Service calls back to `/internal/v1/chat-operations/{id}/checkpoint` before every model call, and Core answers by checking that the operation's actor still has an active session (`SessionStateService.isActive`), is still an active member, and that the workspace still allows cloud AI. When a document finishes processing, no user session is involved, so there is no actor to authorize the call.

The options presented to the user were:
1. Produce the summary when a member asks for it, as that member's chat operation.
2. Keep it automatic on behalf of the uploader, storing their session id and security version with the attachment. This needs a migration, and fails once they log out.
3. Introduce a system actor exempt from session checks. This changes the security model in which every AI call is tied to a user session.

The user chose option 1.

## Decision
1. `POST /api/v1/workspaces/{workspaceId}/discussions/{discussionId}/attachments/{attachmentId}/summary` asks for a summary. It answers `202` with state `PENDING` while the summary is produced, or `200` with the existing summary when the attachment already has one. `GET` on the same path reads the current state for a member waiting on it.
2. The summary runs as the asking member's chat operation (`ChatOperationService.reserve` and `ChatOperationRunner.start`, non-streaming), with a new optional `documentScope`. `ChatSourceSnapshot.scopedTo` narrows the authorized sources to that one document and keeps the workspace fingerprint, so checkpoints and completion still compare against the current workspace and stop on any revocation or new version.
3. Only a real answer (`decision = ANSWER`) is stored, as `READY`. A refusal or a failed operation is stored as `UNAVAILABLE`, and the member may ask again. If the post or attachment is gone when the result arrives, nothing is stored.
4. Refusals before anything starts are returned to the caller as the usual RFC 7807 problem, and the attachment is left unchanged. These cover a non-member, an image, a document still waiting for approval, a document not processed yet (`SOURCE_UNAVAILABLE`), a busy member or an exhausted rate limit.
5. The automatic listener and `AiRetrievalClient` are removed. `DocumentProcessedEvent` is still published, but no listener uses it anymore.
6. No schema change. `PENDING` now means "no summary yet, or one is being produced".

## Reason
- Option 1 is the only one that satisfies the AI Service contracts and the rule that Core authorizes every AI call against a user's current session, without a migration or a new trust exemption.
- Narrowing the snapshot, rather than adding a separate scope field, means the AI Service receives exactly one source in `sources` and `allowedDocumentIds`. Its own check that those two sets match then holds, citations are validated against that document alone, and `chat_source_dependencies` records exactly the document the summary depends on.

## Consequences
- Summaries no longer appear by themselves. On the post's page, a document shows "Tóm tắt bằng AI", or "Thử tóm tắt lại" after a failed attempt. The web checks back every 3 s for up to 240 s, the operation's deadline.
- The summary counts against the asking member's AI quota and appears as a conversation in their own Trợ lý AI history, like `@AI` (ADR-0007).
- Two members asking at the same moment produce two operations; the last result to arrive is the one stored.
- Summaries already stored as `READY` are kept. Attachments left `UNAVAILABLE` by the old automatic path show the retry button.
- Mobile does not display attachment summaries, so nothing changes there.
