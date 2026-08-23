package com.unichat.core.document.api;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.shared.config.ServiceTokenIssuer;

/**
 * Controller to proxy internal evaluation & storage sync requests to AI Service.
 */
@RestController
@RequestMapping("/api/v1/internal/v1/eval")
public class InternalEvalController {

    private final RestTemplate restTemplate;
    private final ServiceTokenIssuer serviceTokenIssuer;

    @Value("${unichat.ai-service.url:http://localhost:8001}")
    private String aiServiceUrl;

    public InternalEvalController(ServiceTokenIssuer serviceTokenIssuer) {
        this.restTemplate = new RestTemplate();
        this.serviceTokenIssuer = serviceTokenIssuer;
    }

    /**
     * Proxies sync storage request to AI service.
     */
    @PostMapping("/sync-storage")
    public ResponseEntity<?> syncStorage(@AuthenticationPrincipal Jwt jwt) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", serviceTokenIssuer.issueToken());
        HttpEntity<?> entity = new HttpEntity<>(headers);

        String targetUrl = aiServiceUrl + "/internal/v1/eval/sync-storage";
        ResponseEntity<Map> response = restTemplate.exchange(targetUrl, HttpMethod.POST, entity, Map.class);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }

    /**
     * Proxies sync status request to AI service.
     */
    @GetMapping("/sync-status")
    public ResponseEntity<?> getSyncStatus(@AuthenticationPrincipal Jwt jwt) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", serviceTokenIssuer.issueToken());
        HttpEntity<?> entity = new HttpEntity<>(headers);

        String targetUrl = aiServiceUrl + "/internal/v1/eval/sync-status";
        ResponseEntity<Map> response = restTemplate.exchange(targetUrl, HttpMethod.GET, entity, Map.class);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }

    /**
     * Proxies vector status check request to AI service.
     */
    @GetMapping("/vector-status")
    public ResponseEntity<?> getVectorStatus(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "workspaceId", required = false) String workspaceId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", serviceTokenIssuer.issueToken());
        HttpEntity<?> entity = new HttpEntity<>(headers);

        String targetUrl = aiServiceUrl + "/internal/v1/eval/vector-status" +
                (workspaceId != null ? "?workspaceId=" + workspaceId : "");
        ResponseEntity<Map> response = restTemplate.exchange(targetUrl, HttpMethod.GET, entity, Map.class);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }
}
