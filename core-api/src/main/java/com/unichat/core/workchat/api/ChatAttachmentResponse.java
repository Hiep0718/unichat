package com.unichat.core.workchat.api;

import java.util.UUID;

import com.unichat.core.workchat.domain.ChatAttachment;
import com.unichat.core.workchat.domain.ChatAttachmentKind;

/**
 * A file sent in a conversation, as returned to clients.
 *
 * <p>The storage key is deliberately absent: bytes are served through the
 * attachment endpoint, which checks participation on every read. Handing out
 * the key would make the blob reachable by anyone who learned it.
 *
 * @param kind     whether the client renders it inline or as a download chip
 * @param byteSize so the UI can show a size before the file is fetched
 */
public record ChatAttachmentResponse(
        UUID id,
        ChatAttachmentKind kind,
        String originalName,
        String mediaType,
        long byteSize
) {
    public static ChatAttachmentResponse from(ChatAttachment attachment) {
        return new ChatAttachmentResponse(
                attachment.getId(),
                attachment.getKind(),
                attachment.getOriginalName(),
                attachment.getMediaType(),
                attachment.getByteSize());
    }
}
