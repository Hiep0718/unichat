package com.unichat.core.workspace.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.shared.idempotency.IdempotencyService;
import com.unichat.core.workspace.service.WorkspaceService;

/**
 * REST controller for workspace CRUD operations.
 */
@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final IdempotencyService idempotencyService;

    public WorkspaceController(WorkspaceService workspaceService, IdempotencyService idempotencyService) {
        this.workspaceService = workspaceService;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Lists workspaces accessible to the authenticated user.
     */
    @GetMapping
    public ResponseEntity<Page<WorkspaceResponse>> getWorkspaces(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID userId = UUID.fromString(jwt.getSubject());
        int pageSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, pageSize);
        return ResponseEntity.ok(workspaceService.getWorkspaces(userId, pageable));
    }

    /**
     * Creates a new workspace.
     */
    @PostMapping
    public ResponseEntity<?> createWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateWorkspaceRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        String actorId = userId.toString();
        String routeKey = "/workspaces";

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String currentHash = idempotencyService.computeHash(request);
            var recordOpt = idempotencyService.getRecord(actorId, routeKey, idempotencyKey);
            if (recordOpt.isPresent()) {
                var record = recordOpt.get();
                idempotencyService.handleConflict(record, currentHash);
                return ResponseEntity.status(record.getResponseStatus())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(record.getResponseBody());
            }

            WorkspaceResponse response = workspaceService.createWorkspace(userId, request);
            idempotencyService.saveRecord(actorId, routeKey, idempotencyKey, currentHash, 201, response);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }

        WorkspaceResponse response = workspaceService.createWorkspace(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves workspace metadata.
     */
    @GetMapping("/{workspaceId:[0-9a-fA-F\\-]+}")
    public ResponseEntity<WorkspaceResponse> getWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(workspaceService.getWorkspace(userId, workspaceId));
    }

    /**
     * Updates an existing workspace.
     */
    @PatchMapping("/{workspaceId:[0-9a-fA-F\\-]+}")
    public ResponseEntity<WorkspaceResponse> updateWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody UpdateWorkspaceRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(workspaceService.updateWorkspace(userId, workspaceId, request));
    }

    /**
     * Deletes a workspace.
     */
    @DeleteMapping("/{workspaceId:[0-9a-fA-F\\-]+}")
    public ResponseEntity<Void> deleteWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        workspaceService.deleteWorkspace(userId, workspaceId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lists public workspaces the user has not yet joined.
     */
    @GetMapping("/explore")
    public ResponseEntity<Page<WorkspaceResponse>> exploreWorkspaces(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "search", required = false) String search) {
        UUID userId = UUID.fromString(jwt.getSubject());
        int pageSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, pageSize);
        return ResponseEntity.ok(workspaceService.getPublicWorkspaces(userId, search, pageable));
    }

    /**
     * Allows the authenticated user to join a PUBLIC workspace as VIEWER.
     */
    @PostMapping("/{workspaceId:[0-9a-fA-F\\-]+}/join")
    public ResponseEntity<WorkspaceResponse> joinWorkspace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(workspaceService.joinPublicWorkspace(userId, workspaceId));
    }
}
