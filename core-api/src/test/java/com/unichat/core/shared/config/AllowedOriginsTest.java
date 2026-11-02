package com.unichat.core.shared.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AllowedOriginsTest {

    @Test
    void shouldFallBackToTheDevelopmentOriginsWhenNothingIsConfigured() {
        var origins = new AllowedOrigins("", "local").values();

        assertTrue(origins.contains("http://localhost:5173"));
        // Vite binds 127.0.0.1, and a browser treats that as a different
        // origin from localhost, so both have to be listed.
        assertTrue(origins.contains("http://127.0.0.1:5173"));
    }

    @Test
    void shouldGiveExactlyWhatWasListedWhenOriginsAreConfigured() {
        var origins = new AllowedOrigins("https://unichat.example", "local").values();

        assertEquals(1, origins.size());
        // Someone who named their origins did not ask for localhost as well;
        // quietly adding it would widen a deployment's allowlist.
        assertFalse(origins.contains("http://localhost:5173"));
    }

    @Test
    void shouldReadACommaSeparatedListAndIgnoreSpacing() {
        var origins = new AllowedOrigins(
                " https://a.example , https://b.example ,, ", "production").values();

        assertEquals(2, origins.size());
        assertTrue(origins.contains("https://a.example"));
        assertTrue(origins.contains("https://b.example"));
    }

    @Test
    void shouldNotAddLoopbackOutsideDevelopment() {
        var origins = new AllowedOrigins("", "production").values();

        assertFalse(origins.contains("http://127.0.0.1:5173"));
    }

    @Test
    void shouldRefuseToStartOnAWildcardRatherThanIgnoreIt() {
        // A credentialed request from any origin is the whole of CORS
        // defeated, so this is worth failing the startup over.
        assertThrows(IllegalArgumentException.class,
                () -> new AllowedOrigins("https://*.example", "production"));
    }

    @Test
    void shouldOfferTheSameListToTheStompEndpoint() {
        var origins = new AllowedOrigins("https://a.example,https://b.example", "local");

        // One list for CORS and the socket: two settings for one question let
        // HTTP through on a LAN address while silently refusing the socket.
        assertEquals(origins.values().size(), origins.asArray().length);
    }
}
