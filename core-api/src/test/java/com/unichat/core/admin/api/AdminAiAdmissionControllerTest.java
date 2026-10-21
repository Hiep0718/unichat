package com.unichat.core.admin.api;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import com.unichat.core.admin.service.AdminActionAudit;
import com.unichat.core.admin.service.AdminAiStudioService;
import com.unichat.core.admin.service.AiAdmissionService;
import com.unichat.core.admin.service.AiMaintenanceError;
import com.unichat.core.admin.service.ProviderMetricsService;
import com.unichat.core.common.error.GlobalErrorHandler;
import com.unichat.core.common.error.ProblemDetailFactory;
import com.unichat.core.shared.ratelimit.RateLimitService;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Integrates MVC validation, method authorization and safe admission HTTP responses offline. */
class AdminAiAdmissionControllerTest {
    private static final String BASE = "/api/v1/admin/ai-studio";
    private final UUID actorId = UUID.randomUUID();
    private AnnotationConfigWebApplicationContext context;
    private MockMvc http;
    private AiAdmissionService admission;
    private AdminAiStudioService studio;

    @BeforeEach void initialize() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext()); context.register(Fixture.class); context.refresh();
        http = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        admission = context.getBean(AiAdmissionService.class); studio = context.getBean(AdminAiStudioService.class);
    }
    @AfterEach void close() { context.close(); }

    @Test void shouldRequireAdministratorForBothAdmissionEndpoints() throws Exception {
        http.perform(get(BASE + "/admission")).andExpect(status().isUnauthorized());
        http.perform(get(BASE + "/admission").with(user())).andExpect(status().isForbidden());
        http.perform(put(BASE + "/admission").with(user()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"DRAINING\",\"expectedVersion\":0}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(admission);
    }
    @Test void shouldExposeAuthoritativeAdmissionCountsWithoutProviderCalls() throws Exception {
        when(admission.status()).thenReturn(new AiAdmissionResponse("DRAINING", 4, 2, 1));
        http.perform(get(BASE + "/admission").with(admin())).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("DRAINING")).andExpect(jsonPath("$.version").value(4))
                .andExpect(jsonPath("$.runningOperationCount").value(2)).andExpect(jsonPath("$.pendingAttemptCount").value(1));
        verifyNoInteractions(studio);
    }
    @Test void shouldPassVersionBoundTransitionToService() throws Exception {
        when(admission.update(actorId, new AiAdmissionRequest("DRAINING", 4L)))
                .thenReturn(new AiAdmissionResponse("DRAINING", 5, 0, 0));
        http.perform(put(BASE + "/admission").with(admin()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"DRAINING\",\"expectedVersion\":4}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(5));
        verify(admission).update(actorId, new AiAdmissionRequest("DRAINING", 4L));
    }
    @Test void shouldRejectInvalidTransitionInputsBeforeService() throws Exception {
        for (String payload : List.of("{}", "{\"state\":\"UNKNOWN\",\"expectedVersion\":0}",
                "{\"state\":\"OPEN\",\"expectedVersion\":-1}")) {
            http.perform(put(BASE + "/admission").with(admin()).contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isUnprocessableEntity());
        }
        verifyNoInteractions(admission);
    }
    @Test void shouldReturnMaintenanceAndRetryAfterWithoutCallingProvider() throws Exception {
        doThrow(new AiMaintenanceError()).when(admission).checkDiagnostic();
        http.perform(post(BASE + "/test-key").with(admin()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"keyId\":\"hive-primary\"}"))
                .andExpect(status().isServiceUnavailable()).andExpect(header().string("Retry-After", "30"))
                .andExpect(jsonPath("$.code").value("AI_MAINTENANCE"));
        verifyNoInteractions(studio);
    }
    @Test void shouldAcceptHiveKeyAndSlashModelAndPreservePrompt() throws Exception {
        String model = "deepseek-ai/deepseek-v4.1-flash";
        when(studio.executeQuickPrompt("Xin chào", "hive-primary", model)).thenReturn(Map.of("status", "SUCCESS"));
        http.perform(post(BASE + "/quick-prompt").with(admin()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"keyId\":\"hive-primary\",\"model\":\"" + model + "\",\"prompt\":\"Xin chào\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUCCESS"));
        verify(studio).executeQuickPrompt("Xin chào", "hive-primary", model);
    }
    @Test void shouldRejectBlankAndOversizedPromptsAndUnknownKeys() throws Exception {
        for (String prompt : List.of(" ", "x".repeat(2001))) {
            http.perform(post(BASE + "/quick-prompt").with(admin()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"keyId\":\"hive-primary\",\"model\":\"deepseek-ai/model\",\"prompt\":\"" + prompt + "\"}"))
                    .andExpect(status().isUnprocessableEntity());
        }
        http.perform(post(BASE + "/test-key").with(admin()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"keyId\":\"secret-key\"}")).andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(studio, admission);
    }
    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor admin() {
        return jwt().jwt(token -> token.subject(actorId.toString())).authorities(() -> "SCOPE_ADMIN");
    }
    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor user() {
        return jwt().jwt(token -> token.subject(actorId.toString())).authorities(() -> "SCOPE_USER");
    }
    @Configuration @EnableWebMvc @EnableWebSecurity @EnableMethodSecurity
    static class Fixture {
        @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
            return http.csrf(csrf -> csrf.disable()).authorizeHttpRequests(routes -> routes
                    .requestMatchers("/api/v1/admin/**").hasAuthority("SCOPE_ADMIN").anyRequest().authenticated())
                    .oauth2ResourceServer(resource -> resource.jwt(jwt -> jwt.decoder(mock(JwtDecoder.class)))).build();
        }
        @Bean AiAdmissionService admission() { return mock(AiAdmissionService.class); }
        @Bean AdminAiStudioService studio() { return mock(AdminAiStudioService.class); }
        @Bean ProviderMetricsService metrics() { return mock(ProviderMetricsService.class); }
        @Bean RateLimitService limits() { return mock(RateLimitService.class); }
        @Bean AdminActionAudit audit() { return mock(AdminActionAudit.class); }
        @Bean AdminAiStudioController controller(AdminAiStudioService studio, ProviderMetricsService metrics,
                RateLimitService limits, AdminActionAudit audit, AiAdmissionService admission) {
            return new AdminAiStudioController(studio, metrics, limits, audit, admission);
        }
        @Bean GlobalErrorHandler errors() { return new GlobalErrorHandler(new ProblemDetailFactory(Clock.systemUTC())); }
    }
}
