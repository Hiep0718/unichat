package com.unichat.core.document.storage;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SupabaseStoragePortTest {
    @Test
    void shouldInitializeWithoutOpeningStorageHttpTransport() {
        SupabaseStoragePort storage = new SupabaseStoragePort("https://example.com/storage/v1", "test-key", "documents");

        assertNull(ReflectionTestUtils.getField(storage, "httpClient"));
    }

    @Test
    void shouldUseHttp11ForStorageRequests() {
        SupabaseStoragePort storage = new SupabaseStoragePort("https://example.com/storage/v1", "test-key", "documents");

        HttpClient client = ReflectionTestUtils.invokeMethod(storage, "client");

        assertEquals(HttpClient.Version.HTTP_1_1, client.version());
    }

    @Test
    void shouldAllowUploadsUpToSixtySeconds() {
        SupabaseStoragePort storage = new SupabaseStoragePort("https://example.com/storage/v1", "test-key", "documents");

        assertEquals(Duration.ofSeconds(60), ReflectionTestUtils.getField(storage, "UPLOAD_TIMEOUT"));
    }
}
