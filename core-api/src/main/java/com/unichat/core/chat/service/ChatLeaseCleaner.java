package com.unichat.core.chat.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Releases abandoned durable chat slots without ever calling a provider again. */
@Component
public class ChatLeaseCleaner {
    private final ChatOperationService operations;
    /** Reuses transactional terminal-state and audit policy. */
    public ChatLeaseCleaner(ChatOperationService operations) { this.operations=operations; }
    /** Reaps at most one hundred actor batches per tick. */
    @Scheduled(fixedDelayString="${CHAT_LEASE_CLEANUP_INTERVAL_MS:10000}")
    public void clean() { operations.cleanupLeases(); }
}
