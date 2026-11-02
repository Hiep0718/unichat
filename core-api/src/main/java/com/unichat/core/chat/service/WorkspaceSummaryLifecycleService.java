package com.unichat.core.chat.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.chat.api.ChatTaskType;
import com.unichat.core.chat.api.WorkspaceSummaryFailureRequest;
import com.unichat.core.chat.api.WorkspaceSummaryHeartbeatRequest;
import com.unichat.core.chat.api.WorkspaceSummaryRetryRequest;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.domain.ChatOperationRepository;

/** Owns bounded retry scheduling and terminal worker failures. */
@Service
public class WorkspaceSummaryLifecycleService {
    private final JdbcTemplate database;
    private final ChatOperationRepository operations;
    private final AuditService audit;
    private final ChatAccessService access;
    private final Clock clock;
    private final TransactionTemplate transaction;

    /** Receives transactional state and audit adapters. */
    public WorkspaceSummaryLifecycleService(JdbcTemplate database, ChatOperationRepository operations,
            AuditService audit, ChatAccessService access, Clock clock, PlatformTransactionManager manager) {
        this.database = database;
        this.operations = operations;
        this.audit = audit;
        this.access = access;
        this.clock = clock;
        this.transaction = new TransactionTemplate(manager);
    }

    /** Renews both leases only while the actor still has the original complete source set. */
    public void heartbeat(UUID operationId, WorkspaceSummaryHeartbeatRequest request) {
        transaction.executeWithoutResult(status -> {
            ChatOperation operation = requireOperation(operationId, request.requestId());
            var current = access.readWorkspaceSummary(operation.actor(), operation.workspaceId());
            if (!current.fingerprint().equals(operation.sources().fingerprint())) {
                throw error("SUMMARY_SOURCE_SNAPSHOT_CHANGED");
            }
            Instant now = Instant.now(clock);
            int updated = database.update("""
                    UPDATE workspace_summary_jobs SET lease_until=?,updated_at=?
                    WHERE operation_id=? AND lease_until>?
                    """, Timestamp.from(now.plusSeconds(45)), Timestamp.from(now), operationId, Timestamp.from(now));
            if (updated != 1 || !operations.heartbeat(operationId, now)) {
                throw error("SUMMARY_OPERATION_TERMINAL");
            }
        });
    }

    /** Ends a failed worker operation without publishing partial artifacts. */
    public void fail(UUID operationId, WorkspaceSummaryFailureRequest request) {
        transaction.executeWithoutResult(status -> {
            ChatOperation operation = requireOperation(operationId, request.requestId());
            Instant now = Instant.now(clock);
            if (!operations.terminal(operationId, "FAILED", null, request.errorCode(), now)) {
                throw error("SUMMARY_OPERATION_TERMINAL");
            }
            database.update("UPDATE workspace_summary_jobs SET stage='FAILED',lease_until=NULL,updated_at=? WHERE operation_id=?",
                    Timestamp.from(now), operationId);
            audit.record(operation.actor().userId(), "WORKSPACE_SUMMARY_FAILED", "CHAT_OPERATION", operationId, "FAILURE");
        });
    }

    /** Keeps one delayed retry alive without extending the absolute deadline. */
    public void retry(UUID operationId, WorkspaceSummaryRetryRequest request) {
        if (!Set.of(10, 60, 300).contains(request.delaySeconds())) throw error("SUMMARY_RETRY_INVALID");
        transaction.executeWithoutResult(status -> {
            requireOperation(operationId, request.requestId());
            Instant now = Instant.now(clock);
            Instant retryAt = now.plusSeconds(request.delaySeconds());
            int updated = database.update("""
                    UPDATE workspace_summary_jobs SET stage='RETRY_WAIT',lease_until=?,updated_at=?
                    WHERE operation_id=? AND lease_until>?
                    """, Timestamp.from(retryAt), Timestamp.from(now), operationId, Timestamp.from(now));
            if (updated != 1) throw error("SUMMARY_OPERATION_TERMINAL");
            database.update("""
                    UPDATE chat_operations SET lease_until=LEAST(deadline_at,?)
                    WHERE id=? AND state='RUNNING' AND deadline_at>?
                    """, Timestamp.from(retryAt.plusSeconds(45)), operationId, Timestamp.from(now));
        });
    }

    private ChatOperation requireOperation(UUID id, String requestId) {
        ChatOperation operation = operations.findById(id).orElseThrow(() -> error("SUMMARY_OPERATION_NOT_FOUND"));
        if (operation.taskType() != ChatTaskType.WORKSPACE_SUMMARY || !operation.requestId().equals(requestId)
                || !"RUNNING".equals(operation.state())) throw error("SUMMARY_OPERATION_TERMINAL");
        return operation;
    }

    private ChatOperationError error(String code) {
        return new ChatOperationError(code, HttpStatus.CONFLICT, "Tóm tắt Workspace không thể tiếp tục.");
    }
}
