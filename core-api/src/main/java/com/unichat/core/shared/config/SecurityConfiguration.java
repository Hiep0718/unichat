package com.unichat.core.shared.config;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.unichat.core.auth.config.AuthOriginFilter;
import com.unichat.core.auth.config.CurrentSessionValidator;
import com.unichat.core.auth.config.SecurityFailureResponder;

/** Stateless user security boundary; private service routes have a separate ordered chain. */
@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {
    private final Set<String> origins;
    private final boolean production;
    /** Loads deployment policy from the environment, without wildcard credentialed CORS. */
    public SecurityConfiguration(
            @Value("${CORS_ALLOWED_ORIGINS:}") String originList,
            @Value("${UNICHAT_SECURITY_PROFILE:${APP_ENV:local}}") String profile) {
        production = !"local".equals(profile);
        String defaults = "http://localhost:5173,http://localhost:8081,http://localhost:8082";
        String configured = originList.isBlank() ? defaults : originList;
        var allowed = Arrays.stream(configured.split(",")).map(String::strip)
                .filter(origin -> !origin.isEmpty()).collect(Collectors.toSet());
        if (!production && originList.isBlank()) allowed.add("http://127.0.0.1:5173");
        if (allowed.stream().anyMatch(origin -> origin.contains("*"))) throw new IllegalArgumentException("CORS wildcard forbidden");
        origins = Set.copyOf(allowed);
    }
    /** Uses Argon2id for new hashes and supports legacy BCrypt verification. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        PasswordEncoder argon2 = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        PasswordEncoder bcrypt = new BCryptPasswordEncoder();
        DelegatingPasswordEncoder encoder = new DelegatingPasswordEncoder("argon2", Map.of("argon2", argon2, "bcrypt", bcrypt));
        encoder.setDefaultPasswordEncoderForMatches(bcrypt);
        return encoder;
    }
    /** Verifies RS256 plus issuer/audience and live account/family state. */
    @Bean
    public JwtDecoder jwtDecoder(JwtKeyProvider keys, CurrentSessionValidator currentSession) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(keys.getPublicKey()).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer("unichat-core-api"),
                token -> token.getAudience().contains("unichat-client") ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null)),
                currentSession));
        return decoder;
    }
    /** Signs access credentials using existing configured key material. */
    @Bean
    public JwtEncoder jwtEncoder(JwtKeyProvider keys) {
        RSAKey key = new RSAKey.Builder(keys.getPublicKey()).privateKey(keys.getPrivateKey()).build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
    }
    /** Allows only explicitly configured first-party Origins and known client headers. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.copyOf(origins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Client-Type",
                "X-Request-Id", "X-XSRF-TOKEN", "traceparent"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization", "X-Request-Id", "Retry-After", "Location"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
    /** Enforces admin authorities and production CSRF for browser-cookie mutations. */
    @Bean
    @Order(2)
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        if (production) http.redirectToHttps(org.springframework.security.config.Customizer.withDefaults());
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/health", "/actuator/health", "/api/v1/auth/**").permitAll()
                        .requestMatchers("/ws/work-chat/**").permitAll()
                        .requestMatchers("/internal/v1/**").denyAll()
                        .requestMatchers("/api/v1/admin/**").hasAuthority("SCOPE_ADMIN")
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) -> SecurityFailureResponder.write(
                                response, request, 401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục."))
                        .accessDeniedHandler((request, response, error) -> SecurityFailureResponder.write(
                                response, request, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.")))
                .oauth2ResourceServer(server -> server.jwt(jwt -> { }).authenticationEntryPoint(
                        (request, response, error) -> SecurityFailureResponder.write(
                                response, request, 401, "UNAUTHENTICATED", "Phiên đăng nhập không còn hợp lệ.")));
        configureCsrf(http);
        http.addFilterBefore(new AuthOriginFilter(origins), CsrfFilter.class);
        http.headers(headers -> headers.contentSecurityPolicy(policy -> policy.policyDirectives("default-src 'none'; frame-ancestors 'none'")));
        return http.build();
    }
    private void configureCsrf(HttpSecurity http) throws Exception {
        if (!production) { http.csrf(csrf -> csrf.disable()); return; }
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.secure(true).sameSite("Strict").path("/api/v1/auth"));
        http.csrf(csrf -> csrf.csrfTokenRepository(repository)
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                .requireCsrfProtectionMatcher(request -> request.getRequestURI().startsWith("/api/v1/auth/")
                        && !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod())
                        && (request.getHeader("Origin") != null || AuthOriginFilter.hasRefreshCookie(request))));
    }
}
