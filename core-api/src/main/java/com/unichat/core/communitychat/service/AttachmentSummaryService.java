package com.unichat.core.communitychat.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatOperationRunner;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.communitychat.api.PostAttachmentResponse;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.SummaryState;

/**
 * Summarises a document attached to a post when a member asks for it.
 *
 * <p>A post carrying a long PDF asks every reader to open it before they know
 * whether it is worth opening. The summary answers that question in place, and
 * once produced it is shown to every member.
 *
 * <p>The summary runs as the asking member's chat operation, the same path as
 * the AI assistant: their session, membership and the group's cloud-AI policy
 * are checked when it is reserved and before every model call, it counts
 * against their rate limit, and retrieval is restricted to the attached
 * document alone. That restriction is what makes the result a summary of
 * <em>this</em> file rather than an answer drawn from the whole library.
 */
@Service
public class AttachmentSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AttachmentSummaryService.class);

    private static final int SUMMARY_LIMIT = 1500;
    private static final String REQUEST_PREFIX = "attachment-summary-";
    static final String QUESTION = """
            Tóm tắt tài liệu này trong 3 đến 5 câu cho người chưa đọc: \
            nội dung chính, phạm vi bao phủ, và tài liệu này trả lời được \
            những câu hỏi nào.""";

    private final AttachmentSummaryStore store;
    private final ChatOperationService operations;
    private final ChatOperationRunner runner;

    /**
     * @param store      attachment state, read and written in short transactions
     * @param operations reserves and authorizes the chat operation
     * @param runner     runs inference outside any transaction
     */
    public AttachmentSummaryService(AttachmentSummaryStore store, ChatOperationService operations,
                                    ChatOperationRunner runner) {
        this.store = store;
        this.operations = operations;
        this.runner = runner;
    }

    /**
     * Starts summarising an attachment, or returns the summary it already has.
     *
     * @param asker the member asking, with their current session
     * @return the attachment; {@code PENDING} while the summary is produced
     * @throws com.unichat.core.common.error.AppError when the member may not ask,
     *         the document is not ready, or their AI quota is used up
     */
    public PostAttachmentResponse request(UUID workspaceId, UUID discussionId, UUID attachmentId, ChatActor asker) {
        PostAttachment attachment = store.readSummarisable(workspaceId, discussionId, attachmentId, asker.userId());
        if (attachment.getSummaryState() == SummaryState.READY) {
            return PostAttachmentResponse.from(attachment);
        }
        ChatOperationService.Reservation reservation = operations.reserve(asker, workspaceId,
                new AskQuestionRequest(QUESTION, null, false), UUID.randomUUID(),
                REQUEST_PREFIX + UUID.randomUUID(), attachment.getDocumentId());
        store.markRequested(attachmentId);
        runner.start(reservation.operation(), false, (name, payload) -> { })
                .whenComplete((status, error) ->
                        recordSafely(workspaceId, discussionId, attachmentId, summaryOf(status, error)));
        attachment.markSummaryRequested();
        return PostAttachmentResponse.from(attachment);
    }

    /**
     * Reads where an attachment's summary has got, for a member waiting on it.
     *
     * @return the attachment with its current summary state
     */
    public PostAttachmentResponse current(UUID workspaceId, UUID discussionId, UUID attachmentId, UUID userId) {
        return PostAttachmentResponse.from(store.read(workspaceId, discussionId, attachmentId, userId));
    }

    /**
     * Keeps only a real answer: a refusal is not a summary, and storing one
     * would mislead the reader.
     */
    static String summaryOf(ChatOperationResponse status, Throwable error) {
        if (error != null || status == null) {
            log.error("Attachment summary operation ended without a status", error);
            return null;
        }
        var result = status.result();
        boolean answered = "COMPLETED".equals(status.state()) && result != null
                && "ANSWER".equals(result.decision()) && result.answer() != null && !result.answer().isBlank();
        if (!answered) {
            log.warn("Attachment summary operation {} ended {} without an answer (code {})",
                    status.operationId(), status.state(), status.errorCode());
            return null;
        }
        String summary = result.answer().trim();
        return summary.length() <= SUMMARY_LIMIT ? summary : summary.substring(0, SUMMARY_LIMIT) + "…";
    }

    /** On the operation's completion thread nobody else would see a failure. */
    private void recordSafely(UUID workspaceId, UUID discussionId, UUID attachmentId, String summary) {
        try {
            store.record(workspaceId, discussionId, attachmentId, summary);
        } catch (RuntimeException error) {
            log.error("Could not store summary for attachment {}", attachmentId, error);
        }
    }
}
