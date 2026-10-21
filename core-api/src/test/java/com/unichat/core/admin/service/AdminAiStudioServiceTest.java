package com.unichat.core.admin.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import com.unichat.core.shared.config.ServiceTokenIssuer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/** Exercises signed private diagnostic calls with in-memory HTTP responses only. */
class AdminAiStudioServiceTest {
    private AdminAiStudioService service;
    private MockRestServiceServer server;
    @BeforeEach void arrange() {
        var signer = mock(ServiceTokenIssuer.class);
        when(signer.issueToken(any(),any(),any(),any(),any(),any())).thenReturn("signed-fixture");
        service = new AdminAiStudioService("http://fixture.invalid", signer);
        server = MockRestServiceServer.bindTo((RestTemplate) ReflectionTestUtils.getField(service, "client")).build();
    }
    @Test void shouldPropagateMaintenanceWhenDrainWinsAfterEarlyDiagnosticCheck() {
        server.expect(requestTo("http://fixture.invalid/internal/v1/metrics/ai/verify-key"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"errorCode\":\"AI_MAINTENANCE\",\"message\":\"hidden-provider-body\"}"));
        assertEquals("AI_MAINTENANCE", assertThrows(AiMaintenanceError.class, () -> service.verifyKey("hive-primary")).getCode());
        server.verify();
    }
    @Test void shouldPreserveSafePrivateFailureCodeAndDiscardProviderMessage() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                .body("{\"errorCode\":\"PROVIDER_HTTP_401\",\"message\":\"hidden-provider-body\"}"));
        var response = service.verifyKey("hive-primary");
        assertEquals("PROVIDER_HTTP_401", response.get("code")); assertFalse(response.toString().contains("hidden-provider-body"));
        server.verify();
    }
    @Test void shouldSanitizeMalformedDependencyFailure() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("hidden-provider-body"));
        assertEquals("PROVIDER_UNAVAILABLE", service.verifyKey("hive-primary").get("code")); server.verify();
    }
    @Test void shouldSendOnlyKeyIdAndRetainServerChosenProbeMetadata() {
        server.expect(anything()).andExpect(content().json("{\"keyId\":\"hive-primary\"}"))
                .andRespond(withSuccess("{\"status\":\"HEALTHY\",\"probeType\":\"GENERATION\",\"provider\":\"hive\"}", MediaType.APPLICATION_JSON));
        assertEquals("GENERATION", service.verifyKey("hive-primary").get("probeType")); server.verify();
    }
    @Test void shouldReadRegistryWithoutSendingGenerationPayload() {
        server.expect(requestTo("http://fixture.invalid/internal/v1/metrics/ai?days=1"))
                .andExpect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withSuccess("{\"activeProvider\":\"hive\",\"activeModel\":\"deepseek-ai/model\"}", MediaType.APPLICATION_JSON));
        assertEquals("hive", service.getRegistry().get("activeProvider")); server.verify();
    }
    @Test void shouldSendExplicitPromptKeyAndSlashModel() {
        server.expect(anything()).andExpect(content().json(
                "{\"prompt\":\"Xin chào\",\"keyId\":\"hive-primary\",\"model\":\"deepseek-ai/model\"}"))
                .andRespond(withSuccess("{\"status\":\"SUCCESS\",\"text\":\"Xin chào bạn\"}", MediaType.APPLICATION_JSON));
        assertEquals("Xin chào bạn", service.executeQuickPrompt("Xin chào", "hive-primary", "deepseek-ai/model").get("text"));
        server.verify();
    }
    @Test void shouldSanitizeSuccessfulHttpErrorEnvelopeAndRetainOnlySafeMetadata() {
        server.expect(anything()).andRespond(withSuccess("{\"status\":\"ERROR\",\"code\":\"PROVIDER_HTTP_403\","
                + "\"keyId\":\"hive-primary\",\"provider\":\"hive\",\"probeType\":\"GENERATION\","
                + "\"message\":\"hidden-provider-body\",\"raw\":\"hidden-provider-body\"}", MediaType.APPLICATION_JSON));
        var response = service.verifyKey("hive-primary");
        assertEquals("PROVIDER_HTTP_403", response.get("code")); assertEquals("GENERATION", response.get("probeType"));
        assertFalse(response.toString().contains("hidden-provider-body")); assertFalse(response.containsKey("raw")); server.verify();
    }
    @Test void shouldRejectMaintenanceEnvelopeEvenWhenPrivateHttpStatusIsOk() {
        server.expect(anything()).andRespond(withSuccess("{\"status\":\"UNAVAILABLE\",\"code\":\"AI_MAINTENANCE\"}", MediaType.APPLICATION_JSON));
        assertThrows(AiMaintenanceError.class, () -> service.verifyKey("hive-primary")); server.verify();
    }
    @Test void shouldReturnSafeUnavailabilityWhenPrivateTransportFails() {
        server.expect(anything()).andRespond(withException(new java.io.IOException("hidden-provider-body")));
        var response = service.verifyKey("hive-primary");
        assertEquals("PROVIDER_UNAVAILABLE", response.get("code")); assertFalse(response.toString().contains("hidden-provider-body"));
        server.verify();
    }
}
