package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.api.CreateDiscussionRequest;
import com.unichat.core.communitychat.api.CreateReplyRequest;
import com.unichat.core.communitychat.api.DiscussionResponse;
import com.unichat.core.communitychat.api.ReplyResponse;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.NewReplyEvent;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;

@Service
@Transactional(readOnly = true)
public class DiscussionService {

    private static final Logger log = LoggerFactory.getLogger(DiscussionService.class);

    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository replyRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RestTemplate restTemplate;
    private final ReactionRepository reactionRepository;

    @Value("${unichat.ai-service.url:http://localhost:8001}")
    private String aiServiceUrl;

    public DiscussionService(DiscussionRepository discussionRepository,
                             DiscussionReplyRepository replyRepository,
                             WorkspaceMemberRepository memberRepository,
                             UserRepository userRepository,
                             DocumentRepository documentRepository,
                             ApplicationEventPublisher eventPublisher,
                             ReactionRepository reactionRepository) {
        this.discussionRepository = discussionRepository;
        this.replyRepository = replyRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.eventPublisher = eventPublisher;
        this.reactionRepository = reactionRepository;
        this.restTemplate = new RestTemplate();
    }

    public Page<DiscussionResponse> listDiscussions(UUID workspaceId, UUID userId, String label, String sort, int page, int size) {
        verifyMembership(workspaceId, userId);
        
        PageRequest pageRequest;
        if ("HOT".equalsIgnoreCase(sort)) {
            pageRequest = PageRequest.of(page, size);
        } else if ("TOP".equalsIgnoreCase(sort)) {
            pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "voteScore", "createdAt"));
        } else { // NEW default
            pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        Page<Discussion> result;
        
        if (label != null && !label.isBlank()) {
            result = discussionRepository.findByWorkspaceIdAndLabel(workspaceId, label, pageRequest);
        } else {
            if ("HOT".equalsIgnoreCase(sort)) {
                result = discussionRepository.findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(workspaceId, pageRequest);
            } else if ("TOP".equalsIgnoreCase(sort)) {
                result = discussionRepository.findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(workspaceId, pageRequest); // Can optimize further later
            } else {
                result = discussionRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId, pageRequest);
            }
        }

        List<UUID> discussionIds = result.getContent().stream().map(Discussion::getId).toList();
        Map<UUID, String> userVotes = reactionRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, "DISCUSSION", discussionIds)
                .stream().collect(Collectors.toMap(Reaction::getTargetId, Reaction::getReactionType));

        return result.map(d -> {
            String authorName = userRepository.findById(d.getAuthorId())
                    .map(u -> u.getEmail().split("@")[0])
                    .orElse("Unknown");
            return DiscussionResponse.from(d, authorName, null, userVotes.get(d.getId()));
        });
    }

    @Transactional
    public DiscussionResponse getDiscussion(UUID workspaceId, UUID discussionId, UUID userId) {
        verifyMembership(workspaceId, userId);
        
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Discussion not found"));
                
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Discussion does not belong to this workspace");
        }
        
        discussion.incrementViewCount();
        discussionRepository.save(discussion);

        String authorName = userRepository.findById(discussion.getAuthorId())
                .map(u -> u.getEmail().split("@")[0])
                .orElse("Unknown");
                
        String userVote = reactionRepository.findByUserIdAndTargetTypeAndTargetId(userId, "DISCUSSION", discussionId)
                .map(Reaction::getReactionType).orElse(null);
                
        return DiscussionResponse.from(discussion, authorName, null, userVote);
    }

    @Transactional
    public DiscussionResponse createDiscussion(UUID workspaceId, UUID userId, CreateDiscussionRequest request) {
        verifyMembership(workspaceId, userId);

        String label = (request.label() != null && !request.label().isBlank()) ? request.label().toUpperCase() : "DISCUSSION";

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
        discussionRepository.save(discussion);

        String authorName = userRepository.findById(userId).map(u -> u.getEmail().split("@")[0]).orElse("Unknown");
        return DiscussionResponse.from(discussion, authorName, null, null);
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
        
        Map<UUID, String> userVotes = reactionRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, "DISCUSSION_REPLY", replyIds)
                .stream().collect(Collectors.toMap(Reaction::getTargetId, Reaction::getReactionType));

        return replies.stream()
                .map(r -> {
                    String authorName = userRepository.findById(r.getAuthorId())
                            .map(u -> u.getEmail().split("@")[0])
                            .orElse("Unknown");
                    return ReplyResponse.from(r, authorName, null, userVotes.get(r.getId()));
                })
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

        if (request.body().toLowerCase().contains("@ai")) {
            triggerAiResponseAsync(workspaceId, discussion, reply);
        }

        String authorName = userRepository.findById(userId).map(u -> u.getEmail().split("@")[0]).orElse("Unknown");
        return ReplyResponse.from(reply, authorName, null, null);
    }

    private void verifyMembership(UUID workspaceId, UUID userId) {
        memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new AuthorizationError("User is not a member of this workspace"));
    }

    private void triggerAiResponseAsync(UUID workspaceId, Discussion discussion, DiscussionReply triggerReply) {
        CompletableFuture.runAsync(() -> {
            try {
                List<UUID> allowedDocUuids = documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId));
                List<String> allowedDocIds = allowedDocUuids.stream().map(UUID::toString).toList();

                String question = triggerReply.getBody().replaceAll("(?i)@ai\\b", "").trim();
                // Contextualize question with discussion title if it's too short
                if (question.length() < 10) {
                    question = "Trong chủ đề '" + discussion.getTitle() + "', " + question;
                }

                Map<String, Object> aiRequest = Map.of(
                        "workspaceId", workspaceId.toString(),
                        "allowedDocumentIds", allowedDocIds,
                        "question", question,
                        "strategyVersion", "v1.0",
                        "requestId", UUID.randomUUID().toString()
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(aiRequest, headers);

                ResponseEntity<Map> responseEntity = restTemplate.postForEntity(
                        aiServiceUrl + "/internal/v1/retrieval/answers", entity, Map.class);
                
                Map<String, Object> aiResponse = (responseEntity.getBody() != null) ? responseEntity.getBody() : Map.of();
                String answerText = (String) aiResponse.get("answer");
                String assistantContent = answerText != null ? answerText : "Không có câu trả lời";

                DiscussionReply aiReply = new DiscussionReply(
                        UUID.randomUUID(),
                        discussion.getId(),
                        triggerReply.getAuthorId(), // Fallback user ID
                        assistantContent,
                        triggerReply.getId(),
                        true,
                        Instant.now()
                );
                
                // In a real app we need a programmatic transaction here
                replyRepository.save(aiReply);

            } catch (Exception e) {
                log.error("Failed to generate AI response in discussion", e);
            }
        });
    }
}
