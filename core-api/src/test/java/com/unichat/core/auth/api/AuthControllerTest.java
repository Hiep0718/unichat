package com.unichat.core.auth.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.unichat.core.auth.config.JwtProperties;
import com.unichat.core.auth.service.AuthService;
import com.unichat.core.auth.service.AuthService.TokenPair;
import com.unichat.core.shared.idempotency.IdempotencyService;

class AuthControllerTest {

    private MockMvc mockMvc;
    private AuthService authService;
    private IdempotencyService idempotencyService;
    private JwtProperties jwtProperties;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        idempotencyService = mock(IdempotencyService.class);
        jwtProperties = new JwtProperties(900);

        AuthController controller = new AuthController(authService, idempotencyService, jwtProperties,
                new AuthTransport("local"), mock(com.unichat.core.shared.ratelimit.RateLimitService.class));
        mockMvc = standaloneSetup(controller).setControllerAdvice(new com.unichat.core.common.error.GlobalErrorHandler(
                new com.unichat.core.common.error.ProblemDetailFactory(java.time.Clock.systemUTC()))).build();
    }

    @Test
    @DisplayName("Web login sets HttpOnly cookie and returns LoginResponse without refreshToken in body")
    void shouldLoginForWebWithCookie() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new TokenPair("access-jwt-123", "refresh-opaque-456"));

        String payload = """
            {
                "email": "student@unichat.vn",
                "password": "Password123456!"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("access-jwt-123"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900L))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    @DisplayName("Mobile login returns MobileLoginResponse with refreshToken in body and no cookie")
    void shouldLoginForMobileWithRefreshTokenInBody() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new TokenPair("access-jwt-123", "refresh-opaque-456"));

        String payload = """
            {
                "email": "student@unichat.vn",
                "password": "Password123456!"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("access-jwt-123"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-opaque-456"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900L));
    }

    @Test
    @DisplayName("Mobile refresh returns rotated tokens in body")
    void shouldRefreshForMobileWithRotatedRefreshToken() throws Exception {
        when(authService.refresh("old-refresh-token-12345678901234567890"))
                .thenReturn(new TokenPair("new-access-jwt", "new-rotated-refresh-token"));

        String payload = """
            {
                "refreshToken": "old-refresh-token-12345678901234567890"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andExpect(jsonPath("$.accessToken").value("new-access-jwt"))
                .andExpect(jsonPath("$.refreshToken").value("new-rotated-refresh-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900L));
    }

    @Test
    @DisplayName("Mobile logout with request body revokes token and returns 204")
    void shouldLogoutForMobileWithRequestBody() throws Exception {
        String payload = """
            {
                "refreshToken": "mobile-refresh-token-to-revoke-1234567890"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNoContent());

        verify(authService).logout("mobile-refresh-token-to-revoke-1234567890");
    }
    @Test
    void shouldRejectCookieMixedWithNativeBody() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                .cookie(new jakarta.servlet.http.Cookie("refresh_token", "old-refresh-token-12345678901234567890"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"old-refresh-token-12345678901234567890\"}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(authService);
    }
    @Test
    void shouldRejectNativeTransportWithBrowserOrigin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").header("X-Client-Type", "mobile").header("Origin", "http://localhost:5173")
                .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"student@unichat.vn\",\"password\":\"legacy\"}"))
                .andExpect(status().isBadRequest());
    }
    @Test
    void shouldRejectMissingRefreshCredentials() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")).andExpect(status().isUnauthorized());
    }
    @Test
    void shouldRejectNonAsciiOtpBeforeResetService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"student@unichat.vn\",\"otp\":\"１２３４５６\",\"newPassword\":\"password123456\"}"))
                .andExpect(status().isUnprocessableEntity());
        org.mockito.Mockito.verifyNoInteractions(authService);
    }
    @Test
    void shouldReturnSameEmptyForgotPasswordResponse() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown@unichat.vn\"}")).andExpect(status().isOk());
    }
    @Test
    void shouldExposeLocalCsrfExceptionExplicitly() throws Exception {
        mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"));
    }
}
