package com.unichat.core.communitychat.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.communitychat.api.ChannelResponse;
import com.unichat.core.communitychat.api.MessageResponse;
import com.unichat.core.communitychat.domain.CommunityChannel;
import com.unichat.core.communitychat.domain.CommunityChannelRepository;
import com.unichat.core.communitychat.domain.CommunityMessageRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;

@Service
@Transactional(readOnly = true)
public class CommunityChatService {

    private final CommunityChannelRepository channelRepository;
    private final CommunityMessageRepository messageRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    public CommunityChatService(CommunityChannelRepository channelRepository,
                                CommunityMessageRepository messageRepository,
                                WorkspaceMemberRepository workspaceMemberRepository,
                                UserRepository userRepository) {
        this.channelRepository = channelRepository;
        this.messageRepository = messageRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.userRepository = userRepository;
    }

    /**
     * Lists all channels for a workspace, ensuring the user is a member.
     */
    public List<ChannelResponse> listChannels(UUID workspaceId, UUID userId) {
        verifyMembership(workspaceId, userId);
        return channelRepository.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId)
                .stream()
                .map(ChannelResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves recent messages for a channel.
     */
    public List<MessageResponse> getRecentMessages(UUID workspaceId, UUID channelId, UUID userId, int limit) {
        verifyMembership(workspaceId, userId);
        
        CommunityChannel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new NotFoundError("Channel not found"));
                
        if (!channel.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Channel does not belong to this workspace");
        }

        return messageRepository.findByChannelIdOrderByCreatedAtDesc(channelId, PageRequest.of(0, limit))
                .stream()
                .map(msg -> {
                    return userRepository.findById(msg.getAuthorId())
                            .map(user -> {
                                String authorName = user.getEmail().split("@")[0];
                                return MessageResponse.from(msg, authorName, null);
                            })
                            .orElseGet(() -> MessageResponse.from(msg, "Unknown User", null));
                })
                .collect(Collectors.toList());
    }
    
    private void verifyMembership(UUID workspaceId, UUID userId) {
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new AuthorizationError("User is not a member of this workspace"));
    }
}
