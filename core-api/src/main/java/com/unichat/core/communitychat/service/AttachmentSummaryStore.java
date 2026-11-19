package com.unichat.core.communitychat.service;

import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Reads and records the state of an attachment's AI summary.
 *
 * <p>Each method is one short transaction; inference never runs inside one.
 */
@Service
public class AttachmentSummaryStore {

    private static final Logger log = LoggerFactory.getLogger(AttachmentSummaryStore.class);

    private final DiscussionRepository discussionRepository;
    private final PostAttachmentRepository attachmentRepository;
    private final WorkspaceMemberRepository memberRepository;

    /**
     * @param discussionRepository posts, to check the attachment's thread
     * @param attachmentRepository attachments and their summaries
     * @param memberRepository     memberships, to check the reader
     */
    public AttachmentSummaryStore(DiscussionRepository discussionRepository,
                                  PostAttachmentRepository attachmentRepository,
                                  WorkspaceMemberRepository memberRepository) {
        this.discussionRepository = discussionRepository;
        this.attachmentRepository = attachmentRepository;
        this.memberRepository = memberRepository;
    }

    /**
     * Loads an attachment a member may read.
     *
     * @return the attachment
     * @throws AuthorizationError when the user is not an active member
     * @throws NotFoundError      when the post or attachment does not exist in that group
     */
    @Transactional(readOnly = true)
    public PostAttachment read(UUID workspaceId, UUID discussionId, UUID attachmentId, UUID userId) {
        memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new AuthorizationError("Bạn không phải thành viên của nhóm này"));
        return find(workspaceId, discussionId, attachmentId)
                .orElseThrow(() -> new NotFoundError("Tệp đính kèm không tồn tại"));
    }

    /**
     * Loads an attachment that can be summarised.
     *
     * @return the attachment, possibly already summarised
     * @throws ConflictError when it is an image, or its document is not in the library yet
     */
    @Transactional(readOnly = true)
    public PostAttachment readSummarisable(UUID workspaceId, UUID discussionId, UUID attachmentId, UUID userId) {
        PostAttachment attachment = read(workspaceId, discussionId, attachmentId, userId);
        if (attachment.getKind() == AttachmentKind.IMAGE) {
            throw new ConflictError("Ảnh không có tóm tắt AI.");
        }
        if (attachment.getDocumentId() == null) {
            throw new ConflictError("Tài liệu đang chờ trưởng nhóm duyệt, chưa tóm tắt được.");
        }
        return attachment;
    }

    /** Records that a summary is being produced. */
    @Transactional
    public void markRequested(UUID attachmentId) {
        attachmentRepository.findById(attachmentId).ifPresent(attachment -> {
            attachment.markSummaryRequested();
            attachmentRepository.save(attachment);
        });
    }

    /**
     * Records the outcome, unless the post or attachment went away meanwhile.
     *
     * @param summary the summary, or null when none was produced
     * @return true when the outcome was stored
     */
    @Transactional
    public boolean record(UUID workspaceId, UUID discussionId, UUID attachmentId, String summary) {
        Optional<PostAttachment> found = find(workspaceId, discussionId, attachmentId);
        if (found.isEmpty()) {
            log.info("Skipped summary for attachment {}: post or attachment is gone", attachmentId);
            return false;
        }
        PostAttachment attachment = found.get();
        if (summary == null) {
            attachment.markSummaryUnavailable();
        } else {
            attachment.attachSummary(summary);
        }
        attachmentRepository.save(attachment);
        log.info("Summary for attachment {}: {}", attachmentId, summary == null ? "unavailable" : "ready");
        return true;
    }

    private Optional<PostAttachment> find(UUID workspaceId, UUID discussionId, UUID attachmentId) {
        boolean postIsLive = discussionRepository.findById(discussionId)
                .filter(post -> post.getWorkspaceId().equals(workspaceId))
                .filter(post -> !"DELETED".equals(post.getStatus()))
                .isPresent();
        return postIsLive ? attachmentRepository.findByIdAndDiscussionId(attachmentId, discussionId) : Optional.empty();
    }
}
