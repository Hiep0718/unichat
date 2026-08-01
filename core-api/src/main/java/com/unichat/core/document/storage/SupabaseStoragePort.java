package com.unichat.core.document.storage;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.unichat.core.common.error.InternalError;
import com.unichat.core.common.error.NotFoundError;

/**
 * Supabase Storage implementation of StoragePort.
 *
 * <p>Uses the Supabase Storage REST API to store, retrieve and delete
 * document blobs in a shared cloud bucket accessible by all developers.</p>
 */
@Component
@ConditionalOnProperty(name = "unichat.storage.provider", havingValue = "supabase")
public class SupabaseStoragePort implements StoragePort {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStoragePort.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final String baseUrl;
    private final String serviceKey;
    private final String bucket;
    private final HttpClient httpClient;

    public SupabaseStoragePort(
            @Value("${unichat.storage.supabase.url}") String baseUrl,
            @Value("${unichat.storage.supabase.key}") String serviceKey,
            @Value("${unichat.storage.supabase.bucket:documents}") String bucket) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.serviceKey = serviceKey;
        this.bucket = bucket;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .build();
        log.info("SupabaseStoragePort initialized: bucket={}", bucket);
    }

    @Override
    public String store(String storageKey, InputStream inputStream, long byteSize) {
        try {
            byte[] bytes = inputStream.readAllBytes();
            URI uri = URI.create(baseUrl + "/object/" + bucket + "/" + storageKey);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(TIMEOUT)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("apikey", serviceKey)
                    .header("Content-Type", "application/octet-stream")
                    .header("x-upsert", "true")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Stored object in Supabase Storage: {}", storageKey);
                return storageKey;
            }
            log.error("Supabase Storage upload failed: status={}, body={}", response.statusCode(), response.body());
            throw new InternalError();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Supabase Storage upload error for key: {}", storageKey, e);
            throw new InternalError();
        }
    }

    @Override
    public byte[] retrieve(String storageKey) {
        try {
            URI uri = URI.create(baseUrl + "/object/authenticated/" + bucket + "/" + storageKey);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(TIMEOUT)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("apikey", serviceKey)
                    .GET()
                    .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 200) {
                return response.body();
            }
            if (response.statusCode() == 404 || response.statusCode() == 400) {
                throw new NotFoundError("Tệp tin không tồn tại trong hệ thống lưu trữ");
            }
            log.error("Supabase Storage download failed: status={}", response.statusCode());
            throw new InternalError();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Supabase Storage download error for key: {}", storageKey, e);
            throw new InternalError();
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            URI uri = URI.create(baseUrl + "/object/" + bucket);
            String body = "{\"prefixes\":[\"" + storageKey.replace("\"", "\\\"") + "\"]}";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(TIMEOUT)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("apikey", serviceKey)
                    .header("Content-Type", "application/json")
                    .method("DELETE", HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Deleted object from Supabase Storage: {}", storageKey);
            } else {
                log.warn("Supabase Storage delete returned status={} for key: {}", response.statusCode(), storageKey);
            }
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Supabase Storage delete error for key: {}", storageKey, e);
        }
    }
}
