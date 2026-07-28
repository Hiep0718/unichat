package com.unichat.core.document.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.unichat.core.common.error.NotFoundError;

class LocalStoragePortTest {

    @TempDir
    Path tempDir;

    private LocalStoragePort localStoragePort;

    @BeforeEach
    void setUp() {
        localStoragePort = new LocalStoragePort(tempDir.toString());
    }

    @Test
    void shouldStoreAndRetrieveFileSuccessfully() {
        byte[] content = "Nội dung tài liệu kiểm thử tiếng Việt".getBytes();
        String storageKey = "ws-1/doc-1.pdf";

        String savedKey = localStoragePort.store(storageKey, new ByteArrayInputStream(content), content.length);
        assertEquals(storageKey, savedKey);

        byte[] retrieved = localStoragePort.retrieve(storageKey);
        assertNotNull(retrieved);
        assertEquals(new String(content), new String(retrieved));
    }

    @Test
    void shouldThrowSecurityExceptionWhenPathTraversalAttempted() {
        byte[] content = "Dữ liệu độc hại".getBytes();
        String maliciousKey = "../../../etc/passwd";

        assertThrows(SecurityException.class, () ->
                localStoragePort.store(maliciousKey, new ByteArrayInputStream(content), content.length));
    }

    @Test
    void shouldThrowNotFoundErrorWhenFileDoesNotExist() {
        assertThrows(NotFoundError.class, () -> localStoragePort.retrieve("non-existent-key.pdf"));
    }

    @Test
    void shouldDeleteFileSuccessfully() {
        byte[] content = "Xóa tệp".getBytes();
        String storageKey = "ws-1/doc-delete.pdf";
        localStoragePort.store(storageKey, new ByteArrayInputStream(content), content.length);

        localStoragePort.delete(storageKey);

        assertThrows(NotFoundError.class, () -> localStoragePort.retrieve(storageKey));
    }
}
