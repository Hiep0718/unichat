package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * Orchestrates RAG questioning, conversation sessions, and internal AI service calls.
 */
@Service
public class ChatService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DocumentRepository documentRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository;
    private final RestTemplate restTemplate;
    private final Clock clock;

    @Value("${unichat.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    public ChatService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            DocumentRepository documentRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository,
            Clock clock) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.documentRepository = documentRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.citationHistoryRepository = citationHistoryRepository;
        this.restTemplate = new RestTemplate();
        this.clock = clock;
    }

    /**
     * Handles asking a question in a workspace with authorized RAG retrieval.
     */
    @Transactional
    public QuestionResponse askQuestion(UUID userId, UUID workspaceId, AskQuestionRequest request, String requestId) {
        validateAccess(userId, workspaceId);

        Instant now = Instant.now(clock);

        // Get or create conversation
        Conversation conversation;
        if (request.conversationId() != null) {
            conversation = conversationRepository.findByUserIdAndIdAndStatus(userId, request.conversationId(), "ACTIVE")
                    .orElseThrow(() -> new NotFoundError("Hội thoại không tồn tại"));
        } else {
            String title = request.question().length() > 50 ? request.question().substring(0, 47) + "..." : request.question();
            conversation = new Conversation(UuidGenerator.generateV7(), workspaceId, userId, title, now);
            conversationRepository.save(conversation);
        }

        // Save User Message
        Message userMessage = new Message(UuidGenerator.generateV7(), conversation.getId(), "USER", request.question(), null, null, null, now);
        messageRepository.save(userMessage);

        // Get authorized document IDs
        List<UUID> allowedDocUuids = documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId));
        List<String> allowedDocIds = allowedDocUuids.stream().map(UUID::toString).toList();

        // Call internal AI Service endpoint /internal/v1/retrieval/answers
        Map<String, Object> aiRequest = Map.of(
                "workspaceId", workspaceId.toString(),
                "allowedDocumentIds", allowedDocIds,
                "question", request.question(),
                "strategyVersion", "v1.0",
                "requestId", requestId != null ? requestId : UUID.randomUUID().toString()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(aiRequest, headers);

        Map<String, Object> aiResponse;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    aiServiceUrl + "/internal/v1/retrieval/answers", entity, Map.class);
            aiResponse = response.getBody() != null ? (Map<String, Object>) response.getBody() : Map.of();
        } catch (Exception e) {
            // Fallback response if AI service call fails
            aiResponse = Map.of(
                    "decision", "REFUSE",
                    "intent", "UNKNOWN",
                    "strategyVersion", "v1.0",
                    "refusalCode", "PROVIDER_UNAVAILABLE",
                    "refusalReason", "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.",
                    "citations", List.of()
            );
        }

        String decision = (String) aiResponse.getOrDefault("decision", "REFUSE");
        String answerText = (String) aiResponse.get("answer");
        String intent = (String) aiResponse.getOrDefault("intent", "FACT");
        String refusalCode = (String) aiResponse.get("refusalCode");
        String refusalReason = (String) aiResponse.get("refusalReason");

        String assistantContent = answerText != null ? answerText : (refusalReason != null ? refusalReason : "Không có câu trả lời");

        String providerModel = (String) aiResponse.getOrDefault("provider", "gemini-2.5-flash");

        // Save Assistant Message
        UUID assistantMessageId = UuidGenerator.generateV7();
        Message assistantMessage = new Message(
                assistantMessageId, conversation.getId(), "ASSISTANT", assistantContent, intent, refusalCode, providerModel, Instant.now(clock));
        messageRepository.save(assistantMessage);

        conversation.setUpdatedAt(Instant.now(clock));
        conversationRepository.save(conversation);

        List<CitationResponse> citations = extractCitations(aiResponse.get("citations"), workspaceId);


        // Persist citation history
        if (!citations.isEmpty()) {
            int ordinal = 1;
            for (CitationResponse c : citations) {
                UUID docId = c.documentId() != null ? c.documentId() : UuidGenerator.generateV7();
                com.unichat.core.chat.domain.CitationHistory ch = new com.unichat.core.chat.domain.CitationHistory(
                        UuidGenerator.generateV7(),
                        assistantMessageId,
                        docId,
                        "chunk-" + ordinal,
                        c.fileName() != null ? c.fileName() : "Tài liệu",
                        "LOCATOR",
                        c.locator() != null ? c.locator() : "",
                        c.excerpt() != null ? c.excerpt() : "",
                        String.valueOf(c.score()),
                        ordinal++
                );
                citationHistoryRepository.save(ch);
            }
        }

        return new QuestionResponse(
                assistantMessageId,
                conversation.getId(),
                decision,
                answerText,
                intent,
                "v1.0",
                citations,
                refusalCode,
                requestId
        );
    }


    private void validateAccess(UUID userId, UUID workspaceId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    @SuppressWarnings("unchecked")
    private List<CitationResponse> extractCitations(Object citationsObj, UUID workspaceId) {
        List<CitationResponse> result = new ArrayList<>();
        List<com.unichat.core.document.domain.Document> wsDocs = documentRepository
                .findByWorkspaceIdExcludingDeleting(workspaceId, org.springframework.data.domain.PageRequest.of(0, 10))
                .getContent();

        if (citationsObj instanceof List<?> list) {
            int idx = 0;
            for (Object item : list) {
                if (item instanceof Map<?, ?> rawMap) {
                    try {
                        String docIdStr = rawMap.get("documentId") != null ? rawMap.get("documentId").toString() : null;
                        UUID docId = docIdStr != null ? UUID.fromString(docIdStr) : null;
                        String fileName = null;
                        if (rawMap.get("fileName") != null) fileName = rawMap.get("fileName").toString();
                        else if (rawMap.get("documentName") != null) fileName = rawMap.get("documentName").toString();
                        else if (rawMap.get("originalName") != null) fileName = rawMap.get("originalName").toString();

                        if ((fileName == null || fileName.isBlank() || "Tài liệu".equals(fileName) || "Tài liệu tham khảo".equals(fileName))) {
                            if (docId != null) {
                                fileName = documentRepository.findById(docId)
                                        .map(com.unichat.core.document.domain.Document::getOriginalName)
                                        .orElse(null);
                            }
                            if ((fileName == null || fileName.isBlank()) && !wsDocs.isEmpty()) {
                                fileName = wsDocs.get(idx % wsDocs.size()).getOriginalName();
                            }
                        }
                        if (fileName == null || fileName.isBlank()) {
                            fileName = "Tài liệu tham khảo";
                        }

                        String locator = rawMap.get("locator") != null ? rawMap.get("locator").toString() : "";
                        String excerpt = rawMap.get("excerpt") != null ? rawMap.get("excerpt").toString() : "";
                        double score = rawMap.get("score") instanceof Number n ? n.doubleValue() : 0.75;
                        result.add(new CitationResponse(docId, fileName, locator, excerpt, score));
                        idx++;
                    } catch (Exception ignored) {}
                }
            }
        }
        return result;
    }


}
