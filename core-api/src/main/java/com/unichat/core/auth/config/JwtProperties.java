package com.unichat.core.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * JWT Configuration properties.
 */
@ConfigurationProperties(prefix = "unichat.jwt")
public record JwtProperties(
    @DefaultValue("900") int accessTokenTtlSeconds
) {}
