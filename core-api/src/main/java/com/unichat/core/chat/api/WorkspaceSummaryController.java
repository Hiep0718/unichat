package com.unichat.core.chat.api;

import java.util.UUID;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.WorkspaceSummaryJobService;

/** Serves authorized pages of per-document workspace summary results. */
@RestController
@Validated
@RequestMapping("/api/v1/workspaces/{workspaceId}/workspace-summaries")
public class WorkspaceSummaryController {
    private final WorkspaceSummaryJobService summaries;

    /** Receives the canonical summary service. */
    public WorkspaceSummaryController(WorkspaceSummaryJobService summaries) {
        this.summaries = summaries;
    }

    /** Reauthorizes the full source set before returning a page capped at 100 documents. */
    @GetMapping("/{summaryId}/documents")
    public WorkspaceSummaryDocumentsPage documents(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId, @PathVariable UUID summaryId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return summaries.documents(ChatActor.from(jwt), workspaceId, summaryId, page, size);
    }

    /** Reauthorizes the complete source set before returning the canonical overview. */
    @GetMapping("/{summaryId}")
    public WorkspaceSummaryResult summary(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId, @PathVariable UUID summaryId) {
        return summaries.summary(ChatActor.from(jwt), workspaceId, summaryId);
    }

    /** Opens one cited chunk only while the complete source snapshot remains authorized. */
    @GetMapping("/{summaryId}/citations/{chunkId}")
    public WorkspaceSummaryCitationResponse citation(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId, @PathVariable UUID summaryId,
            @PathVariable @Size(max = 64) String chunkId) {
        return summaries.citation(ChatActor.from(jwt), workspaceId, summaryId, chunkId);
    }
}
