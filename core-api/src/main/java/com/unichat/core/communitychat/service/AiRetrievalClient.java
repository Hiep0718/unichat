package com.unichat.core.communitychat.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.shared.config.ServiceTokenIssuer;

/**
 * Asks the AI Service a grounded question on behalf of the community features.
 *
 * <p>Callers pass the document ids the Core API has already authorised. The AI
 * Service never widens that set, so restricting it to a single document is what
 * makes "summarise this attachment" answer from that attachment alone.
 */
@Component
public class AiRetrievalClient {

    private static final Logger log = LoggerFactory.getLogger(AiRetrievalClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_BODY =
            new ParameterizedTypeReference<>() {};

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(90);

    private final ServiceTokenIssuer serviceTokenIssuer;
    private final RestTemplate restTemplate;

    @Value("${unichat.ai-service.url:http://localhost:8001}")
    private String aiServiceUrl;

    // Two constructors exist (the second lets a test swap the transport), so
    // Spring needs telling which one to autowire.
    @Autowired
    public AiRetrievalClient(ServiceTokenIssuer serviceTokenIssuer) {
        this(serviceTokenIssuer, timeBoundedRestTemplate());
    }

    /** Lets a test supply its own transport instead of reaching the network. */
    AiRetrievalClient(ServiceTokenIssuer serviceTokenIssuer, RestTemplate restTemplate) {
        this.serviceTokenIssuer = serviceTokenIssuer;
        this.restTemplate = restTemplate;
    }

    /**
     * Puts a question to the AI Service.
     *
     * @param allowedDocumentIds the only documents retrieval may draw on
     * @param traceId            correlates the answer with its retrieval run
     * @return the response body, or an empty map when the call failed — callers
     *         run on background threads with no one left to propagate to
     */
    public Map<String, Object> ask(UUID workspaceId, List<UUID> allowedDocumentIds,
                                   String question, UUID traceId) {
        Map<String, Object> body = Map.of(
                "workspaceId", workspaceId.toString(),
                "allowedDocumentIds", allowedDocumentIds.stream().map(UUID::toString).toList(),
                "question", question,
                "strategyVersion", "v1.0",
                "requestId", traceId.toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, serviceTokenIssuer.issueToken());

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    aiServiceUrl + "/internal/v1/retrieval/answers",
                    HttpMethod.POST, new HttpEntity<>(body, headers), MAP_BODY);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (RestClientException e) {
            log.error("AI Service call failed for workspace {} (trace {})", workspaceId, traceId, e);
            return Map.of();
        }
    }

    /**
     * Without explicit timeouts a stalled AI Service holds the worker thread open
     * indefinitely; the read budget covers a slow model, not a dead one.
     */
    private static RestTemplate timeBoundedRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return new RestTemplate(factory);
    }
}
