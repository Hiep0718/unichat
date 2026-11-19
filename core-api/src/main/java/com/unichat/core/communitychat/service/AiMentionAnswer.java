package com.unichat.core.communitychat.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.communitychat.domain.ReplyCitation;

/**
 * What the assistant posts under a comment: the text, its sources and the
 * operation that produced it.
 *
 * @param body      the answer, a refusal reason, or a notice that no answer came
 * @param citations sources a reader can open; empty for a notice
 * @param traceId   the chat operation behind the answer, null when none ran
 */
public record AiMentionAnswer(String body, List<ReplyCitation> citations, UUID traceId) {

    /** Told to the reader when the assistant could not produce anything. */
    public static final String UNAVAILABLE =
            "Trợ lý chưa trả lời được lúc này. Bạn thử nhắc lại sau ít phút nhé.";

    /**
     * Every notice starts with this, so clients can show it as a status line
     * instead of a comment; the web matches on it in {@code comment-thread.ts}.
     */
    static final String NOTICE_PREFIX = "Trợ lý chưa trả lời được";

    private static final int MAX_CITATIONS = 8;
    private static final int EXCERPT_LIMIT = 500;

    /**
     * A notice instead of an answer, so the reader is not left waiting.
     *
     * @param message the reason shown to the reader
     * @param traceId the operation that failed, or null when none was started
     * @return an answer with no sources
     */
    public static AiMentionAnswer notice(String message, UUID traceId) {
        return new AiMentionAnswer(message, List.of(), traceId);
    }

    /**
     * A notice for a question the assistant could not take on, such as when the
     * asker already has two questions running or hit the rate limit.
     *
     * @param reason the safe, user-facing reason from the chat pipeline
     * @return a notice that clients recognise as a status line
     */
    public static AiMentionAnswer declined(String reason) {
        return notice(NOTICE_PREFIX + ": " + reason, null);
    }

    /**
     * Converts a completed chat result. Citations were already checked against
     * the authorized sources by the chat pipeline; this keeps what a reader
     * needs to verify a claim and drops the rest.
     *
     * @param result the validated chat result
     * @return the answer to post
     */
    public static AiMentionAnswer from(QuestionResponse result) {
        String body = result.answer() == null || result.answer().isBlank() ? UNAVAILABLE : result.answer();
        List<CitationResponse> raw = result.citations() == null ? List.of() : result.citations();
        List<ReplyCitation> citations = new ArrayList<>();
        for (CitationResponse citation : raw.subList(0, Math.min(raw.size(), MAX_CITATIONS))) {
            citations.add(toCitation(citation, citations.size() + 1));
        }
        return new AiMentionAnswer(body, List.copyOf(citations), result.operationId());
    }

    private static ReplyCitation toCitation(CitationResponse citation, int ordinal) {
        return new ReplyCitation(
                citation.citationId() != null ? citation.citationId() : String.valueOf(ordinal),
                citation.documentId() == null ? null : citation.documentId().toString(),
                citation.fileName() == null ? "Tài liệu tham khảo" : citation.fileName(),
                citation.locator(),
                truncate(citation.excerpt()));
    }

    /** An excerpt is a pointer into the source, not a copy of it. */
    private static String truncate(String excerpt) {
        if (excerpt == null) {
            return "";
        }
        return excerpt.length() <= EXCERPT_LIMIT ? excerpt : excerpt.substring(0, EXCERPT_LIMIT) + "…";
    }
}
