package com.unichat.core.communitychat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.service.ChatOperationRunner;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.common.error.AppError;
import com.unichat.core.communitychat.domain.AiMentionEvent;

/**
 * Answers {@code @AI} mentions inside a discussion thread.
 *
 * <p>A mention is answered by the same durable chat operation as a question
 * typed into the AI assistant: the asker's session, membership and the
 * group's cloud-AI policy are checked when it is reserved and again before
 * every model call; it counts against the asker's rate limit and the global
 * AI admission; and the AI Service receives a request-bound service token
 * with the authorized source snapshot. The AI Service never decides what is
 * allowed. The answer, or a notice explaining why there is none, is then
 * posted by the assistant account under the asking comment.
 */
@Service
public class AiReplyService {

    private static final Logger log = LoggerFactory.getLogger(AiReplyService.class);

    private static final int SHORT_QUESTION = 10;
    private static final int MAX_QUESTION = 2000;
    private static final String REQUEST_PREFIX = "ai-mention-";

    private final ChatOperationService operations;
    private final ChatOperationRunner runner;
    private final AiReplyWriter writer;

    /**
     * @param operations reserves and authorizes the chat operation
     * @param runner     runs inference outside any transaction
     * @param writer     posts the answer after rechecking the thread
     */
    public AiReplyService(ChatOperationService operations, ChatOperationRunner runner, AiReplyWriter writer) {
        this.operations = operations;
        this.runner = runner;
        this.writer = writer;
    }

    /**
     * Starts answering a mention.
     *
     * <p>Waiting for the commit matters twice over: the triggering reply is this
     * answer's parent, so the foreign key needs its row on disk, and answering a
     * reply that rolled back would be answering nothing. The asking comment's id
     * is the idempotency key, so a redelivered event never asks twice.
     *
     * @param event the mention to answer
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAiMention(AiMentionEvent event) {
        String requestId = REQUEST_PREFIX + event.triggerReplyId();
        ChatOperationService.Reservation reservation;
        try {
            reservation = operations.reserve(event.asker(), event.workspaceId(),
                    new AskQuestionRequest(questionOf(event), null, false), event.triggerReplyId(), requestId);
        } catch (AppError error) {
            log.warn("Assistant could not take mention on discussion {}: {} (request {})",
                    event.discussionId(), error.getCode(), requestId);
            postSafely(event, AiMentionAnswer.declined(error.getMessage()));
            return;
        }
        if (!reservation.created()) {
            log.info("Mention on discussion {} is already being answered (request {})",
                    event.discussionId(), requestId);
            return;
        }
        runner.start(reservation.operation(), false, (name, payload) -> { })
                .whenComplete((status, error) -> postSafely(event, answerOf(status, error, reservation)));
    }

    /**
     * Writes the answer, logging a failure instead of losing it: on the
     * operation's completion thread nobody else would see the exception.
     */
    private void postSafely(AiMentionEvent event, AiMentionAnswer answer) {
        try {
            writer.post(event, answer);
        } catch (RuntimeException error) {
            log.error("Could not store assistant answer for discussion {} (trace {})",
                    event.discussionId(), answer.traceId(), error);
        }
    }

    /** Turns the finished operation into what the reader sees. */
    private static AiMentionAnswer answerOf(ChatOperationResponse status, Throwable error,
                                            ChatOperationService.Reservation reservation) {
        if (error != null || status == null) {
            log.error("Assistant operation {} ended without a status", reservation.operation().id(), error);
            return AiMentionAnswer.notice(AiMentionAnswer.UNAVAILABLE, reservation.operation().id());
        }
        if ("COMPLETED".equals(status.state()) && status.result() != null) {
            return AiMentionAnswer.from(status.result());
        }
        log.warn("Assistant operation {} ended {} with code {}",
                status.operationId(), status.state(), status.errorCode());
        return AiMentionAnswer.failed(status.errorCode(), status.operationId());
    }

    /** Strips the handle and, for a terse reply, restores the post's topic. */
    static String questionOf(AiMentionEvent event) {
        String question = AiMentions.strip(event.triggerBody());
        String framed = question.length() >= SHORT_QUESTION
                ? question
                : ("Trong chủ đề \"" + event.discussionTitle() + "\", " + question).trim();
        return framed.length() <= MAX_QUESTION ? framed : framed.substring(0, MAX_QUESTION);
    }
}
