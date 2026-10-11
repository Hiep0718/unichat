package com.unichat.core.shared.servicesecurity;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;

/** Restricts the AI service identity to the three explicitly approved Core interfaces. */
@Configuration
public class PrivateSecurityConfiguration {
    /** Service JWTs are header-bound and do not use browser cookie sessions. */
    @Bean
    @Order(1)
    public SecurityFilterChain privateChain(HttpSecurity http, ServiceRequestVerifier verifier) throws Exception {
        return http.securityMatcher("/internal/v1/**").csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new ServiceIdentityFilter(verifier), AuthorizationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/internal/v1/service-nonces/consume",
                                "/internal/v1/chat-operations/*/checkpoint", "/internal/v1/provider-attempts").hasAuthority("SERVICE_AI")
                        .anyRequest().denyAll()).build();
    }
}
