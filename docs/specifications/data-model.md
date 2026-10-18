# Mô hình dữ liệu P0 — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-006 |
| Version | 1.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Database | PostgreSQL 18.4 |

## 1. Quy ước

- Primary key dùng UUID v7 do ứng dụng sinh.
- Thời gian dùng TIMESTAMPTZ UTC với createdAt, updatedAt khi phù hợp.
- Bảng mutable có version để optimistic locking.
- Enum lưu dạng VARCHAR có CHECK constraint; migration không phụ thuộc enum type của PostgreSQL.
- Nội dung dài dùng TEXT; metadata linh hoạt có schema dùng JSONB.
- Foreign key có hành vi xóa tường minh; không cascade nội dung nhạy cảm ngoài delete saga.
- Mọi truy vấn chứa dữ liệu Workspace phải có workspaceId trong điều kiện.

## 2. Bảng và ràng buộc chính

| Bảng | Trường chính | Ràng buộc/nghiệp vụ |
|---|---|---|
| users | id, email, passwordHash, systemRole, status, failedLoginCount, lockedUntil | email chuẩn hóa unique; role USER/ADMIN; status ACTIVE/LOCKED |
| refresh_tokens | id, userId, familyId, tokenHash, expiresAt, usedAt, revokedAt, replacedById | tokenHash unique; không lưu token thô; rotation theo family |
| workspaces | id, ownerId, name, description, visibility, cloudAllowed, permissionVersion, version | name 3–100; PRIVATE/SHARED/PUBLIC (ngữ nghĩa ở ADR-024); owner luôn có membership OWNER; workspace PRIVATE chỉ có đúng một membership ACTIVE |
| workspace_members | workspaceId, userId, role, status, invitedById | PK(workspaceId,userId); role OWNER/EDITOR/VIEWER; status ACTIVE/REVOKED |
| workspace_invites | id, workspaceId, tokenHash, role, createdById, createdAt, expiresAt, maxUses, usedCount, revokedAt | tokenHash SHA-256 unique, **không lưu token thô**; role CHECK chỉ VIEWER/EDITOR; usedCount tăng ở accept chứ không ở preview (ADR-025) |
| workspace_topics | workspaceId, topic | PK(workspaceId,topic); tối đa 3 chủ đề mỗi workspace, ràng buộc ở tầng ứng dụng; giá trị từ enum WorkspaceTopic, không CHECK ở DB (ADR-027) |
| documents | id, workspaceId, storageKey, originalName, mediaType, byteSize, sha256, status, ingestionVersion, pageOrBlockCount, version | storageKey unique; status PENDING/PROCESSING/PROCESSED/FAILED/DELETING |
| conversations | id, workspaceId, userId, title, status, summary, summaryVersion | user chỉ truy cập conversation của mình và Workspace còn quyền; summary cập nhật qua optimistic locking trên summaryVersion (ADR-021) |
| messages | id, conversationId, role, content, intent, refusalCode, providerModel, promptVersion, createdAt | role USER/ASSISTANT; content giữ Unicode; assistant có trace |
| citation_history | id, messageId, documentId, chunkId, fileName, locatorType, locatorValue, excerpt, contentHash, ordinal, redactedAt | unique(messageId,ordinal); excerpt được redact khi xóa tài liệu |
| retrieval_traces | id, messageId, requestId, strategyVersion, ruleId, intent, confidence, evidenceScore, decision, provider, latencyMs, promptTokens, configHash | requestId unique; decision ANSWER/CLARIFY/REFUSE |
| retrieval_trace_items | id, traceId, documentId, chunkId, rank, similarity, sourceGroup, locatorValue, contentHash | unique(traceId,rank); không lưu toàn văn chunk |
| evaluation_cases | id, datasetVersion, split, intent, question, workspaceId, expectedDocumentId, expectedLocator, expectedAnswerNotes, evidenceLabel, topicGroup | split DEVELOPMENT/HOLDOUT; question không sửa sau freeze |
| evaluation_runs | id, datasetVersion, corpusSnapshot, branch, providerModel, embeddingRevision, strategyVersion, promptVersion, configHash, status, startedAt, finishedAt | branch BASELINE/ADAPTIVE; configHash bắt buộc |
| evaluation_results | id, runId, caseId, predictedIntent, decision, sourceHit, reciprocalRank, citationCorrect, locatorCorrect, claimSupport, answerScore, latencyMs, promptTokens, notes | unique(runId,caseId); score/rate có CHECK range |
| idempotency_records | actorId, routeKey, idempotencyKey, requestHash, responseStatus, responseBody, expiresAt | PK(actorId,routeKey,idempotencyKey); body khác trả 409 |
| rate_limit_buckets | subjectKey, actionKey, windowStart, requestCount, expiresAt | PK(subjectKey,actionKey,windowStart) |
| audit_events | id, occurredAt, requestId, actorId, action, targetType, targetId, workspaceId, outcome, metadata | append-only; metadata không chứa secret/nội dung tài liệu |
| direct_conversations | id, kind, title, avatarStorageKey, createdBy, participantLow, participantHigh, createdAt, lastMessageAt | kind DIRECT/GROUP; CHECK ràng buộc hình dạng từng loại (DIRECT có cặp đã sắp thứ tự và không title, GROUP có title và không cặp); unique(participantLow,participantHigh) vẫn chặn trùng thread 1-1, và hai NULL không trùng nhau nên nhóm không bị ràng buộc; avatarStorageKey chỉ đặt cho GROUP, NULL với DIRECT vì thread 1-1 lấy ảnh của người đối diện |
| conversation_participants | conversationId, userId, role, joinedAt, lastReadAt | PK(conversationId,userId); role OWNER/MEMBER; có cho **cả hai** loại hội thoại; lastReadAt là mốc nước đã đọc, thay cho cờ trên từng tin nhắn (ADR-023) |
| direct_messages | id, conversationId, senderId, body, createdAt | body nullable cho tin nhắn chỉ có tệp; CHECK body IS NULL OR length(trim(body)) > 0; không còn readAt — trạng thái đọc nằm ở mốc nước của từng người (V31) |
| chat_attachments | id, messageId, kind, storageKey, originalName, mediaType, byteSize, createdAt | kind IMAGE/FILE; không có documentId — tệp trong chat không vào kho tài liệu và AI không đọc (ADR-022); byteSize > 0 |
| password_reset_otps | email, otpCode, expiresAt, createdAt | PK(email); OTP 6 chữ số, hết hạn 5 phút; xóa sau khi sử dụng thành công |

## 3. Quan hệ

- users 1–N workspaces qua ownerId; users N–N workspaces qua workspace_members.
- workspaces 1–N documents, conversations, evaluation_cases và audit_events.
- documents: trạng thái document chỉ đổi qua service transaction. Ingestion/deletion bất đồng bộ qua RabbitMQ (ADR-007).
- conversations 1–N messages; assistant message 1–1 retrieval_trace và 1–N citation_history.
- retrieval_traces 1–N retrieval_trace_items.
- direct_conversations 1–N direct_messages; direct_messages 1–N chat_attachments, xóa theo cascade cùng tin nhắn.
- direct_conversations 1–N conversation_participants; người rời nhóm mất hàng participant nên hội thoại biến khỏi danh sách của họ, còn tin nhắn giữ nguyên.
- evaluation_runs N–N evaluation_cases qua evaluation_results.

## 4. Index bắt buộc

| Index | Mục đích |
|---|---|
| users(lower(email)) unique | Login và chống trùng email |
| workspace_members(userId,status,workspaceId) | Liệt kê Workspace được chia sẻ |
| documents(workspaceId,status,createdAt desc) | Danh sách và allowlist retrieval |
| conversations(userId,workspaceId,updatedAt desc) | Lịch sử người dùng |
| messages(conversationId,createdAt,id) | Cursor pagination ổn định |
| retrieval_traces(strategyVersion,intent,createdAt) | Phân tích Adaptive Retrieval |
| evaluation_cases(datasetVersion,split,intent,topicGroup) | Tạo tập calibration/holdout |
| evaluation_results(runId,caseId) unique | Bảo toàn một kết quả/case/run |
| audit_events(workspaceId,occurredAt desc) | Audit Workspace |
| direct_messages(conversationId,createdAt desc) | Phân trang hội thoại |
| direct_messages(conversationId,senderId,createdAt) | Đếm tin chưa đọc theo mốc nước |
| conversation_participants(userId) | Liệt kê hội thoại của một người |
| chat_attachments(messageId,createdAt) | Nạp tệp cho cả một trang tin nhắn |

## 5. Chroma collection

Collection: unichat_chunks_v2 (v1 fallback), distance cosine, embedding dimension 768.

Mỗi record có chunkId, workspaceId, documentId, ingestionVersion, chunkIndex, sourceGroup, locatorType, locatorValue, contentHash, extractorVersion và normalized text. Query luôn có allowedDocumentIds; không dùng Chroma làm nguồn quyền.

Embedding model: intfloat/multilingual-e5-base revision d128750597153bb5987e10b1c3493a34e5a4502a. Query thêm prefix query:, chunk thêm prefix passage:.

## 6. Locator

- PDF: pageNumber bắt đầu từ 1 và optional bounding label.
- DOCX: logicalBlockIndex, paragraphIndex hoặc tableIndex/rowIndex/cellIndex.
- TXT: lineStart và lineEnd bắt đầu từ 1.
- Mọi locator gắn contentHash và extractorVersion để phát hiện tài liệu đã đổi.

## 7. Transaction và concurrency

- Create Workspace và OWNER membership trong cùng transaction.
- Permission update tăng permissionVersion.
- Upload tạo document PENDING và resource_job INGEST trong cùng transaction.
- Worker claim job bằng FOR UPDATE SKIP LOCKED và lease.
- Ask lưu user message, assistant message, citation và trace theo transaction sau reauthorization.
- Conversation summary cập nhật bất đồng bộ hoặc sau khi stream/generate với optimistic locking (WHERE id = :id AND summary_version = :expectedVersion).
- Delete saga idempotent; document DELETING bị loại khỏi retrieval ngay lập tức.

## 8. Retention

- refresh_tokens: xóa sau expiresAt/revokedAt theo policy 7 ngày.
- idempotency_records: 24 giờ.
- rate_limit_buckets: hết cửa sổ cộng buffer.
- citation excerpt: redact khi tài liệu xóa; giữ locator tối thiểu cho audit.
- audit_events: giữ tối thiểu suốt thời gian khóa luận, không chứa nội dung nguồn.
- password_reset_otps: xóa ngay sau khi xác minh thành công; record hết hạn bị dọn theo policy 24 giờ.
- evaluation data: version hóa, chỉ giữ dữ liệu được phép dùng cho nghiên cứu.
