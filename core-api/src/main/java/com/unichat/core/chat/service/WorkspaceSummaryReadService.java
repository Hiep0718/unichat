package com.unichat.core.chat.service;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;
import com.unichat.core.chat.api.WorkspaceSummaryCitationResponse;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentResponse;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentsPage;
import com.unichat.core.chat.api.WorkspaceSummaryResult;
import com.unichat.core.chat.api.WorkspaceSummaryInsightInput;

/** Reads canonical summary artifacts after complete source authorization. */
@Service
public class WorkspaceSummaryReadService {
    private final JdbcTemplate database;
    private final ChatAccessService access;
    private final ChatJson json;

    /** Receives the canonical persistence and authorization adapters. */
    public WorkspaceSummaryReadService(JdbcTemplate database, ChatAccessService access, ChatJson json) {
        this.database = database;
        this.access = access;
        this.json = json;
    }

    /** Rebuilds a completed overview from its canonical artifact. */
    public WorkspaceSummaryResult result(UUID operationId) {
        var row = database.queryForMap("""
                SELECT summary.id,operation.result_message_id,summary.overview,summary.overview_chunk_ids,
                summary.cross_document_insights,
                summary.document_count,summary.processed_chunk_count
                FROM workspace_summaries summary JOIN chat_operations operation ON operation.id=summary.operation_id
                WHERE summary.operation_id=?
                """, operationId);
        WorkspaceSummaryInsightInput[] insights = json.read(
                String.valueOf(row.get("cross_document_insights")), WorkspaceSummaryInsightInput[].class);
        String[] citations = json.read(String.valueOf(row.get("overview_chunk_ids")), String[].class);
        return new WorkspaceSummaryResult((UUID) row.get("id"), (UUID) row.get("result_message_id"),
                (String) row.get("overview"),
                List.of(citations), List.of(insights),
                ((Number) row.get("document_count")).intValue(),
                ((Number) row.get("processed_chunk_count")).longValue());
    }

    /** Returns the canonical overview after current full-snapshot authorization. */
    public WorkspaceSummaryResult summary(ChatActor actor, UUID workspaceId, UUID summaryId) {
        ChatSourceSnapshot current = access.readWorkspaceSummary(actor, workspaceId);
        var row = database.queryForMap("""
                SELECT operation_id,source_fingerprint FROM workspace_summaries
                WHERE id=? AND workspace_id=?
                """, summaryId, workspaceId);
        if (!current.fingerprint().equals(row.get("source_fingerprint"))) {
            throw new ChatOperationError("SUMMARY_SOURCE_SNAPSHOT_CHANGED", HttpStatus.CONFLICT,
                    "Nguồn tài liệu của bản tóm tắt đã thay đổi.");
        }
        return result((UUID) row.get("operation_id"));
    }

    /** Returns a bounded document page only if the full source fingerprint is still current. */
    public WorkspaceSummaryDocumentsPage documents(ChatActor actor, UUID workspaceId, UUID summaryId,
            int page, int size) {
        ChatSourceSnapshot current = access.readWorkspaceSummary(actor, workspaceId);
        var summary = database.queryForMap("""
                SELECT id,source_fingerprint,document_count FROM workspace_summaries
                WHERE id=? AND workspace_id=?
                """, summaryId, workspaceId);
        if (!current.fingerprint().equals(summary.get("source_fingerprint"))) {
            throw new ChatOperationError("SUMMARY_SOURCE_SNAPSHOT_CHANGED", HttpStatus.CONFLICT,
                    "Nguồn tài liệu của bản tóm tắt đã thay đổi.");
        }
        long total = ((Number) summary.get("document_count")).longValue();
        var rows = database.query("""
                SELECT checkpoint.document_id,document.original_name,checkpoint.summary_json,
                checkpoint.processed_chunk_count FROM workspace_summary_documents checkpoint
                JOIN documents document ON document.id=checkpoint.document_id
                WHERE checkpoint.operation_id=(SELECT operation_id FROM workspace_summaries WHERE id=?)
                AND checkpoint.status='COMPLETED' ORDER BY checkpoint.document_id LIMIT ? OFFSET ?
                """, (row, index) -> documentResponse(row.getObject("document_id", UUID.class),
                row.getString("original_name"), row.getString("summary_json"), row.getInt("processed_chunk_count")),
                summaryId, size, (long) page * size);
        return new WorkspaceSummaryDocumentsPage(rows, page, size, total,
                (int) ((total + size - 1) / size));
    }

    private WorkspaceSummaryDocumentResponse documentResponse(UUID id, String fileName, String value, int count) {
        var parsed = json.read(value, WorkspaceSummaryDocumentInput.class);
        return new WorkspaceSummaryDocumentResponse(id, fileName, parsed.summary(), parsed.topics(),
                parsed.claims(), count, parsed.sources());
    }

    /** Resolves one persisted source only after full workspace snapshot reauthorization. */
    public WorkspaceSummaryCitationResponse citation(ChatActor actor, UUID workspaceId, UUID summaryId,
            String chunkId) {
        documents(actor, workspaceId, summaryId, 0, 1);
        var rows = database.query("""
                SELECT document.id,document.original_name,checkpoint.summary_json
                FROM workspace_summary_documents checkpoint
                JOIN workspace_summaries summary ON summary.operation_id=checkpoint.operation_id
                JOIN documents document ON document.id=checkpoint.document_id
                WHERE summary.id=? AND summary.workspace_id=? AND checkpoint.status='COMPLETED'
                AND checkpoint.document_id=?
                """, (row, index) -> documentResponse(row.getObject("id", UUID.class),
                row.getString("original_name"), row.getString("summary_json"), 0),
                summaryId, workspaceId, citationDocumentId(chunkId));
        if (rows.size() != 1) throw sourceUnavailable();
        var document = rows.get(0);
        return document.sources().stream().filter(source -> source.chunkId().equals(chunkId))
                .findFirst().map(source -> new WorkspaceSummaryCitationResponse(document.documentId(),
                        document.fileName(), source.chunkId(), source.locator(), source.excerpt(),
                        source.contentHash(), source.ingestionVersion()))
                .orElseThrow(this::sourceUnavailable);
    }

    private UUID citationDocumentId(String chunkId) {
        try {
            int separator = chunkId.lastIndexOf('_');
            if (separator <= 0) throw sourceUnavailable();
            return UUID.fromString(chunkId.substring(0, separator));
        } catch (IllegalArgumentException | IndexOutOfBoundsException error) {
            throw sourceUnavailable();
        }
    }

    private ChatOperationError sourceUnavailable() {
        return new ChatOperationError("SUMMARY_CITATION_UNAVAILABLE", HttpStatus.NOT_FOUND,
                "Không tìm thấy vị trí nguồn trích dẫn.");
    }
}
