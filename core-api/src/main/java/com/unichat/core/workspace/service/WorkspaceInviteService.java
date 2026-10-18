package com.unichat.core.workspace.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.api.CreateInviteRequest;
import com.unichat.core.workspace.api.InvitePreview;
import com.unichat.core.workspace.api.InviteResponse;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceInvite;
import com.unichat.core.workspace.domain.WorkspaceInviteRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceStatus;

/**
 * Invite links: issuing them, showing what they lead to, and redeeming them.
 *
 * <p>Answers the one thing inviting by email cannot: reaching a person who has
 * no account yet. {@code addMember} looks an address up and refuses what it
 * cannot find, so until now a group could only admit people who had already
 * registered. A link also travels outside the product, which Work Chat cannot
 * — Work Chat reaches only people who already share a workspace with you, who
 * are exactly the people needing no invitation.
 *
 * <p>Governed by the same ladder as everything else: a PRIVATE workspace holds
 * nobody but its owner, so it issues no links either. That rule is not
 * restated here; it is read from {@link WorkspaceVisibilityPolicy}.
 *
 * @see WorkspaceVisibilityPolicy
 */
@Service
@Transactional(readOnly = true)
public class WorkspaceInviteService {

    /** 256 bits, so guessing a live token is not a strategy. */
    private static final int TOKEN_BYTES = 32;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String UNKNOWN_NAME = "Người dùng";

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceInviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public WorkspaceInviteService(WorkspaceRepository workspaceRepository,
                                  WorkspaceMemberRepository memberRepository,
                                  WorkspaceInviteRepository inviteRepository,
                                  UserRepository userRepository,
                                  Clock clock) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.inviteRepository = inviteRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Issues a link for a workspace.
     *
     * <p>The raw token is returned here and nowhere else, because only its
     * hash is stored. An owner who loses it revokes the link and issues
     * another, which is the same thing every system that stores secrets this
     * way has to do.
     *
     * @throws AuthorizationError if the caller does not own the workspace
     * @throws ValidationError    if the workspace is PRIVATE, or OWNER was
     *                            asked for
     */
    @Transactional
    public InviteResponse create(UUID callerId, UUID workspaceId, CreateInviteRequest request) {
        Workspace workspace = requireOwned(callerId, workspaceId);
        WorkspaceVisibilityPolicy.requireCanAddMember(workspace.getVisibility());
        requireGrantableRole(request.role());

        String token = newToken();
        Instant now = Instant.now(clock);
        WorkspaceInvite invite = inviteRepository.save(new WorkspaceInvite(
                UuidGenerator.generateV7(),
                workspaceId,
                hash(token),
                request.role(),
                callerId,
                now,
                now.plus(Duration.ofDays(request.expiresInDays())),
                request.maxUses()));

        return InviteResponse.created(invite, token, now);
    }

    /** A workspace's links, newest first. Tokens are gone and stay gone. */
    public List<InviteResponse> list(UUID callerId, UUID workspaceId) {
        requireOwned(callerId, workspaceId);
        Instant now = Instant.now(clock);
        return inviteRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(invite -> InviteResponse.existing(invite, now))
                .toList();
    }

    /**
     * Stops a link. Idempotent, so a second click is not an error.
     *
     * @throws NotFoundError if the link belongs to another workspace, which is
     *                       the same answer as it not existing
     */
    @Transactional
    public void revoke(UUID callerId, UUID workspaceId, UUID inviteId) {
        requireOwned(callerId, workspaceId);
        WorkspaceInvite invite = inviteRepository.findById(inviteId)
                .filter(candidate -> candidate.getWorkspaceId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundError("Link mời không tồn tại"));

        invite.revoke(Instant.now(clock));
        inviteRepository.save(invite);
    }

    /**
     * What a link leads to, for someone who may not be signed in.
     *
     * <p>Unauthenticated by design: a visitor who sees only a login screen has
     * no idea what they were invited to, or by whom, and no reason to trust
     * it. What is returned is kept to that question alone — see
     * {@link InvitePreview} for what is deliberately left out.
     *
     * @throws NotFoundError when the link is unknown, spent, expired or
     *                       revoked, all answered identically so a stranger
     *                       cannot tell a dead link from a wrong one
     */
    public InvitePreview preview(String token) {
        WorkspaceInvite invite = requireUsable(token);
        Workspace workspace = requireActiveWorkspace(invite.getWorkspaceId());

        return new InvitePreview(
                workspace.getId(),
                workspace.getName(),
                displayNameOf(invite.getCreatedById()),
                invite.getRole());
    }

    /**
     * Joins the workspace the link names.
     *
     * <p>The use is counted here rather than at preview, because the preview
     * is public and chat clients fetch it by themselves: counting there would
     * let an unfurl bot spend the invitation before its recipient opened it.
     *
     * @return the workspace that was joined
     * @throws ConflictError if the caller is already an active member
     */
    @Transactional
    public InvitePreview accept(UUID callerId, String token) {
        WorkspaceInvite invite = requireUsable(token);
        Workspace workspace = requireActiveWorkspace(invite.getWorkspaceId());
        requireNotAlreadyIn(workspace.getId(), callerId);

        memberRepository.save(new WorkspaceMember(
                workspace.getId(), callerId, invite.getRole(),
                WorkspaceMemberStatus.ACTIVE, invite.getCreatedById()));

        invite.recordUse();
        inviteRepository.save(invite);

        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);

        return new InvitePreview(workspace.getId(), workspace.getName(),
                displayNameOf(invite.getCreatedById()), invite.getRole());
    }

    /* ---------- Private helpers ---------- */

    private Workspace requireOwned(UUID callerId, UUID workspaceId) {
        Workspace workspace = requireActiveWorkspace(workspaceId);
        WorkspaceMember member = memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, callerId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới tạo được link mời");
        }
        return workspace;
    }

    private Workspace requireActiveWorkspace(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .filter(workspace -> WorkspaceStatus.ACTIVE.equals(workspace.getStatus()))
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    private WorkspaceInvite requireUsable(String token) {
        if (token == null || token.isBlank()) {
            throw new NotFoundError("Link mời không hợp lệ hoặc đã hết hạn");
        }
        return inviteRepository.findByTokenHash(hash(token))
                .filter(invite -> invite.isUsable(Instant.now(clock)))
                .orElseThrow(() -> new NotFoundError("Link mời không hợp lệ hoặc đã hết hạn"));
    }

    private void requireNotAlreadyIn(UUID workspaceId, UUID userId) {
        boolean present = memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .isPresent();
        if (present) {
            throw new ConflictError("Bạn đã là thành viên của workspace này");
        }
    }

    /** A link must never confer ownership: it can be forwarded by anyone. */
    private static void requireGrantableRole(WorkspaceRole role) {
        if (WorkspaceRole.OWNER.equals(role)) {
            throw new ValidationError("Link mời không thể cấp quyền chủ sở hữu");
        }
    }

    private String displayNameOf(UUID userId) {
        return userRepository.findById(userId).map(User::getDisplayName).orElse(UNKNOWN_NAME);
    }

    private static String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Hashes a token for storage and lookup.
     *
     * <p>Plain SHA-256 rather than a password hash on purpose: this is 256
     * bits of machine-generated randomness, not something a person chose, so
     * there is no dictionary to slow an attacker down with — and a per-row
     * salt would make lookup by hash impossible.
     */
    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the platform", e);
        }
    }
}
