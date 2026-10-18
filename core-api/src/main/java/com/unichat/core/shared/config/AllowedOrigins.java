package com.unichat.core.shared.config;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The origins a browser may reach this server from.
 *
 * <p>One list, read by everything that needs it. There used to be two: CORS
 * read {@code CORS_ALLOWED_ORIGINS} while the STOMP endpoint read a separate
 * {@code unichat.frontend-origin} that held a single value. Two settings for
 * one question is a trap — opening the app on a LAN address or a tunnel would
 * let HTTP through and silently refuse the socket, which looks like live
 * delivery being broken rather than like a missing setting.
 *
 * <p>Wildcards are rejected rather than ignored. A credentialed request from
 * any origin is the whole of CORS defeated, and a configuration that asks for
 * it is a mistake worth failing the startup over.
 */
@Component
public class AllowedOrigins {

    /** Vite, and the two ports the API itself is served on in development. */
    private static final String LOCAL_DEFAULTS =
            "http://localhost:5173,http://localhost:8081,http://localhost:8082";

    private final Set<String> values;

    public AllowedOrigins(
            @Value("${CORS_ALLOWED_ORIGINS:}") String originList,
            @Value("${UNICHAT_SECURITY_PROFILE:${APP_ENV:local}}") String profile) {
        boolean production = !"local".equals(profile);
        String configured = originList.isBlank() ? LOCAL_DEFAULTS : originList;

        var allowed = Arrays.stream(configured.split(","))
                .map(String::strip)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));

        // Only alongside the defaults: someone who listed origins explicitly
        // gets exactly what they listed.
        if (!production && originList.isBlank()) {
            allowed.add("http://127.0.0.1:5173");
        }
        if (allowed.stream().anyMatch(origin -> origin.contains("*"))) {
            throw new IllegalArgumentException("CORS wildcard forbidden");
        }

        this.values = Set.copyOf(allowed);
    }

    public Set<String> values() {
        return values;
    }

    /** For the APIs that take varargs, such as the STOMP endpoint registry. */
    public String[] asArray() {
        return values.toArray(String[]::new);
    }
}
