package com.unichat.core.document.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.unichat.core.common.error.InternalError;
import com.unichat.core.common.error.NotFoundError;

/**
 * Local filesystem implementation of StoragePort.
 */
@Component
@ConditionalOnProperty(name = "unichat.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalStoragePort implements StoragePort {

    private final Path storageDir;

    public LocalStoragePort(@Value("${unichat.storage.dir:./data/storage}") String storageDir) {
        this.storageDir = Paths.get(storageDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageDir);
        } catch (IOException e) {
            throw new InternalError();
        }
    }

    @Override
    public String store(String storageKey, InputStream inputStream, long byteSize) {
        try {
            Path targetPath = resolvePath(storageKey);
            Files.createDirectories(targetPath.getParent());
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return storageKey;
        } catch (IOException e) {
            throw new InternalError();
        }
    }

    @Override
    public byte[] retrieve(String storageKey) {
        try {
            Path targetPath = resolvePath(storageKey);
            if (Files.exists(targetPath)) {
                return Files.readAllBytes(targetPath);
            }
            Path found = findFileInStorage(storageKey);
            if (found != null && Files.exists(found)) {
                return Files.readAllBytes(found);
            }
            throw new NotFoundError("Tệp tin không tồn tại trong hệ thống lưu trữ");
        } catch (IOException e) {
            throw new InternalError();
        }
    }

    private Path findFileInStorage(String key) {
        String filename = Paths.get(key).getFileName().toString();
        Path[] searchDirs = new Path[]{
            storageDir,
            Paths.get("./data/storage").toAbsolutePath().normalize(),
            Paths.get("./core-api/data/storage").toAbsolutePath().normalize(),
            Paths.get("./data").toAbsolutePath().normalize()
        };

        for (Path dir : searchDirs) {
            if (Files.exists(dir) && Files.isDirectory(dir)) {
                try (var stream = Files.walk(dir)) {
                    var match = stream.filter(Files::isRegularFile)
                            .filter(p -> p.getFileName().toString().equalsIgnoreCase(filename) ||
                                         p.getFileName().toString().contains(filename) ||
                                         filename.contains(p.getFileName().toString()))
                            .findFirst();
                    if (match.isPresent()) {
                        return match.get();
                    }
                } catch (IOException ignored) {}
            }
        }
        return null;
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path targetPath = resolvePath(storageKey);
            Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            // Logged or swallowed in delete saga
        }
    }

    private Path resolvePath(String storageKey) {
        Path path = storageDir.resolve(storageKey).normalize();
        if (!path.startsWith(storageDir)) {
            throw new SecurityException("Phát hiện hành vi Path Traversal bất hợp pháp");
        }
        return path;
    }
}
