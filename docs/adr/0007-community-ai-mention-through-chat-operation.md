# ADR-0007 — Community @AI Answers Run as Chat Operations

## Status
Accepted

## Context
Mentioning `@AI` in a post's comment never produced an answer. The 2026-11-15 business review (`docs/reports/bao-cao-ra-soat-nghiep-vu-workspace-cong-dong-ai-chat-2026-11-15.md`, findings A1–A4) traced it to a second, older path to the AI Service that the security hardening of the AI assistant had left behind:

- `AiRetrievalClient` signed its service token with the deprecated, parameterless `ServiceTokenIssuer.issueToken()`. That token is bound to the placeholder path `/unsupported-legacy-binding` and no `X-Request-ID` header was sent, so the AI Service's `_check_binding` answered every request with 401. The client caught the error and returned an empty map, and the thread received "Trợ lý chưa trả lời được lúc này…" every time.
- Even with a valid token, the request body lacked `cloudAllowed`, `operationId`, `permissionVersion` and `sources`, so `_policy_refusal` would refuse with "Chưa có chính sách xử lý AI hợp lệ."
- The path ignored the group's cloud-AI policy, had no admission control or rate limit, and did not re-check authorization after the AI call, contrary to the engineering standards.

The AI Service calls back into Core at `/internal/v1/chat-operations/{id}/checkpoint` before every model call. An answer therefore needs a durable `chat_operations` row in state `RUNNING`, and that table requires `conversation_id`, `user_message_id`, `session_id` and `security_version`.

## Decision
1. An `@AI` mention is answered by the existing chat operation pipeline: `ChatOperationService.reserve` followed by `ChatOperationRunner.start`, non-streaming, with the asker's `ChatActor` (user, session, security version) captured from the JWT when the comment was posted.
2. The asking comment's id is the idempotency key and `ai-mention-<commentId>` is the request id, so a redelivered event never charges or asks twice.
3. `AiReplyWriter` posts the result as the assistant account under the asking comment. Before writing, it checks again that the post still exists in the same group, that the asking comment is still there and that the asker is still an active member. If any of these changed, it posts nothing.
4. Anything other than an answer still reaches the thread: a refusal from the pipeline is posted as-is, and a failed operation or a rejected reservation is posted as a notice starting with "Trợ lý chưa trả lời được", which the web renders as a status line.
5. One rule decides what counts as a mention on server, web and mobile: `@AI` must stand alone, so `x@ai.edu.vn` and `@aiden` do not call the assistant.
6. No schema change. Each mention reserves a new conversation for the asker, titled with the question.

## Reason
- Reusing the pipeline is the only way to satisfy every AI Service contract (request-bound token, policy fields, durable checkpoint) without duplicating the logic that already enforces them. It also brings session revocation, `cloudAllowed`, admission, the per-user rate limit (`chat.ask`, 20 per minute; at most two running), checkpoints during inference and the fingerprint re-check at completion for free.
- The alternative that keeps the assistant history clean, a new operation kind that does not need a conversation, needs a migration on the shared database. The standards forbid mutating the database without explicit authorization, so it stays an open option rather than part of this fix.

## Consequences
- Every `@AI` mention appears as a conversation in the asker's own Trợ lý AI history, with the question as its title and the answer as its reply. Nobody else sees it. Moving mentions to their own operation kind later would need a migration and a filter in the conversation list.
- A mention counts against the asker's AI quota and concurrency limit exactly like a question typed into the assistant. When the limit is hit, the thread shows the pipeline's reason after the "Trợ lý chưa trả lời được" prefix.
- An answer can take up to the operation deadline of 240 seconds. The web now waits that long, checking every 2 s for the first minute and then every 5 s; mobile waits 240 s.
- Attachment summaries had the same defect. ADR-0008 moves them onto the same pipeline with a single-document scope, and `AiRetrievalClient` is deleted.
