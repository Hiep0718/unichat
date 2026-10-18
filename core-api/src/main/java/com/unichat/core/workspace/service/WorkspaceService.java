package com.unichat.core.workspace.service;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workspace.api.CreateWorkspaceRequest;
import com.unichat.core.workspace.api.UpdateWorkspaceRequest;
import com.unichat.core.workspace.api.DiscoverableTopicResponse;
import com.unichat.core.workspace.api.WorkspaceCardStats;
import com.unichat.core.workspace.api.WorkspaceResponse;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceTopic;
import com.unichat.core.workspace.domain.WorkspaceTopicAssignment;
import com.unichat.core.workspace.domain.WorkspaceTopicRepository;
import com.unichat.core.workspace.domain.WorkspaceVisibility;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Orchestrates business logic for workspace lifecycle and membership ACL.
 */
@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceStatsLoader statsLoader;
    private final WorkspaceTopicRepository topicRepository;
    private final Clock clock;

    public WorkspaceService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            WorkspaceStatsLoader statsLoader,
            WorkspaceTopicRepository topicRepository,
            Clock clock) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.statsLoader = statsLoader;
        this.topicRepository = topicRepository;
        this.clock = clock;
    }

    /**
     * Finds workspaces visible to a user.
     */
    @Transactional(readOnly = true)
    public Page<WorkspaceResponse> getWorkspaces(UUID userId, Pageable pageable) {
        Page<Workspace> page = workspaceRepository.findAllVisibleToUser(userId, pageable);
        Map<UUID, WorkspaceCardStats> stats = statsForPage(page);
        return page.map(workspace -> toResponse(workspace, stats, roleOf(workspace, userId)));
    }

    /**
     * Creates a new workspace and sets the owner membership.
     */
    @Transactional
    public WorkspaceResponse createWorkspace(UUID ownerId, CreateWorkspaceRequest request) {
        Instant now = Instant.now(clock);
        UUID workspaceId = UuidGenerator.generateV7();

        boolean cloud = request.cloudAllowed() != null ? request.cloudAllowed() : false;
        Workspace workspace = new Workspace(
                workspaceId,
                ownerId,
                request.name(),
                request.description(),
                request.visibility(),
                cloud,
                now
        );

        WorkspaceMember ownerMember = new WorkspaceMember(
                workspaceId,
                ownerId,
                WorkspaceRole.OWNER,
                WorkspaceMemberStatus.ACTIVE,
                ownerId
        );

        workspaceRepository.save(workspace);
        workspaceMemberRepository.save(ownerMember);
        replaceTopics(workspaceId, request.topics());

        return WorkspaceResponse.from(workspace, statsLoader.loadOne(workspaceId), WorkspaceRole.OWNER);
    }

    /**
     * Gets workspace by ID, validating ACL.
     */
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        WorkspaceRole userRole = null;
        if (!WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            WorkspaceMember member = checkAccess(userId, workspaceId);
            userRole = member.getRole();
        } else {
            userRole = workspaceMemberRepository
                    .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                    .map(WorkspaceMember::getRole)
                    .orElse(null);
        }

        return toResponse(workspace, userRole);
    }

    /**
     * Updates an existing workspace.
     */
    @Transactional
    public WorkspaceResponse updateWorkspace(UUID userId, UUID workspaceId, UpdateWorkspaceRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        // Validate membership / authorization
        WorkspaceMember member = checkAccess(userId, workspaceId);
        if (WorkspaceRole.VIEWER.equals(member.getRole())) {
            throw new AuthorizationError("Không có quyền chỉnh sửa workspace này");
        }

        // Optimistic locking
        if (workspace.getVersion() != request.expectedVersion()) {
            throw new ConflictError("Phiên bản dữ liệu không khớp (optimistic lock conflict)");
        }

        if (request.name() != null) {
            workspace.setName(request.name());
        }
        if (request.description() != null) {
            workspace.setDescription(request.description());
        }
        if (request.visibility() != null) {
            if (!WorkspaceRole.OWNER.equals(member.getRole())) {
                throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền đổi chế độ hiển thị");
            }
            WorkspaceVisibilityPolicy.requireCanChangeTo(
                    request.visibility(), activeMemberCountOf(workspaceId));
            workspace.setVisibility(request.visibility());
            workspace.incrementPermissionVersion();
        }
        if (request.cloudAllowed() != null) {
            if (!WorkspaceRole.OWNER.equals(member.getRole())) {
                throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền đổi cấu hình cloud");
            }
            workspace.setCloudAllowed(request.cloudAllowed());
        }
        // Null means "leave them alone"; an empty list is how a group says it
        // has none, so the two cannot be collapsed.
        if (request.topics() != null) {
            replaceTopics(workspaceId, request.topics());
        }
        workspace.setUpdatedAt(Instant.now(clock));

        workspaceRepository.save(workspace);
        return toResponse(workspace, member.getRole());
    }

    /**
     * Deletes a workspace.
     */
    @Transactional
    public void deleteWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        // Only OWNER can delete
        WorkspaceMember member = checkAccess(userId, workspaceId);
        if (!WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền xóa workspace");
        }

        workspace.setStatus(com.unichat.core.workspace.domain.WorkspaceStatus.DELETING);
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);
        // TODO: Full delete saga when document/chat features are implemented
    }

    /**
     * Finds public workspaces the user has not yet joined.
     *
     * @param userId   authenticated user
     * @param search   optional search term (name/description)
     * @param topic    optional subject filter; null means every topic
     * @param pageable pagination parameters
     */
    @Transactional(readOnly = true)
    public Page<WorkspaceResponse> getPublicWorkspaces(UUID userId, String search,
                                                      WorkspaceTopic topic, Pageable pageable) {
        String searchTerm = (search == null || search.isBlank()) ? "%" : "%" + search.trim() + "%";
        Page<Workspace> page = topic == null
                ? workspaceRepository.findPublicWorkspacesExcludingMember(userId, searchTerm, pageable)
                : workspaceRepository.findPublicWorkspacesByTopic(userId, searchTerm, topic, pageable);
        Map<UUID, WorkspaceCardStats> stats = statsForPage(page);
        return page.map(workspace -> toResponse(workspace, stats, null));
    }

    /**
     * Allows a user to self-join a PUBLIC workspace as VIEWER.
     *
     * @param userId      user joining
     * @param workspaceId target workspace
     */
    @Transactional
    public WorkspaceResponse joinPublicWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            throw new AuthorizationError("Chỉ có thể tham gia workspace công khai");
        }

        boolean alreadyMember = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .isPresent();
        if (alreadyMember) {
            throw new ConflictError("Bạn đã là thành viên của workspace này");
        }

        WorkspaceMember member = new WorkspaceMember(
                workspaceId,
                userId,
                WorkspaceRole.VIEWER,
                WorkspaceMemberStatus.ACTIVE,
                userId
        );
        workspaceMemberRepository.save(member);
        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);

        return toResponse(workspace, WorkspaceRole.VIEWER);
    }

    /**
     * Changes a workspace's visibility on an administrator's authority.
     *
     * <p>Separate from {@link #updateWorkspace} because an administrator is
     * moderating someone else's workspace: they hold no membership in it and
     * carry no {@code expectedVersion} from a form they never opened. The
     * authority itself is checked by the admin controller's own guard.
     *
     * <p>What it does not skip is {@link WorkspaceVisibilityPolicy}. Writing to
     * the repository directly was how this path used to drop a populated
     * workspace to PRIVATE, leaving its members in a workspace labelled as
     * holding nobody.
     *
     * @param workspaceId the workspace being moderated
     * @param visibility  the level to apply
     * @return the workspace as it now stands
     * @throws NotFoundError if no such workspace exists
     */
    @Transactional
    public WorkspaceResponse setVisibilityAsAdmin(UUID workspaceId, WorkspaceVisibility visibility) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        WorkspaceVisibilityPolicy.requireCanChangeTo(visibility, activeMemberCountOf(workspaceId));
        workspace.setVisibility(visibility);
        workspace.incrementPermissionVersion();
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);

        return toResponse(workspace, roleOf(workspace, workspace.getOwnerId()));
    }

    /**
     * Rewrites a workspace's topics.
     *
     * <p>Replace rather than diff: there are at most three, and working out
     * which to add and which to remove is more code than writing them again.
     * Duplicates in the request are ignored rather than rejected, since the
     * primary key would reject them anyway and a client sending the same topic
     * twice meant it once.
     */
    private void replaceTopics(UUID workspaceId, List<WorkspaceTopic> topics) {
        topicRepository.deleteByWorkspaceId(workspaceId);
        if (topics == null || topics.isEmpty()) {
            return;
        }
        new LinkedHashSet<>(topics).forEach(topic ->
                topicRepository.save(new WorkspaceTopicAssignment(workspaceId, topic)));
    }

    /**
     * Topics that currently lead somewhere, for the discovery filter.
     *
     * <p>Ordered by the enum's own declaration order rather than by count, so
     * the rail does not reshuffle itself every time somebody joins a group.
     *
     * @param userId the caller, whose own groups are excluded as everywhere else
     */
    @Transactional(readOnly = true)
    public List<DiscoverableTopicResponse> getDiscoverableTopics(UUID userId) {
        Map<WorkspaceTopic, Long> counts = new EnumMap<>(WorkspaceTopic.class);
        for (Object[] row : topicRepository.countDiscoverableByTopic(userId)) {
            // A value written straight to the database could be outside the
            // vocabulary; it is skipped rather than crashing the whole rail.
            try {
                counts.put(WorkspaceTopic.parse((String) row[0]), ((Number) row[1]).longValue());
            } catch (IllegalArgumentException ignored) {
                continue;
            }
        }
        return counts.entrySet().stream()
                .map(entry -> DiscoverableTopicResponse.of(entry.getKey(), entry.getValue()))
                .toList();
    }

    /** Members still holding access, the owner included. */
    private long activeMemberCountOf(UUID workspaceId) {
        return workspaceMemberRepository
                .countByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE);
    }

    private WorkspaceMember checkAccess(UUID userId, UUID workspaceId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    /** Loads card statistics for a whole page in one go, not per card. */
    private Map<UUID, WorkspaceCardStats> statsForPage(Page<Workspace> page) {
        List<UUID> ids = page.getContent().stream().map(Workspace::getId).toList();
        return statsLoader.loadFor(ids);
    }

    /** Maps one workspace using statistics already loaded for its page. */
    private WorkspaceResponse toResponse(Workspace workspace,
                                         Map<UUID, WorkspaceCardStats> stats,
                                         WorkspaceRole userRole) {
        return WorkspaceResponse.from(
                workspace,
                stats.getOrDefault(workspace.getId(), WorkspaceCardStats.empty()),
                userRole);
    }

    /** Maps one workspace outside a page, loading its statistics alone. */
    private WorkspaceResponse toResponse(Workspace workspace, WorkspaceRole userRole) {
        return WorkspaceResponse.from(workspace, statsLoader.loadOne(workspace.getId()), userRole);
    }

    private WorkspaceRole roleOf(Workspace workspace, UUID userId) {
        return workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspace.getId(), userId, WorkspaceMemberStatus.ACTIVE)
                .map(WorkspaceMember::getRole)
                .orElse(null);
    }
}
