package com.unichat.core.communitychat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.api.FeedPostResponse;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

@Service
@Transactional(readOnly = true)
public class FeedService {

    private final DiscussionRepository discussionRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ReactionRepository reactionRepository;

    public FeedService(DiscussionRepository discussionRepository,
                       WorkspaceMemberRepository memberRepository,
                       WorkspaceRepository workspaceRepository,
                       UserRepository userRepository,
                       ReactionRepository reactionRepository) {
        this.discussionRepository = discussionRepository;
        this.memberRepository = memberRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.reactionRepository = reactionRepository;
    }

    public Page<FeedPostResponse> getFeed(UUID userId, String sort, int page, int size) {
        List<UUID> workspaceIds = memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE)
                .stream().map(WorkspaceMember::getWorkspaceId).toList();
                
        if (workspaceIds.isEmpty()) {
            return Page.empty();
        }

        PageRequest pageRequest;
        if ("HOT".equalsIgnoreCase(sort)) {
            pageRequest = PageRequest.of(page, size);
        } else {
            pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        Page<Discussion> result;
        if ("HOT".equalsIgnoreCase(sort)) {
            result = discussionRepository.findByWorkspaceIdInOrderByVoteScoreDescCreatedAtDesc(workspaceIds, pageRequest);
        } else {
            result = discussionRepository.findByWorkspaceIdInOrderByCreatedAtDesc(workspaceIds, pageRequest);
        }

        List<UUID> discussionIds = result.getContent().stream().map(Discussion::getId).toList();
        Map<UUID, String> userVotes = reactionRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, "DISCUSSION", discussionIds)
                .stream().collect(Collectors.toMap(Reaction::getTargetId, Reaction::getReactionType));

        return result.map(d -> {
            String wsName = workspaceRepository.findById(d.getWorkspaceId()).map(Workspace::getName).orElse("Unknown");
            String authorName = userRepository.findById(d.getAuthorId()).map(u -> u.getEmail().split("@")[0]).orElse("Unknown");
            
            return new FeedPostResponse(
                    d.getId(), d.getWorkspaceId(), wsName, d.getAuthorId(), authorName, null,
                    d.getTitle(), d.getBody(), d.getLabel(), d.getVoteScore(), d.getReplyCount(),
                    userVotes.get(d.getId()), d.getCreatedAt()
            );
        });
    }
}
