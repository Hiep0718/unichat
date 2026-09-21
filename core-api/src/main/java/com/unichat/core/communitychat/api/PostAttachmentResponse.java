package com.unichat.core.communitychat.api;

import java.util.UUID;

import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.SummaryState;

/**
 * An attachment as returned to clients.
 *
 * <p>The storage key is deliberately not exposed; content is served through the
 * attachment endpoint so authorization is checked on every read.
 */
public record PostAttachmentResponse(
        UUID id,
        AttachmentKind kind,
        String originalName,
        String mediaType,
        long byteSize,
        /** Document library entry, present when the AI assistant can cite it. */
        UUID documentId,
        /** Assistant's summary of the document; null unless state is READY. */
        String aiSummary,
        /** Lets the UI tell "still coming" apart from "never coming". */
        SummaryState summaryState
) {
    public static PostAttachmentResponse from(PostAttachment attachment) {
        return new PostAttachmentResponse(
                attachment.getId(),
                attachment.getKind(),
                attachment.getOriginalName(),
                attachment.getMediaType(),
                attachment.getByteSize(),
                attachment.getDocumentId(),
                attachment.getAiSummary(),
                attachment.getSummaryState()
        );
    }
}
