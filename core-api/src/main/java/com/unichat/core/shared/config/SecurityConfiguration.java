package com.unichat.core.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Defines the stateless Core API security boundary.
 */
@Configuration
public class SecurityConfiguration {

    /**
     * Allows health probes and requires a valid bearer token elsewhere.
     *
     * @param http Spring Security HTTP builder
     * @return configured filter chain
     * @throws Exception when Spring cannot build the filter chain
     */
    @Bean
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(resourceServer ->
                resourceServer.jwt(Customizer.withDefaults()));
        return http.build();
    }
}