package com.unichat.core.document.storage;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.assertNull;

class SupabaseStoragePortTest {
    @Test
    void shouldInitializeWithoutOpeningStorageHttpTransport() {
        SupabaseStoragePort storage = new SupabaseStoragePort("https://example.com/storage/v1", "test-key", "documents");

        assertNull(ReflectionTestUtils.getField(storage, "httpClient"));
    }
}
