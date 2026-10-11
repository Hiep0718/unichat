package com.unichat.core.admin.service;

import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unichat.core.shared.config.ServiceTokenIssuer;

/** Signed private key/prompt calls; dependency failures never become synthetic success. */
@Service
public class AdminAiStudioService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AdminAiStudioService.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE = new ParameterizedTypeReference<>() { };
    private final RestTemplate client;
    private final String baseUrl;
    private final ServiceTokenIssuer signer;
    private final ObjectMapper mapper = new ObjectMapper();
    /** Requires service authentication and bounded provider-call transport timeouts. */
    public AdminAiStudioService(@Value("${unichat.ai-service.url:http://localhost:8001}") String baseUrl, ServiceTokenIssuer signer) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(4).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        this.client = new RestTemplate(factory); this.baseUrl = baseUrl.replaceAll("/$", ""); this.signer = signer;
    }
    /** Reads configured key/model metadata; file telemetry is not a dashboard source. */
    public Map<String, Object> getRegistry() { return call("/internal/v1/metrics/ai?days=1", HttpMethod.GET, null); }
    /** Performs a selected-key metadata probe with truthful UNCONFIGURED/ERROR semantics. */
    public Map<String, Object> verifyKey(String keyId) {
        return call("/internal/v1/metrics/ai/verify-key", HttpMethod.POST, Map.of("keyId", keyId));
    }
    /** Generates from the admin-entered prompt only, with exact key attribution. */
    public Map<String, Object> executeQuickPrompt(String prompt, String keyId, String model) {
        return call("/internal/v1/metrics/ai/quick-prompt", HttpMethod.POST, Map.of("prompt", prompt, "keyId", keyId, "model", model));
    }
    private Map<String, Object> call(String path, HttpMethod method, Object payload) {
        byte[] body = serialize(payload);
        String requestId = MDC.get("requestId");
        if (requestId == null) requestId = UUID.randomUUID().toString();
        URI uri = URI.create(baseUrl + path);
        HttpHeaders headers = headers(method, uri, body, requestId);
        try {
            var response = client.exchange(uri, method, new HttpEntity<>(body, headers), MAP_TYPE);
            return response.getBody() == null ? Map.of("status", "ERROR", "code", "EMPTY_PROVIDER_RESPONSE") : response.getBody();
        } catch (RestClientException error) {
            LOGGER.warn("admin_ai_dependency_failed operation={} requestId={} errorType={}", path, requestId, error.getClass().getSimpleName());
            return Map.of("status", "UNAVAILABLE", "code", "PROVIDER_UNAVAILABLE", "message", "Dịch vụ AI hiện không khả dụng.");
        }
    }
    private byte[] serialize(Object payload) {
        if (payload == null) return new byte[0];
        try { return mapper.writeValueAsBytes(payload); }
        catch (JsonProcessingException error) { throw new IllegalStateException("Admin request serialization failed", error); }
    }
    private HttpHeaders headers(HttpMethod method, URI uri, byte[] body, String requestId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Request-Id", requestId);
        headers.set("Authorization", signer.issueToken(method.name(), uri.getPath(),
                uri.getRawQuery() == null ? "" : uri.getRawQuery(), body, requestId, ""));
        return headers;
    }
}
