package com.unichat.core.chat.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.unichat.core.chat.domain.ChatOperation;

/** Revalidates source and owner immediately before each public output batch. */
@Component
public class ChatOutputGuard {
    private final ChatAccessService access;
    private final ChatConversationStore conversations;
    /** Uses current Core authorization, including session revocation. */
    public ChatOutputGuard(ChatAccessService access,ChatConversationStore conversations) {
        this.access=access;this.conversations=conversations;
    }
    /** Prevents queued provisional/final content from escaping after a revocation checkpoint. */
    public void check(ChatOperation operation) {
        var current=access.read(operation.actor(),operation.workspaceId());
        conversations.requireOwner(operation.actor().userId(),operation.workspaceId(),operation.conversationId(),false);
        if (!current.fingerprint().equals(operation.sources().fingerprint())
                || (operation.sources().cloudAllowed() && !current.cloudAllowed())) {
            throw new ChatOperationError("SOURCE_UNAVAILABLE",HttpStatus.FORBIDDEN,"Quyền nguồn đã thay đổi.");
        }
    }
    /** Allows content-free redacted replay after revocation while retaining session and ownership checks. */
    public void checkIdentity(ChatOperation operation) {
        access.read(operation.actor(),operation.workspaceId());
        conversations.requireOwner(operation.actor().userId(),operation.workspaceId(),operation.conversationId(),false);
    }
}
