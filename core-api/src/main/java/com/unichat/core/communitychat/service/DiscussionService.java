package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.api.CreateDiscussionRequest;
import com.unichat.core.communitychat.api.CreateReplyRequest;
import com.unichat.core.communitychat.api.DiscussionResponse;
import com.unichat.core.communitychat.api.MentionableMember;
import com.unichat.core.communitychat.api.PostAttachmentResponse;
import com.unichat.core.communitychat.api.ReactionSummary;
import com.unichat.core.communitychat.api.UpdateDiscussionRequest;
import com.unichat.core.communitychat.api.ReplyResponse;
import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.MentionEvent;
import com.unichat.core.communitychat.domain.NewReplyEvent;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

@Service
@Transactional(readOnly = true)
public class DiscussionService {

    private static final Logger log = LoggerFactory.getLogger(DiscussionService.class);

    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository replyRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PostAttachmentService attachmentService;
    private final MentionResolver mentionResolver;
    private final ReactionService reactionService;

    public DiscussionService(DiscussionRepository discussionRepository,
                             DiscussionReplyRepository replyRepository,
                             WorkspaceMemberRepository memberRepository,
                             UserRepository userRepository,
                             WorkspaceRepository workspaceRepository,
                             ApplicationEventPublisher eventPublisher,
                             PostAttachmentService attachmentService,
                             MentionResolver mentionResolver,
                             ReactionService reactionService) {
        this.reactionService = reactionService;
        this.mentionResolver = mentionResolver;
        this.attachmentService = attachmentService;
        this.workspaceRepository = workspaceRepository;
        this.discussionRepository = discussionRepository;
        this.replyRepository = replyRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Lists posts in one group.
     *
     * @param query optional full-text search across title and body
     */
    public Page<DiscussionResponse> listDiscussions(UUID workspaceId, UUID userId, String label,
                                                    String sort, String query, int page, int size) {
        verifyMembership(workspaceId, userId);

        // Queries carrying their own ORDER BY must not receive a second one.
        boolean selfOrdered = query != null && !query.isBlank();
        PageRequest pageRequest = selfOrdered || "HOT".equalsIgnoreCase(sort) || "TOP".equalsIgnoreCase(sort)
                ? PageRequest.of(page, size)
                : PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Discussion> result;

        if (selfOrdered) {
            result = discussionRepository.searchByKeyword(List.of(workspaceId), query.trim(), pageRequest);
        } else if (label != null && !label.isBlank()) {
            result = discussionRepository.findByWorkspaceIdAndLabel(workspaceId, label, pageRequest);
        } else if ("HOT".equalsIgnoreCase(sort) || "TOP".equalsIgnoreCase(sort)) {
            result = discussionRepository.findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(workspaceId, pageRequest);
        } else {
            result = discussionRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageRequest);
        }

        List<UUID> discussionIds = result.getContent().stream().map(Discussion::getId).toList();

        // Batch the author, attachment and reaction lookups rather than
        // querying per post.
        Map<UUID, String> authorNames = userRepository
                .findAllById(result.getContent().stream().map(Discussion::getAuthorId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
        Map<UUID, List<PostAttachmentResponse>> attachments = attachmentService.listForAll(discussionIds);
        Map<UUID, ReactionSummary> reactions =
                reactionService.summariseAll("DISCUSSION", discussionIds, userId);

        return result.map(d -> DiscussionResponse.from(
                d,
                null,
                authorNames.getOrDefault(d.getAuthorId(), "Unknown"),
                null,
                attachments.getOrDefault(d.getId(), List.of()),
                reactions.getOrDefault(d.getId(), ReactionSummary.empty())));
    }

    @Transactional
    public DiscussionResponse getDiscussion(UUID workspaceId, UUID discussionId, UUID userId) {
        verifyMembership(workspaceId, userId);

        Discussion discussion = requirePost(workspaceId, discussionId);

        discussion.incrementViewCount();
        discussionRepository.save(discussion);

        return toResponse(workspaceId, discussion, userId);
    }

    @Transactional
    public DiscussionResponse createDiscussion(UUID workspaceId, UUID userId, CreateDiscussionRequest request) {
        WorkspaceMember member = verifyMembership(workspaceId, userId);

        String label = (request.label() != null && !request.label().isBlank()) ? request.label().toUpperCase() : "DISCUSSION";
        
        if ("ANNOUNCEMENT".equals(label) && member.getRole() == WorkspaceRole.VIEWER) {
            throw new AuthorizationError("Only workspace owners and editors can create announcements");
        }

        Discussion discussion = new Discussion(
                UUID.randomUUID(),
                workspaceId,
                userId,
                request.title(),
                request.body(),
                label,
                false,
                "OPEN",
                Instant.now()
        );
        discussion.setBackgroundKey(
                PostBackground.validate(request.backgroundKey(), request.body()));
        discussionRepository.save(discussion);
        publishMentions(workspaceId, discussion.getId(), null, userId, request.body());

        String authorName = userRepository.findById(userId).map(User::getDisplayName).orElse("Người dùng");
        return DiscussionResponse.from(discussion, authorName, null);
    }

    /**
     * Pins or unpins a post so it sorts to the top of its group. Restricted to
     * owners and editors: pinning claims the group's attention.
     */
    @Transactional
    public DiscussionResponse setPinned(UUID workspaceId, UUID discussionId, UUID userId, boolean pinned) {
        WorkspaceMember member = verifyMembership(workspaceId, userId);
        if (!WorkspaceRole.OWNER.equals(member.getRole())
                && !WorkspaceRole.EDITOR.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu và người biên tập mới được ghim bài viết");
        }

        Discussion discussion = requirePost(workspaceId, discussionId);
        discussion.setPinned(pinned);
        discussion.setUpdatedAt(Instant.now());
        discussionRepository.save(discussion);

        return toResponse(workspaceId, discussion, userId);
    }

    /**
     * Members the composer may suggest for a mention. Membership is verified
     * first, so the roster never leaks to someone outside the group.
     */
    public List<MentionableMember> listMentionableMembers(UUID workspaceId, UUID userId) {
        verifyMembership(workspaceId, userId);
        return mentionResolver.listMentionable(workspaceId);
    }

    /**
     * Notifies anyone the text names. Resolution is scoped to active workspace
     * members, so a mention never reaches someone who cannot open the post.
     */
    private void publishMentions(UUID workspaceId, UUID discussionId, UUID replyId,
                                 UUID authorId, String text) {
        List<UUID> mentioned = mentionResolver.resolve(workspaceId, text, authorId);
        if (mentioned.isEmpty()) {
            return;
        }
        eventPublisher.publishEvent(
                new MentionEvent(workspaceId, discussionId, replyId, authorId, mentioned));
    }

    public List<ReplyResponse> getReplies(UUID workspaceId, UUID discussionId, UUID userId) {
        verifyMembership(workspaceId, userId);
        
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Discussion not found"));
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Discussion does not belong to this workspace");
        }

        List<DiscussionReply> replies = replyRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId);
        List<UUID> replyIds = replies.stream().map(DiscussionReply::getId).toList();
        
        Map<UUID, ReactionSummary> reactions =
                reactionService.summariseAll("DISCUSSION_REPLY", replyIds, userId);
        Map<UUID, String> authorNames = userRepository
                .findAllById(replies.stream().map(DiscussionReply::getAuthorId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));

        return replies.stream()
                .map(r -> ReplyResponse.from(
                        r,
                        authorNames.getOrDefault(r.getAuthorId(), "Người dùng"),
                        null,
                        reactions.getOrDefault(r.getId(), ReactionSummary.empty())))
                .collect(Collectors.toList());
    }

    @Transactional
    public ReplyResponse addReply(UUID workspaceId, UUID discussionId, UUID userId, CreateReplyRequest request) {
        verifyMembership(workspaceId, userId);

        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Discussion not found"));
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Discussion does not belong to this workspace");
        }
        if ("CLOSED".equals(discussion.getStatus()) || "ARCHIVED".equals(discussion.getStatus())) {
            throw new AuthorizationError("Cannot reply to a closed or archived discussion");
        }

        DiscussionReply reply = new DiscussionReply(
                UUID.randomUUID(),
                discussionId,
                userId,
                request.body(),
                request.parentReplyId(),
                false,
                Instant.now()
        );
        replyRepository.save(reply);

        discussion.incrementReplyCount();
        discussion.setUpdatedAt(Instant.now());
        discussionRepository.save(discussion);
        
        eventPublisher.publishEvent(new NewReplyEvent(
                workspaceId, discussionId, userId, discussion.getAuthorId(), reply.getId()
        ));
        publishMentions(workspaceId, discussionId, reply.getId(), userId, request.body());

        if (request.body().toLowerCase().contains("@ai")) {
            // Answered after this transaction commits: the assistant's reply hangs
            // off this one, so its row has to exist first.
            eventPublisher.publishEvent(new AiMentionEvent(
                    workspaceId, discussionId, reply.getId(),
                    discussion.getTitle(), request.body()));
        }

        String authorName = userRepository.findById(userId).map(User::getDisplayName).orElse("Người dùng");
        return ReplyResponse.from(reply, authorName, null, ReactionSummary.empty());
    }

    /**
     * Accepts a reply as the best answer (StackOverflow-style).
     * Only the discussion author can accept.
     */
    @Transactional
    public DiscussionResponse acceptReply(UUID workspaceId, UUID discussionId,
                                           UUID replyId, UUID userId) {
        verifyMembership(workspaceId, userId);

        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Discussion not found"));
        if (!discussion.getAuthorId().equals(userId)) {
            throw new AuthorizationError("Only the post author can accept an answer");
        }

        DiscussionReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new NotFoundError("Reply not found"));

        // Without this check any reply id can be accepted, including one from
        // another discussion or another workspace entirely.
        if (!reply.getDiscussionId().equals(discussionId)) {
            throw new AuthorizationError("Reply does not belong to this discussion");
        }

        discussion.setAcceptedReplyId(replyId);
        discussion.setUpdatedAt(Instant.now());
        discussionRepository.save(discussion);

        String authorName = userRepository.findById(userId)
                .map(User::getDisplayName).orElse("Người dùng");
        return DiscussionResponse.from(discussion, authorName, null);
    }

    /**
     * Requires an active membership. Filtering on status matters: a member whose
     * access was revoked still satisfies a plain workspace-and-user lookup.
     */
    private WorkspaceMember verifyMembership(UUID workspaceId, UUID userId) {
        return memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new AuthorizationError("Bạn không phải thành viên của nhóm này"));
    }

    /**
     * Edits a post. Only its author may edit, and only the text changes; the
     * label is fixed at creation so the announcement role check cannot be
     * bypassed afterwards.
     */
    @Transactional
    public DiscussionResponse updateDiscussion(UUID workspaceId, UUID discussionId, UUID userId,
                                               UpdateDiscussionRequest request) {
        verifyMembership(workspaceId, userId);
        Discussion discussion = requirePost(workspaceId, discussionId);

        if (!discussion.getAuthorId().equals(userId)) {
            throw new AuthorizationError("Chỉ tác giả mới có thể chỉnh sửa bài viết");
        }

        discussion.applyEdit(request.title(), request.body(), Instant.now());
        discussion.setBackgroundKey(
                PostBackground.validate(request.backgroundKey(), request.body()));
        discussionRepository.save(discussion);
        publishMentions(workspaceId, discussionId, null, userId, request.body());

        return toResponse(workspaceId, discussion, userId);
    }

    /**
     * Removes a post. The author may remove their own; an owner or editor may
     * remove any post in their group. The row is kept so replies and bookmarks
     * stay referentially valid, but every listing drops it.
     */
    @Transactional
    public void deleteDiscussion(UUID workspaceId, UUID discussionId, UUID userId) {
        WorkspaceMember member = verifyMembership(workspaceId, userId);
        Discussion discussion = requirePost(workspaceId, discussionId);

        boolean isAuthor = discussion.getAuthorId().equals(userId);
        boolean canModerate = WorkspaceRole.OWNER.equals(member.getRole())
                || WorkspaceRole.EDITOR.equals(member.getRole());

        if (!isAuthor && !canModerate) {
            throw new AuthorizationError("Bạn không có quyền xoá bài viết này");
        }

        discussion.markDeleted(Instant.now());
        discussionRepository.save(discussion);
        log.info("Soft-deleted discussion {} in workspace {}", discussionId, workspaceId);
    }

    private Discussion requirePost(UUID workspaceId, UUID discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Bài viết không tồn tại"));
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Bài viết không thuộc Workspace này");
        }
        if ("DELETED".equals(discussion.getStatus())) {
            throw new NotFoundError("Bài viết không tồn tại");
        }
        return discussion;
    }

    /** Builds the full response for one post: author, attachments, reactions. */
    private DiscussionResponse toResponse(UUID workspaceId, Discussion discussion, UUID userId) {
        String authorName = userRepository.findById(discussion.getAuthorId())
                .map(User::getDisplayName).orElse("Người dùng");
        String workspaceName = workspaceRepository.findById(workspaceId)
                .map(Workspace::getName).orElse(null);
        ReactionSummary reactions = reactionService
                .summariseAll("DISCUSSION", List.of(discussion.getId()), userId)
                .getOrDefault(discussion.getId(), ReactionSummary.empty());

        return DiscussionResponse.from(discussion, workspaceName, authorName, null,
                attachmentService.listFor(discussion.getId()), reactions);
    }

}
