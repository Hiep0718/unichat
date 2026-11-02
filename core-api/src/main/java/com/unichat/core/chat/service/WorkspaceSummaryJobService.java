package com.unichat.core.chat.service;
import java.time.Clock;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.HashMap;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.unichat.core.chat.api.WorkspaceSummaryClaimRequest;
import com.unichat.core.chat.api.WorkspaceSummaryProgressRequest;
import com.unichat.core.chat.api.WorkspaceSummaryCompletionRequest;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;
import com.unichat.core.chat.api.WorkspaceSummaryInsightInput;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.domain.ChatOperationRepository;
import com.unichat.core.chat.api.ChatTaskType;
import com.unichat.core.chat.api.WorkspaceSummaryResult;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentsPage;
import com.unichat.core.chat.api.WorkspaceSummaryCheckpointRequest;
/** Owns summary worker claims, monotonic progress and snapshot revalidation. */
@Service
public class WorkspaceSummaryJobService {
    private static final Set<String> STAGES = Set.of("VALIDATING_SOURCES", "READING_CHUNKS", "MAPPING",
            "DOCUMENT_REDUCE", "WORKSPACE_REDUCE", "VALIDATING_RESULT", "PERSISTING");
    private final JdbcTemplate database;
    private final ChatOperationRepository operations;
    private final ChatAccessService access;
    private final Clock clock;
    private final TransactionTemplate transaction;
    private final ChatMessageStore messages;
    private final ChatConversationStore conversations;
    private final ChatJson json;
    private final AuditService audit;
    private final WorkspaceSummaryReadService reads;
    private final WorkspaceSummaryCheckpointVerifier verifier;
    /** Receives Core persistence and current permission/snapshot services. */
    public WorkspaceSummaryJobService(JdbcTemplate database, ChatOperationRepository operations,
            ChatAccessService access, ChatMessageStore messages, ChatConversationStore conversations, ChatJson json,
            AuditService audit, WorkspaceSummaryReadService reads, WorkspaceSummaryCheckpointVerifier verifier,
            Clock clock, PlatformTransactionManager manager) {
        this.database = database;
        this.operations = operations;
        this.access = access;
        this.messages = messages;
        this.conversations = conversations;
        this.json = json;
        this.audit = audit;
        this.reads = reads;
        this.verifier = verifier;
        this.clock = clock;
        this.transaction = new TransactionTemplate(manager);
    }
    /** Claims one operation using a lease; duplicate deliveries cannot run concurrently. */
    public Map<String, Object> claim(UUID operationId, WorkspaceSummaryClaimRequest request) {
        return transaction.execute(status -> claimLocked(operationId, request));
    }
    private Map<String, Object> claimLocked(UUID id, WorkspaceSummaryClaimRequest request) {
        ChatOperation operation = requireOperation(id, request.requestId());
        ChatSourceSnapshot current = currentSnapshot(operation);
        if (!request.sourceFingerprint().equals(current.fingerprint())) {
            throw summaryError("SUMMARY_SOURCE_SNAPSHOT_CHANGED");
        }
        Instant now = Instant.now(clock);
        int claimed = database.update("""
                UPDATE workspace_summary_jobs SET stage='VALIDATING_SOURCES',
                delivery_attempts=delivery_attempts+1,lease_until=?,updated_at=?
                WHERE operation_id=? AND (lease_until IS NULL OR lease_until<=?)
                """, Timestamp.from(now.plusSeconds(45)), Timestamp.from(now), id, Timestamp.from(now));
        if (claimed != 1) throw summaryError("SUMMARY_WORKER_ALREADY_CLAIMED");
        int renewed = database.update("""
                UPDATE chat_operations SET lease_until=LEAST(deadline_at,?)
                WHERE id=? AND state='RUNNING' AND deadline_at>?
                """, Timestamp.from(now.plusSeconds(45)), id, Timestamp.from(now));
        if (renewed != 1) throw summaryError("SUMMARY_OPERATION_TERMINAL");
        var completed = database.query("""
                SELECT summary_json FROM workspace_summary_documents
                WHERE operation_id=? AND status='COMPLETED' ORDER BY document_id
                """, (row, index) -> json.read(row.getString("summary_json"),
                WorkspaceSummaryDocumentInput.class), id);
        return Map.of("operationId", id, "requestId", operation.requestId(),
                "workspaceId", operation.workspaceId(), "sourceFingerprint", current.fingerprint(),
                "sources", current.sources(), "completedDocuments", completed);
    }
    /** Reauthorizes before writing monotonic progress and renewing both leases. */
    public void progress(UUID operationId, WorkspaceSummaryProgressRequest request) {
        transaction.executeWithoutResult(status -> updateProgress(operationId, request));
    }
    /** Stores one fully validated document checkpoint before processing the next source. */
    public void checkpointDocument(UUID operationId, WorkspaceSummaryCheckpointRequest request) {
        transaction.executeWithoutResult(status -> checkpointDocumentLocked(operationId, request));
    }
    private void checkpointDocumentLocked(UUID id, WorkspaceSummaryCheckpointRequest request) {
        ChatOperation operation = requireOperation(id, request.requestId());
        ChatSourceSnapshot current = currentSnapshot(operation);
        if (!current.fingerprint().equals(request.sourceFingerprint())) {
            throw summaryError("SUMMARY_SOURCE_SNAPSHOT_CHANGED");
        }
        var source = current.sources().stream().filter(item -> item.documentId().equals(request.document().documentId()))
                .findFirst().orElseThrow(() -> summaryError("SUMMARY_INCOMPLETE"));
        validateDocumentCoverage(List.of(request.document()), Map.of(source.documentId(), source),
                request.document().processedChunkCount());
        String checkpoint = json.write(request.document());
        String hash = verifier.hash(checkpoint);
        var rows = database.queryForList("""
                SELECT checkpoint_hash FROM workspace_summary_documents
                WHERE operation_id=? AND document_id=? FOR UPDATE
                """, String.class, id, source.documentId());
        if (rows.size() != 1) throw summaryError("SUMMARY_INCOMPLETE");
        if (rows.get(0) != null && !rows.get(0).equals(hash)) throw summaryError("SUMMARY_CHECKPOINT_CONFLICT");
        int updated = database.update("""
                UPDATE workspace_summary_documents SET processed_chunk_count=?,summary_json=?::jsonb,
                checkpoint_hash=?,status='COMPLETED',updated_at=? WHERE operation_id=? AND document_id=?
                AND expected_chunk_count=?
                """, request.document().processedChunkCount(), checkpoint, hash, Timestamp.from(Instant.now(clock)),
                id, source.documentId(), source.indexedChunkCount());
        if (updated != 1) throw summaryError("SUMMARY_INCOMPLETE");
    }
    /** Validates complete source coverage and commits artifact, message and operation atomically. */
    public UUID complete(UUID operationId, WorkspaceSummaryCompletionRequest request) {
        return transaction.execute(status -> completeLocked(operationId, request));
    }
    /** Rebuilds the canonical completed result by operation ID. */
    public WorkspaceSummaryResult result(UUID operationId) {
        return reads.result(operationId);
    }
    /** Authorizes the complete source set before returning a bounded document-summary page. */
    public WorkspaceSummaryDocumentsPage documents(ChatActor actor, UUID workspaceId, UUID summaryId,
            int page, int size) {
        return reads.documents(actor, workspaceId, summaryId, page, size);
    }
    /** Reauthorizes and returns the canonical workspace overview. */
    public WorkspaceSummaryResult summary(ChatActor actor, UUID workspaceId, UUID summaryId) {
        return reads.summary(actor, workspaceId, summaryId);
    }
    /** Reauthorizes and resolves a canonical original chunk locator. */
    public com.unichat.core.chat.api.WorkspaceSummaryCitationResponse citation(ChatActor actor,
            UUID workspaceId, UUID summaryId, String chunkId) {
        return reads.citation(actor, workspaceId, summaryId, chunkId);
    }
    private UUID completeLocked(UUID operationId, WorkspaceSummaryCompletionRequest request) {
        ChatOperation operation = requireOperation(operationId, request.requestId());
        database.queryForList("SELECT id FROM workspaces WHERE id=? FOR UPDATE", operation.workspaceId());
        conversations.lockSources(operation.actor(), operation.workspaceId());
        ChatSourceSnapshot current = currentSnapshot(operation);
        if (!request.sourceFingerprint().equals(current.fingerprint())) {
            throw summaryError("SUMMARY_SOURCE_SNAPSHOT_CHANGED");
        }
        Map<UUID, ChatSourceSnapshot.Source> sources = new HashMap<>();
        current.sources().forEach(source -> sources.put(source.documentId(), source));
        validateDocumentCoverage(request.documents(), sources, request.processedChunkCount());
        validateInsights(request.crossDocumentInsights(), request.documents(), request.overviewChunkIds());
        verifier.verify(operationId, request.documents());
        return persistSummary(operation, request, current);
    }
    private void validateDocumentCoverage(List<WorkspaceSummaryDocumentInput> documents,
            Map<UUID, ChatSourceSnapshot.Source> sources, long processedChunks) {
        if (documents.size() != sources.size() || documents.stream()
                .map(WorkspaceSummaryDocumentInput::documentId).distinct().count() != sources.size()) {
            throw summaryError("SUMMARY_INCOMPLETE");
        }
        long expectedChunks = 0;
        for (WorkspaceSummaryDocumentInput document : documents) {
            ChatSourceSnapshot.Source source = sources.get(document.documentId());
            if (source == null || !source.fileName().equals(document.fileName())
                    || !source.indexedChunkCount().equals(document.processedChunkCount())) {
                throw summaryError("SUMMARY_INCOMPLETE");
            }
            validateClaimChunkIds(document, source.indexedChunkCount());
            if (!WorkspaceSummarySourceValidator.valid(document, source.ingestionVersion())) {
                throw summaryError("SUMMARY_CITATION_INVALID");
            }
            expectedChunks += source.indexedChunkCount();
        }
        if (processedChunks != expectedChunks) throw summaryError("SUMMARY_INCOMPLETE");
    }
    private void validateClaimChunkIds(WorkspaceSummaryDocumentInput document, int chunkCount) {
        String prefix = document.documentId() + "_";
        for (var claim : document.claims()) for (String chunkId : claim.chunkIds()) {
            if (!chunkId.startsWith(prefix)) throw summaryError("SUMMARY_CITATION_INVALID");
            try {
                int index = Integer.parseInt(chunkId.substring(prefix.length()));
                if (index < 1 || index > chunkCount) throw summaryError("SUMMARY_CITATION_INVALID");
            } catch (NumberFormatException error) {
                throw summaryError("SUMMARY_CITATION_INVALID");
            }
        }
    }
    private void validateInsights(List<WorkspaceSummaryInsightInput> insights,
            List<WorkspaceSummaryDocumentInput> documents, List<String> overviewChunkIds) {
        Set<UUID> sourceIds = documents.stream().map(WorkspaceSummaryDocumentInput::documentId)
                .collect(java.util.stream.Collectors.toSet());
        Map<UUID, Set<String>> chunksByDocument = new HashMap<>();
        for (var document : documents) {
            Set<String> chunkIds = new java.util.HashSet<>();
            for (var claim : document.claims()) chunkIds.addAll(claim.chunkIds());
            chunksByDocument.put(document.documentId(), chunkIds);
        }
        Set<String> allChunks = new java.util.HashSet<>();
        chunksByDocument.values().forEach(allChunks::addAll);
        if (!allChunks.containsAll(overviewChunkIds)) throw summaryError("SUMMARY_CITATION_INVALID");
        for (var insight : insights) {
            Set<String> allowedChunks = new java.util.HashSet<>();
            insight.documentIds().forEach(documentId -> allowedChunks.addAll(
                    chunksByDocument.getOrDefault(documentId, Set.of())));
            boolean everyDocumentCited = insight.documentIds().stream().distinct().count() == insight.documentIds().size()
                    && insight.documentIds().stream().allMatch(documentId -> insight.chunkIds().stream()
                    .anyMatch(chunkId -> chunksByDocument.getOrDefault(documentId, Set.of()).contains(chunkId)));
            if (!sourceIds.containsAll(insight.documentIds()) || !allowedChunks.containsAll(insight.chunkIds())
                    || !everyDocumentCited) {
                throw summaryError("SUMMARY_CITATION_INVALID");
            }
        }
    }
    private UUID persistSummary(ChatOperation operation, WorkspaceSummaryCompletionRequest request,
            ChatSourceSnapshot current) {
        Instant now = Instant.now(clock);
        var job = database.queryForMap("SELECT config_hash FROM workspace_summary_jobs WHERE operation_id=? FOR UPDATE",
                operation.id());
        UUID summaryId = UUID.randomUUID();
        String configHash = String.valueOf(job.get("config_hash"));
        database.update("""
                INSERT INTO workspace_summaries(id,operation_id,workspace_id,created_by,source_fingerprint,
                config_hash,overview,overview_chunk_ids,cross_document_insights,document_count,processed_chunk_count,created_at)
                VALUES(?,?,?,?,?,?,?,?::jsonb,?::jsonb,?,?,?)
                """, summaryId, operation.id(), operation.workspaceId(), operation.actor().userId(),
                current.fingerprint(), configHash, request.overview(), json.write(request.overviewChunkIds()),
                json.write(request.crossDocumentInsights()),
                request.documents().size(), request.processedChunkCount(), Timestamp.from(now));
        persistDocumentSummaries(operation.id(), request.documents(), now);
        UUID messageId = messages.assistantSummary(operation, summaryId, request.overview(), now);
        if (!operations.terminal(operation.id(), "COMPLETED", messageId, null, now)) {
            throw summaryError("SUMMARY_OPERATION_TERMINAL");
        }
        database.update("UPDATE workspace_summary_jobs SET stage='COMPLETED',lease_until=NULL,updated_at=? WHERE operation_id=?",
                Timestamp.from(now), operation.id());
        audit.record(operation.actor().userId(), "WORKSPACE_SUMMARY_COMPLETED", "CHAT_OPERATION", operation.id(), "SUCCESS");
        return summaryId;
    }
    private void persistDocumentSummaries(UUID operationId, List<WorkspaceSummaryDocumentInput> documents,
            Instant now) {
        for (var document : documents) {
            String summaryJson = json.write(document);
            int updated = database.update("""
                    UPDATE workspace_summary_documents SET processed_chunk_count=?,summary_json=?::jsonb,
                    checkpoint_hash=?,status='COMPLETED',updated_at=? WHERE operation_id=? AND document_id=?
                    AND expected_chunk_count=?
                    """, document.processedChunkCount(), summaryJson, verifier.hash(summaryJson), Timestamp.from(now),
                    operationId, document.documentId(), document.processedChunkCount());
            if (updated != 1) throw summaryError("SUMMARY_INCOMPLETE");
        }
    }


    private void updateProgress(UUID id, WorkspaceSummaryProgressRequest request) {
        ChatOperation operation = requireOperation(id, request.requestId());
        currentSnapshot(operation);
        if (!STAGES.contains(request.stage())) throw summaryError("SUMMARY_STAGE_INVALID");
        Instant now = Instant.now(clock);
        int updated = database.update("""
                UPDATE workspace_summary_jobs SET stage=?,documents_completed=?,chunks_processed=?,
                provider_calls_completed=?,lease_until=?,updated_at=? WHERE operation_id=?
                AND lease_until>? AND documents_completed<=? AND chunks_processed<=?
                AND provider_calls_completed<=? AND ?<=documents_total AND ?<=chunks_total
                """, request.stage(), request.documentsCompleted(), request.chunksProcessed(),
                request.providerCallsCompleted(), Timestamp.from(now.plusSeconds(45)), Timestamp.from(now), id,
                Timestamp.from(now), request.documentsCompleted(), request.chunksProcessed(),
                request.providerCallsCompleted(), request.documentsCompleted(), request.chunksProcessed());
        if (updated != 1 || !operations.heartbeat(id, now)) throw summaryError("SUMMARY_OPERATION_TERMINAL");
    }

    private ChatOperation requireOperation(UUID id, String requestId) {
        ChatOperation operation = operations.findById(id)
                .orElseThrow(() -> summaryError("SUMMARY_OPERATION_NOT_FOUND"));
        if (operation.taskType() != ChatTaskType.WORKSPACE_SUMMARY || !operation.requestId().equals(requestId)) {
            throw summaryError("SUMMARY_OPERATION_BINDING_INVALID");
        }
        if (!"RUNNING".equals(operation.state())) throw summaryError("SUMMARY_OPERATION_TERMINAL");
        return operation;
    }

    private ChatSourceSnapshot currentSnapshot(ChatOperation operation) {
        ChatSourceSnapshot current = access.readWorkspaceSummary(operation.actor(), operation.workspaceId());
        if (!current.fingerprint().equals(operation.sources().fingerprint())) {
            throw summaryError("SUMMARY_SOURCE_SNAPSHOT_CHANGED");
        }
        return current;
    }

    private ChatOperationError summaryError(String code) {
        return new ChatOperationError(code, HttpStatus.CONFLICT, "Tóm tắt Workspace không thể tiếp tục.");
    }
}
