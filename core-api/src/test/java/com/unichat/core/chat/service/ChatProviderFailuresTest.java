package com.unichat.core.chat.service;

import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ChatProviderFailuresTest {
    @Test void shouldPreserveKnownPrivateProviderCodeWithoutProviderMessage() {
        assertEquals("PROVIDER_TIMEOUT", ChatProviderFailures.code(Map.of("errorCode", "PROVIDER_TIMEOUT", "message", "secret")));
        assertEquals("PROVIDER_PROTOCOL_ERROR", ChatProviderFailures.code(Map.of("code", "PROVIDER_PROTOCOL_ERROR")));
        assertEquals("PROVIDER_HTTP_405", ChatProviderFailures.code(Map.of("errorCode", "PROVIDER_HTTP_405", "message", "secret")));
    }
    @Test void shouldReplaceUntrustedCodesOrMissingPayloadWithSafeUnavailable() {
        assertEquals("PROVIDER_UNAVAILABLE", ChatProviderFailures.code(Map.of("code", "secret-provider-payload")));
        assertEquals("PROVIDER_UNAVAILABLE", ChatProviderFailures.code(Map.of()));
        assertEquals("PROVIDER_UNAVAILABLE", ChatProviderFailures.code(Map.of("errorCode", 7)));
    }
}
