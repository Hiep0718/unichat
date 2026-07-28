package com.unichat.core.document.storage;

import java.io.InputStream;

/**
 * Storage port interface for storing and retrieving document file blobs.
 */
public interface StoragePort {

    /**
     * Stores a document stream and returns the storage key.
     */
    String store(String storageKey, InputStream inputStream, long byteSize);

    /**
     * Retrieves document bytes by storage key.
     */
    byte[] retrieve(String storageKey);

    /**
     * Deletes a stored document by storage key.
     */
    void delete(String storageKey);
}
