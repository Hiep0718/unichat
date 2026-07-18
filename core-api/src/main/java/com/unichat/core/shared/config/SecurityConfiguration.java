package com.unichat.core.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Map;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;

/**
 * Defines the stateless Core API security boundary.
 */
@Configuration
public class SecurityConfiguration {

    /**
     * Delegating password encoder configured for Argon2id (default) and BCrypt (legacy).
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        var argon2 = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        var bcrypt = new BCryptPasswordEncoder();
        
        Map<String, PasswordEncoder> encoders = Map.of(
            "argon2", argon2,
            "bcrypt", bcrypt
        );
        
        var delegating = new DelegatingPasswordEncoder("argon2", encoders);
        delegating.setDefaultPasswordEncoderForMatches(bcrypt); // Legacy hashes don't have a prefix
        return delegating;
    }

    /**
     * Configures the JWT Decoder with the public key.
     */
    @Bean
    public JwtDecoder jwtDecoder(JwtKeyProvider keyProvider) {
        return NimbusJwtDecoder.withPublicKey(keyProvider.getPublicKey()).build();
    }

    /**
     * Configures the JWT Encoder with both public and private keys for token generation.
     */
    @Bean
    public JwtEncoder jwtEncoder(JwtKeyProvider keyProvider) {
        JWK jwk = new RSAKey.Builder(keyProvider.getPublicKey())
                .privateKey(keyProvider.getPrivateKey())
                .build();
        JWKSource<SecurityContext> jwks = new ImmutableJWKSet<>(new JWKSet(jwk));
        return new NimbusJwtEncoder(jwks);
    }

    /**
     * Allows health probes and auth endpoints, and requires a valid bearer token elsewhere.
     *
     * @param http Spring Security HTTP builder
     * @return configured filter chain
     * @throws Exception when Spring cannot build the filter chain
     */
    @Bean
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/v1/health", "/actuator/health", "/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasAuthority("SCOPE_ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(resourceServer ->
                resourceServer.jwt(jwt -> {}));
        return http.build();
    }
}