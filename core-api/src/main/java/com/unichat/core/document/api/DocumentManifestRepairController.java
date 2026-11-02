package com.unichat.core.document.api;

import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.document.service.DocumentManifestRepairService;

/** Workspace-scoped repair entry point for legacy processed documents. */
@RestController
@Validated
@RequestMapping("/api/v1/workspaces/{workspaceId}/documents")
public class DocumentManifestRepairController {
    private final DocumentManifestRepairService repairs;

    /** Receives the authorized manifest repair service. */
    public DocumentManifestRepairController(DocumentManifestRepairService repairs) {
        this.repairs = repairs;
    }

    /** Queues re-ingestion without guessing counts from the existing vector index. */
    @PostMapping("/repair-manifests")
    public Map<String, Object> repair(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID workspaceId,
            @RequestHeader(value = "X-Request-ID", required = false) @Size(max = 100) String requestId) {
        String correlationId = requestId == null || requestId.isBlank() ? UUID.randomUUID().toString() : requestId;
        return Map.of("queuedDocuments", repairs.repair(ChatActor.from(jwt), workspaceId, correlationId));
    }

    /** Reports the workspace-scoped number of processed documents awaiting repair. */
    @GetMapping("/manifest-status")
    public DocumentManifestRepairService.RepairStatus status(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId) {
        return repairs.status(ChatActor.from(jwt), workspaceId);
    }
}
