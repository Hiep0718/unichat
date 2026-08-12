package com.unichat.core.contribution.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.contribution.domain.DocumentReview;
import com.unichat.core.contribution.domain.DocumentReviewRepository;
import com.unichat.core.contribution.domain.ReviewDecision;
import com.unichat.core.contribution.domain.ReviewerType;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Handles document contribution review — the OWNER/EDITOR moderation layer.
 */
@Service
public class ContributionService {

    private final DocumentRepository documentRepository;
    private final DocumentReviewRepository reviewRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final Clock clock;

    public ContributionService(
            DocumentRepository documentRepository,
            DocumentReviewRepository reviewRepository,
            WorkspaceMemberRepository memberRepository,
            Clock clock) {
        this.documentRepository = documentRepository;
        this.reviewRepository = reviewRepository;
        this.memberRepository = memberRepository;
        this.clock = clock;
    }

    /**
     * Lists documents pending review in a workspace.
     * Only OWNER and EDITOR can view the contribution queue.
     */
    @Transactional(readOnly = true)
    public Page<Document> getPendingContributions(UUID userId, UUID workspaceId, Pageable pageable) {
        requireReviewerRole(userId, workspaceId);
        return documentRepository.findByWorkspaceIdAndStatus(
                workspaceId, DocumentStatus.PENDING_REVIEW, pageable);
    }

    /**
     * Reviews a contributed document — approve or reject.
     * Only OWNER and EDITOR can review.
     *
     * @param userId      reviewer
     * @param workspaceId workspace containing the document
     * @param documentId  document to review
     * @param approved    true to approve, false to reject
     * @param reason      optional reason (required for rejection)
     */
    @Transactional
    public DocumentReview reviewContribution(
            UUID userId, UUID workspaceId, UUID documentId,
            boolean approved, String reason) {

        WorkspaceMember member = requireReviewerRole(userId, workspaceId);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));

        if (!document.getWorkspaceId().equals(workspaceId)) {
            throw new NotFoundError("Tài liệu không thuộc workspace này");
        }
        if (document.getStatus() != DocumentStatus.PENDING_REVIEW) {
            throw new AuthorizationError("Tài liệu không ở trạng thái chờ duyệt");
        }

        ReviewDecision decision = approved ? ReviewDecision.APPROVED : ReviewDecision.REJECTED;
        ReviewerType reviewerType = mapReviewerType(member.getRole());

        DocumentReview review = new DocumentReview(
                UuidGenerator.generateV7(), documentId, userId,
                reviewerType, decision, reason, Instant.now(clock)
        );
        reviewRepository.save(review);

        DocumentStatus newStatus = approved ? DocumentStatus.PENDING : DocumentStatus.OWNER_REJECTED;
        document.setStatus(newStatus);
        document.setUpdatedAt(Instant.now(clock));
        documentRepository.save(document);

        return review;
    }

    private WorkspaceMember requireReviewerRole(UUID userId, UUID workspaceId) {
        WorkspaceMember member = memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (member.getRole() != WorkspaceRole.OWNER && member.getRole() != WorkspaceRole.EDITOR) {
            throw new AuthorizationError("Chỉ chủ sở hữu hoặc biên tập viên mới có quyền duyệt tài liệu");
        }
        return member;
    }

    private ReviewerType mapReviewerType(WorkspaceRole role) {
        return role == WorkspaceRole.OWNER ? ReviewerType.OWNER : ReviewerType.EDITOR;
    }
}
