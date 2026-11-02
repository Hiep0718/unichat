package com.unichat.core.workchat.domain;

/**
 * What a file sent in a conversation is for.
 *
 * <p>Deliberately not {@code DOCUMENT}: unlike a post attachment, a file sent
 * in a chat never enters the workspace document library and the AI assistant
 * never reads or cites it. The naming is the reminder.
 */
public enum ChatAttachmentKind {
    /** Rendered inline in the message bubble. */
    IMAGE,
    /** Offered as a download chip. */
    FILE
}
