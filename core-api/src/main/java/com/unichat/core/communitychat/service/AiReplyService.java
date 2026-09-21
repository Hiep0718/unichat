package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.ReplyCitation;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;

/**
 * Answers {@code @AI} mentions inside a discussion thread.
 *
 * <p>The answer is posted by a system account and keeps the citations the AI
 * Service returned, so a reader can check the claim against the group's own
 * documents. Retrieval stays scoped to the documents the Core API already
 * approved for that workspace; the AI Service never decides what is allowed.
 */
@Service
public class AiReplyService {

    /** Account the assistant posts as; inserted by migration V19. */
    public static final UUID ASSISTANT_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-0000000000a1");

    /** Name shown for {@link #ASSISTANT_USER_ID} instead of its system email. */
    public static final String ASSISTANT_DISPLAY_NAME = "Trợ lý AI";

    private static final Logger log = LoggerFactory.getLogger(AiReplyService.class);

    private static final int MAX_CITATIONS = 8;
    private static final int EXCERPT_LIMIT = 500;
    private static final int SHORT_QUESTION = 10;
    private static final String UNKNOWN_DOCUMENT = "Tài liệu tham khảo";
    private static final String UNAVAILABLE =
            "Trợ lý chưa trả lời được lúc này. Bạn thử nhắc lại sau ít phút nhé.";

    private final DocumentRepository documentRepository;
    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository replyRepository;
    private final AiRetrievalClient retrievalClient;

    public AiReplyService(DocumentRepository documentRepository,
                          DiscussionRepository discussionRepository,
                          DiscussionReplyRepository replyRepository,
                          AiRetrievalClient retrievalClient) {
        this.documentRepository = documentRepository;
        this.discussionRepository = discussionRepository;
        this.replyRepository = replyRepository;
        this.retrievalClient = retrievalClient;
    }

    /**
     * Posts the assistant's answer to a thread.
     *
     * <p>Waiting for the commit matters twice over: the triggering reply is this
     * answer's parent, so the foreign key needs its row on disk, and answering a
     * reply that rolled back would be answering nothing.
     *
     * @param event the mention to answer
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAiMention(AiMentionEvent event) {
        UUID traceId = UUID.randomUUID();
        List<UUID> allowed =
                documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(event.workspaceId()));
        Map<String, Object> answer = retrievalClient.ask(
                event.workspaceId(), allowed, questionOf(event), traceId);

        DiscussionReply reply = new DiscussionReply(
                UUID.randomUUID(),
                event.discussionId(),
                ASSISTANT_USER_ID,
                answerTextOf(answer),
                event.triggerReplyId(),
                true,
                Instant.now());
        reply.setCitations(extractCitations(answer.get("citations")));
        reply.setRetrievalTraceId(traceId);
        replyRepository.save(reply);

        countReply(event.discussionId());
        log.info("Assistant answered discussion {} with {} citations (trace {})",
                event.discussionId(), reply.getCitations().size(), traceId);
    }

    /** Keeps the thread's reply count and ordering honest after an AI answer. */
    private void countReply(UUID discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId).orElse(null);
        if (discussion == null) {
            return;
        }
        discussion.incrementReplyCount();
        discussion.setUpdatedAt(Instant.now());
        discussionRepository.save(discussion);
    }

    /** Strips the handle and, for a terse reply, restores the post's topic. */
    private static String questionOf(AiMentionEvent event) {
        String question = event.triggerBody().replaceAll("(?i)@ai\\b", "").trim();
        if (question.length() >= SHORT_QUESTION) {
            return question;
        }
        return "Trong chủ đề \"" + event.discussionTitle() + "\", " + question;
    }

    /** A refusal is an answer too: the reader is told why, not left waiting. */
    private static String answerTextOf(Map<String, Object> response) {
        if (response.get("answer") instanceof String answer && !answer.isBlank()) {
            return answer;
        }
        if (response.get("refusalReason") instanceof String reason && !reason.isBlank()) {
            return reason;
        }
        return UNAVAILABLE;
    }

    /** Keeps what a reader needs to verify a claim and drops the rest. */
    private List<ReplyCitation> extractCitations(Object raw) {
        if (!(raw instanceof List<?> items)) {
            return List.of();
        }
        List<ReplyCitation> citations = new ArrayList<>();
        for (Object item : items) {
            if (citations.size() >= MAX_CITATIONS) {
                break;
            }
            if (item instanceof Map<?, ?> map) {
                citations.add(toCitation(map, citations.size() + 1));
            }
        }
        return List.copyOf(citations);
    }

    private ReplyCitation toCitation(Map<?, ?> raw, int ordinal) {
        String documentId = text(raw.get("documentId"));
        String citationId = text(raw.get("citationId"));
        return new ReplyCitation(
                citationId != null ? citationId : String.valueOf(ordinal),
                documentId,
                fileNameOf(documentId),
                text(raw.get("locator")),
                truncate(text(raw.get("excerpt"))));
    }

    /**
     * Resolves the name shown to the reader. The AI Service knows document ids,
     * not the names the group uploaded them under.
     */
    private String fileNameOf(String documentId) {
        if (documentId == null) {
            return UNKNOWN_DOCUMENT;
        }
        try {
            return documentRepository.findById(UUID.fromString(documentId))
                    .map(Document::getOriginalName)
                    .orElse(UNKNOWN_DOCUMENT);
        } catch (IllegalArgumentException e) {
            log.warn("Citation carried a malformed document id; showing a placeholder");
            return UNKNOWN_DOCUMENT;
        }
    }

    private static String text(Object value) {
        if (value == null) {
            return null;
        }
        String asText = value.toString().trim();
        return asText.isEmpty() ? null : asText;
    }

    /** An excerpt is a pointer into the source, not a copy of it. */
    private static String truncate(String excerpt) {
        if (excerpt == null) {
            return "";
        }
        return excerpt.length() <= EXCERPT_LIMIT
                ? excerpt
                : excerpt.substring(0, EXCERPT_LIMIT) + "…";
    }
}
