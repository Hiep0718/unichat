package com.unichat.core.chat.messaging;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.config.RabbitMqConfig;

/** Publishes only committed summary outbox pointers and safely retries publish failures. */
@Component
public class WorkspaceSummaryOutboxDispatcher {
    private static final Logger LOGGER = LoggerFactory.getLogger(WorkspaceSummaryOutboxDispatcher.class);
    private final JdbcTemplate database;
    private final RabbitTemplate rabbit;

    /** Receives persistence and broker adapters. */
    public WorkspaceSummaryOutboxDispatcher(JdbcTemplate database, RabbitTemplate rabbit) {
        this.database = database;
        this.rabbit = rabbit;
    }

    /** Claims a bounded set and retries any row whose broker publish fails. */
    @Scheduled(fixedDelayString = "${unichat.workspace-summary.dispatch-delay-ms:1000}")
    @Transactional
    public void dispatchPending() {
        List<WorkspaceSummaryJobMessage> messages = database.query("""
                SELECT outbox.operation_id,outbox.request_id,outbox.source_fingerprint,outbox.config_hash
                FROM workspace_summary_outbox outbox
                JOIN workspace_summary_jobs job USING (operation_id)
                JOIN chat_operations operation ON operation.id=outbox.operation_id
                WHERE operation.state='RUNNING' AND (outbox.published_at IS NULL OR
                ((job.lease_until IS NULL OR job.lease_until < now())
                AND outbox.published_at < now() - interval '60 seconds'))
                ORDER BY outbox.created_at LIMIT 20 FOR UPDATE OF outbox SKIP LOCKED
                """, this::map);
        for (WorkspaceSummaryJobMessage message : messages) publish(message);
    }

    private WorkspaceSummaryJobMessage map(ResultSet row, int index) throws SQLException {
        return new WorkspaceSummaryJobMessage(row.getObject("operation_id", java.util.UUID.class),
                row.getString("request_id"), "WORKSPACE_SUMMARY", row.getString("source_fingerprint"),
                row.getString("config_hash"));
    }

    private void publish(WorkspaceSummaryJobMessage message) {
        try {
            rabbit.convertAndSend(RabbitMqConfig.WORKSPACE_SUMMARY_EXCHANGE,
                    RabbitMqConfig.WORKSPACE_SUMMARY_ROUTING_KEY, message);
            database.update("UPDATE workspace_summary_outbox SET published_at=?,attempts=attempts+1 WHERE operation_id=?",
                    Timestamp.from(Instant.now()), message.operationId());
        } catch (RuntimeException error) {
            database.update("UPDATE workspace_summary_outbox SET attempts=attempts+1 WHERE operation_id=?",
                    message.operationId());
            LOGGER.warn("workspace_summary_publish_failed operationId={} errorCode={}",
                    message.operationId(), error.getClass().getSimpleName());
        }
    }
}
