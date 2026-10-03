package com.unichat.core.communitychat.domain;

/**
 * What an attachment is for.
 *
 * <p>The distinction decides whether the file becomes a retrieval source: an
 * image illustrates a post, a document also joins the group's knowledge library.
 */
public enum AttachmentKind {
    /** Shown inline in the post. Never read by the AI assistant. */
    IMAGE,
    /** Registered as a workspace document the AI assistant can cite. */
    DOCUMENT
}
