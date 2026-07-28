package com.unichat.core.workspace.api;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.workspace.service.WorkspaceMemberService;

/**
 * REST Controller for managing workspace members and access roles.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/members")
public class WorkspaceMemberController {

    private final WorkspaceMemberService workspaceMemberService;

    public WorkspaceMemberController(WorkspaceMemberService workspaceMemberService) {
        this.workspaceMemberService = workspaceMemberService;
    }

    /**
     * Lists members of a workspace (Owner only).
     */
    @GetMapping
    public ResponseEntity<List<WorkspaceMemberResponse>> getMembers(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(workspaceMemberService.getMembers(currentUserId, workspaceId));
    }

    /**
     * Adds a new member to a workspace (Owner only).
     */
    @PostMapping
    public ResponseEntity<WorkspaceMemberResponse> addMember(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody AddWorkspaceMemberRequest request) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        WorkspaceMemberResponse response = workspaceMemberService.addMember(currentUserId, workspaceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Updates a workspace member's role (Owner only).
     */
    @PatchMapping("/{userId}")
    public ResponseEntity<WorkspaceMemberResponse> updateMemberRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("userId") UUID targetUserId,
            @Valid @RequestBody UpdateWorkspaceMemberRequest request) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        WorkspaceMemberResponse response = workspaceMemberService.updateMemberRole(
                currentUserId, workspaceId, targetUserId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Removes a member from a workspace (Owner only).
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("userId") UUID targetUserId) {
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        workspaceMemberService.removeMember(currentUserId, workspaceId, targetUserId);
        return ResponseEntity.noContent().build();
    }
}
