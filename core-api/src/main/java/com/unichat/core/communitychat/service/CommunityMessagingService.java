package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.communitychat.api.MessageResponse;
import com.unichat.core.communitychat.api.SendMessagePayload;
import com.unichat.core.communitychat.domain.CommunityChannel;
import com.unichat.core.communitychat.domain.CommunityChannelRepository;
import com.unichat.core.communitychat.domain.CommunityMessage;
import com.unichat.core.communitychat.domain.CommunityMessageRepository;
import com.unichat.core.communitychat.domain.MessageAuthorType;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;

@Service
public class CommunityMessagingService {

    private static final Logger log = LoggerFactory.getLogger(CommunityMessagingService.class);

    private final CommunityMessageRepository messageRepository;
    private final CommunityChannelRepository channelRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate;

    @Value("${unichat.ai-service.url:http://localhost:8001}")
    private String aiServiceUrl;

    public CommunityMessagingService(CommunityMessageRepository messageRepository,
                                     CommunityChannelRepository channelRepository,
                                     WorkspaceMemberRepository memberRepository,
                                     UserRepository userRepository,
                                     DocumentRepository documentRepository,
                                     SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.channelRepository = channelRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.messagingTemplate = messagingTemplate;
        this.restTemplate = new RestTemplate();
    }

    @Transactional
    public void processAndBroadcastMessage(UUID workspaceId, UUID userId, SendMessagePayload payload) {
        // 1. Validate membership
        memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new AuthorizationError("User is not a member of this workspace"));

        // 2. Validate channel
        CommunityChannel channel = channelRepository.findById(payload.channelId())
                .orElseThrow(() -> new NotFoundError("Channel not found"));
        if (!channel.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Channel does not belong to workspace");
        }

        User author = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundError("User not found"));

        boolean mentionsAi = payload.content().toLowerCase().contains("@ai");

        // 3. Save User Message
        CommunityMessage message = new CommunityMessage(
                UUID.randomUUID(),
                payload.channelId(),
                userId,
                MessageAuthorType.USER,
                payload.content(),
                payload.replyToId(),
                mentionsAi,
                Instant.now()
        );
        messageRepository.save(message);

        // 4. Broadcast User Message
        String authorName = author.getEmail().split("@")[0]; // Use prefix of email as name
        MessageResponse response = MessageResponse.from(message, authorName, null);
        String destination = String.format("/topic/workspaces/%s/channels/%s", workspaceId, channel.getId());
        messagingTemplate.convertAndSend(destination, response);

        // 5. Trigger AI if mentioned
        if (mentionsAi) {
            triggerAiResponseAsync(workspaceId, channel.getId(), message);
        }
    }

    private void triggerAiResponseAsync(UUID workspaceId, UUID channelId, CommunityMessage triggerMessage) {
        CompletableFuture.runAsync(() -> {
            try {
                // Get allowed docs for workspace
                List<UUID> allowedDocUuids = documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId));
                List<String> allowedDocIds = allowedDocUuids.stream().map(UUID::toString).toList();

                // Clean the question (remove @ai)
                String question = triggerMessage.getContent().replaceAll("(?i)@ai\\b", "").trim();

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

                // Save AI Message
                CommunityMessage aiMessage = new CommunityMessage(
                        UUID.randomUUID(),
                        channelId,
                        triggerMessage.getAuthorId(), // Or a specific AI system user ID
                        MessageAuthorType.AI,
                        assistantContent,
                        triggerMessage.getId(), // Reply directly to the triggering message
                        false,
                        Instant.now()
                );
                
                messageRepository.save(aiMessage);

                // Broadcast AI Message
                MessageResponse response = MessageResponse.from(aiMessage, "UniChat AI", null);
                String destination = String.format("/topic/workspaces/%s/channels/%s", workspaceId, channelId);
                messagingTemplate.convertAndSend(destination, response);

            } catch (Exception e) {
                log.error("Failed to generate AI response in community chat", e);
                // Broadcast error message
                CommunityMessage errorMessage = new CommunityMessage(
                        UUID.randomUUID(), channelId, triggerMessage.getAuthorId(), MessageAuthorType.AI,
                        "Xin lỗi, AI hiện không thể trả lời. Vui lòng thử lại sau.", triggerMessage.getId(), false, Instant.now()
                );
                messageRepository.save(errorMessage);
                messagingTemplate.convertAndSend(
                        String.format("/topic/workspaces/%s/channels/%s", workspaceId, channelId),
                        MessageResponse.from(errorMessage, "UniChat AI", null)
                );
            }
        });
    }
}
