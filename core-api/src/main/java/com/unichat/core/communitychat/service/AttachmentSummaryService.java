package com.unichat.core.communitychat.service;

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

import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.document.domain.DocumentProcessedEvent;

/**
 * Summarises a document attached to a post, once it is readable.
 *
 * <p>A post carrying a long PDF asks every reader to open it before they know
 * whether it is worth opening. The summary answers that question in place.
 *
 * <p>Retrieval is restricted to the attached document alone, which is what
 * makes the result a summary of <em>this</em> file rather than an answer drawn
 * from the whole group library. No new AI Service endpoint is involved: the
 * existing grounded-answer path already takes the allowed document ids.
 */
@Service
public class AttachmentSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AttachmentSummaryService.class);

    private static final int SUMMARY_LIMIT = 1500;
    private static final String QUESTION = """
            Tóm tắt tài liệu này trong 3 đến 5 câu cho người chưa đọc: \
            nội dung chính, phạm vi bao phủ, và tài liệu này trả lời được \
            những câu hỏi nào.""";

    private final PostAttachmentRepository attachmentRepository;
    private final AiRetrievalClient retrievalClient;

    public AttachmentSummaryService(PostAttachmentRepository attachmentRepository,
                                    AiRetrievalClient retrievalClient) {
        this.attachmentRepository = attachmentRepository;
        this.retrievalClient = retrievalClient;
    }

    /**
     * Summarises every post attachment backed by a freshly ingested document.
     *
     * <p>Runs after commit so the {@code PROCESSED} status is on disk: the AI
     * Service resolves the document through the same library this transaction
     * was still holding open.
     *
     * @param event the document that just became retrievable
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onDocumentProcessed(DocumentProcessedEvent event) {
        List<PostAttachment> attachments =
                attachmentRepository.findByDocumentId(event.documentId());
        if (attachments.isEmpty()) {
            // An ordinary library upload, not one posted to a thread.
            return;
        }

        String summary = summarise(event);
        for (PostAttachment attachment : attachments) {
            if (summary == null) {
                attachment.markSummaryUnavailable();
            } else {
                attachment.attachSummary(summary);
            }
            attachmentRepository.save(attachment);
        }

        log.info("Summary for document {} on {} attachment(s): {}",
                event.documentId(), attachments.size(), summary == null ? "unavailable" : "ready");
    }

    /**
     * @return the summary, or null when the assistant produced none — a refusal
     *         is not a summary, and storing one would mislead the reader
     */
    private String summarise(DocumentProcessedEvent event) {
        UUID traceId = UUID.randomUUID();
        Map<String, Object> response = retrievalClient.ask(
                event.workspaceId(), List.of(event.documentId()), QUESTION, traceId);

        if (response.get("answer") instanceof String answer && !answer.isBlank()) {
            return truncate(answer.trim());
        }
        return null;
    }

    private static String truncate(String summary) {
        return summary.length() <= SUMMARY_LIMIT
                ? summary
                : summary.substring(0, SUMMARY_LIMIT) + "…";
    }
}
