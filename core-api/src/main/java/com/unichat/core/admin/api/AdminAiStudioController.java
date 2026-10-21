package com.unichat.core.admin.api;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.admin.service.AdminAiStudioService;
import com.unichat.core.admin.service.AdminActionAudit;
import com.unichat.core.admin.service.AiAdmissionService;
import com.unichat.core.admin.service.ProviderMetricsService;
import com.unichat.core.shared.ratelimit.RateLimitService;

/**
 * Exposes measured provider usage, explicit diagnostics and generation admission.
 */
@RestController
@RequestMapping("/api/v1/admin/ai-studio")
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class AdminAiStudioController {

    private final AdminAiStudioService studio;
    private final ProviderMetricsService metrics;
    private final RateLimitService limits;
    private final AdminActionAudit audit;
    private final AiAdmissionService admission;

    /** Composes durable measurement with the independently authenticated AI registry. */
    public AdminAiStudioController(AdminAiStudioService studio, ProviderMetricsService metrics,
            RateLimitService limits, AdminActionAudit audit, AiAdmissionService admission) {
        this.studio = studio; this.metrics = metrics; this.limits = limits; this.audit = audit;
        this.admission = admission;
    }

    /**
     * Retrieves aggregated 28-day usage and error telemetry across all AI models and keys.
     */
    @GetMapping("/metrics")
    public Map<String, Object> getMetrics(
            @RequestParam(defaultValue = "28") @Min(1) @Max(45) int days,
            @RequestParam(required = false) @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9._-]+") String keyId,
            @RequestParam(required = false) @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9._/-]+") String model) {
        return metrics.getMetrics(days, keyId, model, studio.getRegistry());
    }

    /**
     * Checks the selected provider key using its server-chosen probe type.
     */
    @PostMapping("/test-key")
    public Map<String, Object> testKey(@AuthenticationPrincipal Jwt principal, @Valid @RequestBody VerifyKeyRequest body) {
        UUID actorId = UUID.fromString(principal.getSubject());
        admission.checkDiagnostic();
        limit(actorId);
        Map<String, Object> result = studio.verifyKey(body.keyId());
        audit.record(actorId, "ADMIN_KEY_PROBE", String.valueOf(result.get("status")));
        return result;
    }

    /**
     * Executes interactive quick prompt check against AI service.
     */
    @PostMapping("/quick-prompt")
    public Map<String, Object> quickPrompt(@AuthenticationPrincipal Jwt principal, @Valid @RequestBody QuickPromptRequest body) {
        UUID actorId = UUID.fromString(principal.getSubject());
        admission.checkDiagnostic();
        limit(actorId);
        Map<String, Object> result = studio.executeQuickPrompt(body.prompt(), body.keyId(), body.model());
        audit.record(actorId, "ADMIN_QUICK_PROMPT", String.valueOf(result.get("status")));
        return result;
    }
    /** Reads admission and outstanding work without a provider call. */
    @GetMapping("/admission")
    public AiAdmissionResponse getAdmission() { return admission.status(); }
    /** Changes admission explicitly; stale versions and unfinished drains are conflicts. */
    @PutMapping("/admission")
    public AiAdmissionResponse putAdmission(@AuthenticationPrincipal Jwt principal,
            @Valid @RequestBody AiAdmissionRequest body) {
        UUID actorId = UUID.fromString(principal.getSubject());
        limit(actorId);
        return admission.update(actorId, body);
    }
    private void limit(UUID actorId) {
        limits.consume(actorId.toString(), "admin.provider-check", 5, Duration.ofMinutes(1));
    }
}
