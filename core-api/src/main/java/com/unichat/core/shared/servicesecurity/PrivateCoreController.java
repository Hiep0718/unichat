package com.unichat.core.shared.servicesecurity;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.admin.service.ProviderAttemptService;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.chat.service.WorkspaceSummaryJobService;
import com.unichat.core.chat.service.WorkspaceSummaryLifecycleService;
import com.unichat.core.chat.api.WorkspaceSummaryClaimRequest;
import com.unichat.core.chat.api.WorkspaceSummaryProgressRequest;
import com.unichat.core.chat.api.WorkspaceSummaryCompletionRequest;
import com.unichat.core.chat.api.WorkspaceSummaryCheckpointRequest;
import com.unichat.core.chat.api.WorkspaceSummaryFailureRequest;
import com.unichat.core.chat.api.WorkspaceSummaryRetryRequest;
import com.unichat.core.chat.api.WorkspaceSummaryHeartbeatRequest;
import com.unichat.core.common.error.ValidationError;

/** Exposes only nonce, authorization checkpoint and metadata ingest to the verified AI identity. */
@RestController
@RequestMapping("/internal/v1")
public class PrivateCoreController {
    private final ServiceNonceService nonces;
    private final ChatOperationService operations;
    private final ProviderAttemptService attempts;
    private final WorkspaceSummaryJobService summaryJobs;
    private final WorkspaceSummaryLifecycleService summaryLifecycle;
    /** Does not expose user/admin mutations or document permission issuance. */
    public PrivateCoreController(ServiceNonceService nonces,ChatOperationService operations,ProviderAttemptService attempts,
                                 WorkspaceSummaryJobService summaryJobs, WorkspaceSummaryLifecycleService summaryLifecycle) {
        this.nonces=nonces;this.operations=operations;this.attempts=attempts;
        this.summaryJobs=summaryJobs;this.summaryLifecycle=summaryLifecycle;
    }
    /** One-use nonce proof for a Core request already signature-verified by AI. */
    public record ConsumeRequest(@NotNull UUID nonce,@Positive long expiresAt,@NotBlank @Size(max=100) String requestId) { }
    /** Purpose-scoped authorization request before generation or compaction. */
    public record CheckpointRequest(@NotBlank @Size(max=100) String requestId,
            @NotBlank @Pattern(regexp="CHAT|COMPACTION|QUERY_PLAN|WORKSPACE_SUMMARY") String purpose,UUID attemptId) { }
    /** Atomically consumes the Core-to-AI nonce shared by all AI workers. */
    @PostMapping("/service-nonces/consume")
    public ResponseEntity<Void> consume(@Valid @RequestBody ConsumeRequest request,@RequestHeader("X-Request-Id") String requestId) {
        if (!requestId.equals(request.requestId())) throw new ValidationError("Mã yêu cầu không khớp.");
        nonces.consume("core-api",request.nonce(),Instant.ofEpochSecond(request.expiresAt()));
        return ResponseEntity.noContent().build();
    }
    /** Rechecks durable operation state, current session and source policy. */
    @PostMapping("/chat-operations/{operationId}/checkpoint")
    public Map<String,Object> checkpoint(@PathVariable UUID operationId,@Valid @RequestBody CheckpointRequest request) {
        var operation=operations.checkpoint(operationId);
        if (!operation.requestId().equals(request.requestId())) throw new ValidationError("Mã yêu cầu không khớp.");
        return Map.of("allowed",true,"cloudAllowed",true,"deadlineAt",operation.deadlineAt());
    }
    /** Requires a committed START acknowledgement before any physical model call. */
    @PostMapping("/provider-attempts")
    public ResponseEntity<Void> attempt(@Valid @RequestBody ProviderAttemptRequest request) {
        boolean chat="CHAT".equals(request.purpose()) || "COMPACTION".equals(request.purpose())
                || "QUERY_PLAN".equals(request.purpose()) || "WORKSPACE_SUMMARY".equals(request.purpose());
        if (chat != (request.operationId()!=null)) throw new ValidationError("Nguồn operation không hợp lệ.");
        if (chat && "START".equals(request.phase())) operations.checkpoint(request.operationId());
        attempts.record(request);
        return ResponseEntity.noContent().build();
    }

    /** Claims a queued workspace summary and returns only Core-authorized source metadata. */
    @PostMapping("/workspace-summary-jobs/{operationId}/claim")
    public Map<String,Object> claimSummary(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryClaimRequest request) {
        return summaryJobs.claim(operationId, request);
    }

    /** Renews the worker lease and records content-free summary progress. */
    @PostMapping("/workspace-summary-jobs/{operationId}/progress")
    public ResponseEntity<Void> summaryProgress(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryProgressRequest request) {
        summaryJobs.progress(operationId, request);
        return ResponseEntity.noContent().build();
    }

    /** Reauthorizes the source set and renews the active worker lease. */
    @PostMapping("/workspace-summary-jobs/{operationId}/heartbeat")
    public ResponseEntity<Void> heartbeatSummary(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryHeartbeatRequest request) {
        summaryLifecycle.heartbeat(operationId, request);
        return ResponseEntity.noContent().build();
    }

    /** Completes a summary only after Core revalidates every source and citation. */
    @PostMapping("/workspace-summary-jobs/{operationId}/complete")
    public Map<String, UUID> completeSummary(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryCompletionRequest request) {
        return Map.of("summaryId", summaryJobs.complete(operationId, request));
    }

    /** Persists a validated document checkpoint for crash recovery. */
    @PostMapping("/workspace-summary-jobs/{operationId}/documents/checkpoint")
    public ResponseEntity<Void> checkpointSummaryDocument(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryCheckpointRequest request) {
        summaryJobs.checkpointDocument(operationId, request);
        return ResponseEntity.noContent().build();
    }

    /** Records a typed terminal worker failure after retry exhaustion. */
    @PostMapping("/workspace-summary-jobs/{operationId}/fail")
    public ResponseEntity<Void> failSummary(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryFailureRequest request) {
        summaryLifecycle.fail(operationId, request);
        return ResponseEntity.noContent().build();
    }

    /** Keeps a delayed retry alive without extending its absolute deadline. */
    @PostMapping("/workspace-summary-jobs/{operationId}/retry")
    public ResponseEntity<Void> retrySummary(@PathVariable UUID operationId,
            @Valid @RequestBody WorkspaceSummaryRetryRequest request) {
        summaryLifecycle.retry(operationId, request);
        return ResponseEntity.noContent().build();
    }
}
