package com.unichat.core.chat.service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.chat.domain.CitationHistory;
import com.unichat.core.chat.domain.CitationHistoryRepository;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.shared.config.ServiceTokenIssuer;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * Service for handling real-time Server-Sent Events (SSE) streaming chat questions.
 */
@Service
public class SseChatService {

    private static final Logger log = LoggerFactory.getLogger(SseChatService.class);

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DocumentRepository documentRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CitationHistoryRepository citationHistoryRepository;
    private final ServiceTokenIssuer serviceTokenIssuer;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${unichat.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    public SseChatService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            DocumentRepository documentRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            CitationHistoryRepository citationHistoryRepository,
            ServiceTokenIssuer serviceTokenIssuer,
            Clock clock,
            ObjectMapper objectMapper) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.documentRepository = documentRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.citationHistoryRepository = citationHistoryRepository;
        this.serviceTokenIssuer = serviceTokenIssuer;
        this.clock = clock;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Prepares the conversation session, saves the user message, and streams AI response tokens via SseEmitter.
     */
    @Transactional
    public SseEmitter askQuestionStream(UUID userId, UUID workspaceId, AskQuestionRequest request, String requestId) {
        validateAccess(userId, workspaceId);

        Instant now = Instant.now(clock);

        // 1. Get or create conversation session
        Conversation conversation;
        if (request.conversationId() != null) {
            conversation = conversationRepository.findByUserIdAndIdAndStatus(userId, request.conversationId(), "ACTIVE")
                    .orElseThrow(() -> new NotFoundError("Hội thoại không tồn tại"));
        } else {
            String title = request.question().length() > 50 ? request.question().substring(0, 47) + "..." : request.question();
            conversation = new Conversation(UuidGenerator.generateV7(), workspaceId, userId, title, now);
            conversationRepository.save(conversation);
        }

        // 2. Save User Message
        Message userMessage = new Message(UuidGenerator.generateV7(), conversation.getId(), "USER", request.question(), null, null, null, now);
        messageRepository.save(userMessage);

        // 3. Create SseEmitter with 5-minute timeout
        SseEmitter emitter = new SseEmitter(300_000L);

        // 4. Get authorized document IDs
        List<UUID> allowedDocUuids = documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId));
        List<String> allowedDocIds = allowedDocUuids.stream().map(UUID::toString).toList();

        final UUID conversationId = conversation.getId();
        final String effectiveRequestId = requestId != null ? requestId : UUID.randomUUID().toString();

        // 5. Asynchronously connect to AI Service SSE streaming endpoint & pipe events
        CompletableFuture.runAsync(() -> streamFromAiService(
                emitter, workspaceId, allowedDocIds, request, effectiveRequestId, conversationId
        ));

        return emitter;
    }

    private void streamFromAiService(
            SseEmitter emitter,
            UUID workspaceId,
            List<String> allowedDocIds,
            AskQuestionRequest request,
            String requestId,
            UUID conversationId) {

        StringBuilder fullTextAccumulator = new StringBuilder();
        final List<Object> citationsHolder = new ArrayList<>();
        final String[] intentHolder = new String[]{"FACT"};
        final String[] refusalCodeHolder = new String[]{null};
        final String[] providerModelHolder = new String[]{"gemini-2.5-flash"};
        final String[] refusalReasonHolder = new String[]{null};

        try {
            Map<String, Object> aiRequestBody = Map.of(
                    "workspaceId", workspaceId.toString(),
                    "allowedDocumentIds", allowedDocIds,
                    "question", request.question(),
                    "strategyVersion", "v1.0",
                    "requestId", requestId,
                    "allowExternalKnowledge", request.allowExternalKnowledge() != null ? request.allowExternalKnowledge() : true
            );

            String requestJson = objectMapper.writeValueAsString(aiRequestBody);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(aiServiceUrl + "/internal/v1/retrieval/answers/stream"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", serviceTokenIssuer.issueToken())
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<InputStream> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

            if (httpResponse.statusCode() != 200) {
                log.warn("AI Service SSE endpoint returned HTTP {}", httpResponse.statusCode());
                sendRefusalAndComplete(emitter, conversationId, requestId, "Dịch vụ AI hiện không khả dụng.");
                return;
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(httpResponse.body(), StandardCharsets.UTF_8))) {
                String line;
                String currentEvent = null;

                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("event: ")) {
                        currentEvent = line.substring(7).trim();
                    } else if (line.startsWith("data: ")) {
                        String dataJson = line.substring(6).trim();
                        if (dataJson.isEmpty()) continue;

                        try {
                            Map<String, Object> dataMap = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});

                            if ("metadata".equals(currentEvent)) {
                                // Inject conversationId into metadata event for frontend reference
                                dataMap.put("conversationId", conversationId.toString());

                                if (dataMap.get("citations") instanceof List<?> cList) {
                                    citationsHolder.addAll(cList);
                                }
                                if (dataMap.get("intent") != null) {
                                    intentHolder[0] = dataMap.get("intent").toString();
                                }
                                if (dataMap.get("providerModel") != null) {
                                    providerModelHolder[0] = dataMap.get("providerModel").toString();
                                }
                                if (dataMap.get("refusalCode") != null) {
                                    refusalCodeHolder[0] = dataMap.get("refusalCode").toString();
                                }
                                if (dataMap.get("refusalReason") != null) {
                                    refusalReasonHolder[0] = dataMap.get("refusalReason").toString();
                                }

                                emitter.send(SseEmitter.event().name("metadata").data(dataMap));

                            } else if ("token".equals(currentEvent)) {
                                String delta = dataMap.get("delta") != null ? dataMap.get("delta").toString() : "";
                                fullTextAccumulator.append(delta);

                                emitter.send(SseEmitter.event().name("token").data(dataMap));

                            } else if ("done".equals(currentEvent)) {
                                dataMap.put("conversationId", conversationId.toString());
                                emitter.send(SseEmitter.event().name("done").data(dataMap));
                            }
                        } catch (Exception e) {
                            log.debug("Error parsing SSE data json: {}", e.getMessage());
                        }
                        currentEvent = null;
                    }
                }
            }

            // Stream finished -> Save Assistant Message and Citations to DB
            String finalAnswer = fullTextAccumulator.toString();
            String assistantContent = !finalAnswer.isBlank() ? finalAnswer :
                    (refusalReasonHolder[0] != null ? refusalReasonHolder[0] : "Không có câu trả lời");

            saveAssistantMessageAndCitations(
                    conversationId,
                    workspaceId,
                    assistantContent,
                    intentHolder[0],
                    refusalCodeHolder[0],
                    providerModelHolder[0],
                    citationsHolder
            );

            emitter.complete();

        } catch (Exception e) {
            log.error("Error streaming from AI Service: ", e);
            sendRefusalAndComplete(emitter, conversationId, requestId, "Lỗi kết nối tới dịch vụ AI.");
        }
    }

    private void sendRefusalAndComplete(SseEmitter emitter, UUID conversationId, String requestId, String reason) {
        try {
            Map<String, Object> meta = Map.of(
                    "conversationId", conversationId.toString(),
                    "decision", "REFUSE",
                    "intent", "UNKNOWN",
                    "refusalCode", "PROVIDER_UNAVAILABLE",
                    "refusalReason", reason,
                    "citations", List.of(),
                    "requestId", requestId
            );
            emitter.send(SseEmitter.event().name("metadata").data(meta));
            emitter.send(SseEmitter.event().name("done").data(Map.of("messageId", requestId, "conversationId", conversationId.toString())));
            saveAssistantMessageAndCitations(conversationId, null, reason, "UNKNOWN", "PROVIDER_UNAVAILABLE", "provider-unavailable", List.of());
            emitter.complete();
        } catch (Exception ignored) {
            emitter.completeWithError(ignored);
        }
    }

    private void saveAssistantMessageAndCitations(
            UUID conversationId,
            UUID workspaceId,
            String assistantContent,
            String intent,
            String refusalCode,
            String providerModel,
            List<Object> citationsObj) {
        try {
            Instant now = Instant.now(clock);
            UUID assistantMessageId = UuidGenerator.generateV7();

            Message assistantMessage = new Message(
                    assistantMessageId, conversationId, "ASSISTANT", assistantContent, intent, refusalCode, providerModel, now
            );
            messageRepository.save(assistantMessage);

            conversationRepository.findById(conversationId).ifPresent(c -> {
                c.setUpdatedAt(now);
                conversationRepository.save(c);
            });

            if (workspaceId != null && citationsObj != null && !citationsObj.isEmpty()) {
                List<CitationResponse> citations = extractCitations(citationsObj, workspaceId);
                int ordinal = 1;
                for (CitationResponse c : citations) {
                    UUID docId = c.documentId() != null ? c.documentId() : UuidGenerator.generateV7();
                    CitationHistory ch = new CitationHistory(
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
        } catch (Exception e) {
            log.error("Failed to save Assistant Message to DB after stream: ", e);
        }
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
