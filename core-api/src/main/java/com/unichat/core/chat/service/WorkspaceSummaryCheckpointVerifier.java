package com.unichat.core.chat.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;

/** Proves that final document summaries exactly match completed durable checkpoints. */
@Service
public class WorkspaceSummaryCheckpointVerifier {
    private final JdbcTemplate database;
    private final ChatJson json;

    /** Receives checkpoint storage and its canonical serializer. */
    public WorkspaceSummaryCheckpointVerifier(JdbcTemplate database, ChatJson json) {
        this.database = database;
        this.json = json;
    }

    /** Rejects any missing, partial or changed document checkpoint. */
    public void verify(UUID operationId, List<WorkspaceSummaryDocumentInput> documents) {
        Map<UUID, String> hashes = new HashMap<>();
        var rows = database.queryForList("""
                SELECT document_id,checkpoint_hash FROM workspace_summary_documents
                WHERE operation_id=? AND status='COMPLETED'
                """, operationId);
        for (var row : rows) hashes.put((UUID) row.get("document_id"), (String) row.get("checkpoint_hash"));
        if (hashes.size() != documents.size()) throw incomplete();
        for (var document : documents) {
            if (!hash(json.write(document)).equals(hashes.get(document.documentId()))) throw incomplete();
        }
    }

    /** Hashes canonical checkpoint JSON for exact crash-safe replay comparison. */
    public String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable.", error);
        }
    }

    private ChatOperationError incomplete() {
        return new ChatOperationError("SUMMARY_INCOMPLETE", HttpStatus.CONFLICT,
                "Tóm tắt Workspace không thể tiếp tục.");
    }
}
