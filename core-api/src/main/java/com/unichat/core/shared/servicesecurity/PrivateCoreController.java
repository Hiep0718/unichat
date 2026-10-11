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
import com.unichat.core.common.error.ValidationError;

/** Exposes only nonce, authorization checkpoint and metadata ingest to the verified AI identity. */
@RestController
@RequestMapping("/internal/v1")
public class PrivateCoreController {
    private final ServiceNonceService nonces;
    private final ChatOperationService operations;
    private final ProviderAttemptService attempts;
    /** Does not expose user/admin mutations or document permission issuance. */
    public PrivateCoreController(ServiceNonceService nonces,ChatOperationService operations,ProviderAttemptService attempts) {
        this.nonces=nonces;this.operations=operations;this.attempts=attempts;
    }
    /** One-use nonce proof for a Core request already signature-verified by AI. */
    public record ConsumeRequest(@NotNull UUID nonce,@Positive long expiresAt,@NotBlank @Size(max=100) String requestId) { }
    /** Purpose-scoped authorization request before generation or compaction. */
    public record CheckpointRequest(@NotBlank @Size(max=100) String requestId,
            @NotBlank @Pattern(regexp="CHAT|COMPACTION") String purpose,UUID attemptId) { }
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
        boolean chat="CHAT".equals(request.purpose()) || "COMPACTION".equals(request.purpose());
        if (chat != (request.operationId()!=null)) throw new ValidationError("Nguồn operation không hợp lệ.");
        if (chat && "START".equals(request.phase())) operations.checkpoint(request.operationId());
        attempts.record(request);
        return ResponseEntity.noContent().build();
    }
}
