package com.unichat.core.admin.api;

/** Authoritative database admission state and outstanding work counts. */
public record AiAdmissionResponse(String state, long version, long runningOperationCount, long pendingAttemptCount) { }
