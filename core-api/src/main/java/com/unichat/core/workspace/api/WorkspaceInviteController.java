package com.unichat.core.workspace.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.workspace.service.WorkspaceInviteService;

import jakarta.validation.Valid;

/**
 * Invite links for a workspace.
 *
 * <p>Two audiences, which is why the routes are not all under one prefix. The
 * owner's routes hang off the workspace and need a session. The redemption
 * routes are addressed by token alone, because the person holding one may not
 * be a member of anything yet, and the preview is reached before they sign in.
 *
 * <p>Only {@code GET /invites/{token}} is open; the security configuration
 * names that method and path exactly, so accepting still needs a session.
 */
@RestController
public class WorkspaceInviteController {

    private final WorkspaceInviteService inviteService;

    public WorkspaceInviteController(WorkspaceInviteService inviteService) {
        this.inviteService = inviteService;
    }

    /** Issues a link. The token in the response is shown once and never again. */
    @PostMapping("/api/v1/workspaces/{workspaceId}/invites")
    public ResponseEntity<InviteResponse> create(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateInviteRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inviteService.create(callerOf(jwt), workspaceId, request));
    }

    /** The workspace's links, newest first, without their tokens. */
    @GetMapping("/api/v1/workspaces/{workspaceId}/invites")
    public ResponseEntity<List<InviteResponse>> list(
            @PathVariable UUID workspaceId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(inviteService.list(callerOf(jwt), workspaceId));
    }

    /** Stops a link immediately. */
    @DeleteMapping("/api/v1/workspaces/{workspaceId}/invites/{inviteId}")
    public ResponseEntity<Void> revoke(
            @PathVariable UUID workspaceId,
            @PathVariable UUID inviteId,
            @AuthenticationPrincipal Jwt jwt) {
        inviteService.revoke(callerOf(jwt), workspaceId, inviteId);
        return ResponseEntity.noContent().build();
    }

    /**
     * What this link leads to. Reachable without signing in.
     *
     * <p>Not cached by anything shared: the response is specific to a secret
     * in the URL, and a proxy holding it would hand it to the next caller.
     */
    @GetMapping("/api/v1/invites/{token}")
    public ResponseEntity<InvitePreview> preview(@PathVariable String token) {
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .body(inviteService.preview(token));
    }

    /** Joins the workspace the link names. Requires a session. */
    @PostMapping("/api/v1/invites/{token}/accept")
    public ResponseEntity<InvitePreview> accept(
            @PathVariable String token,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(inviteService.accept(callerOf(jwt), token));
    }

    private static UUID callerOf(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
