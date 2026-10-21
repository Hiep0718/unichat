package com.unichat.core.chat.service;

import java.util.Map;
import java.util.Set;

/** Allowlisted private operational failures; provider messages never cross the Core boundary. */
public final class ChatProviderFailures {
    private static final Set<String> CODES = Set.of("PROVIDER_UNCONFIGURED", "PROVIDER_KEY_UNKNOWN",
            "PROVIDER_SELECTION_INVALID", "PROVIDER_TIMEOUT", "PROVIDER_UNAVAILABLE", "PROVIDER_PROTOCOL_ERROR",
            "PROVIDER_EMPTY_RESPONSE", "PROVIDER_TRUNCATED_RESPONSE", "PROVIDER_REFUSAL", "OUTPUT_LIMIT_EXCEEDED",
            "PROVIDER_EMPTY_OR_BLOCKED_RESPONSE", "PROVIDER_EMPTY_OR_OVERSIZED_RESPONSE", "PROVIDER_INTERRUPTED",
            "PROVIDER_HTTP_400", "PROVIDER_HTTP_401", "PROVIDER_HTTP_403", "PROVIDER_HTTP_404", "PROVIDER_HTTP_405", "PROVIDER_HTTP_408",
            "PROVIDER_HTTP_422", "PROVIDER_HTTP_429", "PROVIDER_HTTP_500", "PROVIDER_HTTP_502", "PROVIDER_HTTP_503",
            "PROVIDER_HTTP_504", "GENERATION_CANCELLED", "CORE_POLICY_DENIED", "CORE_POLICY_UNAVAILABLE",
            "CORE_POLICY_INVALID", "CLOUD_POLICY_DENIED", "DEADLINE_EXCEEDED", "AI_MAINTENANCE");
    private ChatProviderFailures() { }
    /** Maps only known stable codes and hides every arbitrary provider payload. */
    public static String code(Map<String, Object> payload) {
        if (payload == null) return "PROVIDER_UNAVAILABLE";
        Object value = payload.getOrDefault("errorCode", payload.get("code"));
        return value instanceof String candidate && CODES.contains(candidate) ? candidate : "PROVIDER_UNAVAILABLE";
    }
}
