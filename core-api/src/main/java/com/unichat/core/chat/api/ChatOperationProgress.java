package com.unichat.core.chat.api;

/** Completed work counters for a durable workspace summary operation. */
public record ChatOperationProgress(String stage, int documentsTotal, int documentsCompleted,
        long chunksTotal, long chunksProcessed, int providerCallsCompleted) { }
