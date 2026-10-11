package com.unichat.core.shared.config;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import com.unichat.core.auth.config.CurrentSessionValidator;
import com.unichat.core.auth.service.SessionStateService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Offline integration of the real security filter chain and real RS256 codec. */
class AccessSecurityChainTest {
    private final UUID userId=UUID.randomUUID(), familyId=UUID.randomUUID();
    private AnnotationConfigWebApplicationContext context;
    private MockMvc http;
    private SessionStateService sessions;

    @BeforeEach void initialize() { initialize("local"); }
    @AfterEach void close() { context.close(); }

    @Test void shouldDecodeActualSignedStringIssuerAndValidateLiveFamily() {
        String token=token("unichat-core-api","unichat-client","USER");
        var decoded=context.getBean(JwtDecoder.class).decode(token);
        assertEquals("unichat-core-api",decoded.getClaimAsString("iss"));
        assertEquals(familyId.toString(),decoded.getClaimAsString("sid"));
        verify(sessions).isActive(userId,familyId,3L);
    }
    @Test void shouldDenyEveryProtectedScopeWithoutAccess() throws Exception {
        for (String path:List.of("/api/v1/users/me","/api/v1/admin/metrics","/api/v1/workspaces/"+UUID.randomUUID()+"/conversations")) {
            http.perform(get(path)).andExpect(status().isUnauthorized());
        }
    }
    @Test void shouldAllowUserIdentityButDenyAdminDespiteAdminEmail() throws Exception {
        String token=token("unichat-core-api","unichat-client","USER");
        http.perform(get("/api/v1/users/me").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        http.perform(get("/api/v1/admin/metrics").header("Authorization","Bearer "+token)).andExpect(status().isForbidden());
    }
    @Test void shouldAllowAdminAndRejectRevokedAccessImmediately() throws Exception {
        String token=token("unichat-core-api","unichat-client","ADMIN");
        http.perform(get("/api/v1/admin/metrics").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        when(sessions.isActive(userId,familyId,3L)).thenReturn(false);
        http.perform(get("/api/v1/admin/metrics").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
    }
    @Test void shouldRejectWrongIssuerAudienceAndSignature() throws Exception {
        for (String token:List.of(token("wrong","unichat-client","ADMIN"),token("unichat-core-api","wrong","ADMIN"),"eyFake")) {
            http.perform(get("/api/v1/users/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        }
    }
    @Test void shouldDenyUserAccessToPrivateEndpoints() throws Exception {
        http.perform(post("/internal/v1/provider-attempts").header("Authorization","Bearer "+token("unichat-core-api","unichat-client","ADMIN")))
                .andExpect(status().isForbidden());
    }
    @Test void shouldRejectHostileOriginBeforePublicAuthController() throws Exception {
        http.perform(post("/api/v1/auth/login").header("Origin","https://hostile.invalid"))
                .andExpect(status().isForbidden());
        http.perform(post("/api/v1/auth/login").header("Origin","http://localhost:5173"))
                .andExpect(status().isOk());
    }
    @Test void shouldAllowDevProxyOriginForLogoutThenLogin() throws Exception {
        String origin = "http://127.0.0.1:5173";
        http.perform(post("/api/v1/auth/logout").header("Origin",origin)).andExpect(status().isNoContent());
        http.perform(post("/api/v1/auth/login").header("Origin",origin)).andExpect(status().isOk());
    }
    @Test void shouldRequireDoubleSubmitCsrfInProductionBrowserRequests() throws Exception {
        context.close(); initialize("production");
        http.perform(post("https://localhost/api/v1/auth/login").secure(true).header("Origin","http://localhost:5173"))
                .andExpect(status().isForbidden());
        http.perform(post("https://localhost/api/v1/auth/login").secure(true).header("Origin","http://localhost:5173")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf().asHeader()))
                .andExpect(status().isOk());
    }
    private void initialize(String profile) {
        context=new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",Map.of("UNICHAT_SECURITY_PROFILE",profile)));
        context.register(SecurityConfiguration.class,Fixture.class); context.refresh();
        sessions=context.getBean(SessionStateService.class);
        when(sessions.isActive(userId,familyId,3L)).thenReturn(true);
        http=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    private String token(String issuer,String audience,String role) {
        Instant now=Instant.now();
        var claims=JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience)).subject(userId.toString())
                .issuedAt(now).expiresAt(now.plusSeconds(900)).claim("sid",familyId.toString()).claim("securityVersion",3L)
                .claim("scope",role).claim("email","admin@unichat.vn").build();
        return context.getBean(JwtEncoder.class).encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    @Configuration @EnableWebSecurity @EnableWebMvc
    static class Fixture {
        @Bean SessionStateService sessions() { return mock(SessionStateService.class); }
        @Bean CurrentSessionValidator validator(SessionStateService sessions) { return new CurrentSessionValidator(sessions); }
        @Bean JwtKeyProvider keys() { return new JwtKeyProvider("","",new DefaultResourceLoader(),"local"); }
        @Bean Probe endpoints() { return new Probe(); }
    }
    @RestController
    static class Probe {
        @GetMapping({"/api/v1/users/me","/api/v1/admin/metrics"}) Map<String,String> read() { return Map.of("state","ok"); }
        @PostMapping("/api/v1/auth/login") Map<String,String> login() { return Map.of("state","ok"); }
        @PostMapping("/api/v1/auth/logout") ResponseEntity<Void> logout() { return ResponseEntity.noContent().build(); }
    }
}
