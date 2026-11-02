package com.unichat.core.config;

import java.io.IOException;
import java.net.Socket;
import java.security.GeneralSecurityException;
import java.security.KeyPairGenerator;
import javax.net.ssl.SSLContext;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Custom Flyway migration strategy configuration.
 *
 * <p>Pre-warms the JVM TLS stack before opening the first PostgreSQL SSL connection
 * (preventing cold-start handshake timeouts against cloud poolers) and runs migrations
 * without rewriting prior migration history.</p>
 */
@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    /**
     * Builds the migration strategy that pre-warms TLS and executes Flyway migrations.
     *
     * @return configured {@link FlywayMigrationStrategy}
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return (Flyway flyway) -> {
            warmUpTlsContext();
            log.info("Executing Flyway migrate...");
            flyway.migrate();
            log.info("Flyway migration completed successfully.");
        };
    }

    /**
     * Initializes the default JVM {@link SSLContext}, {@code SSLSocket}, and TLS 1.3
     * key-share providers in memory before pgJDBC sends {@code SSLRequest} to the pooler.
     */
    void warmUpTlsContext() {
        try (Socket ignored = SSLContext.getDefault().getSocketFactory().createSocket()) {
            KeyPairGenerator.getInstance("X25519").generateKeyPair();
            log.debug("Pre-warmed default JVM TLS context for database connectivity.");
        } catch (GeneralSecurityException | IOException ex) {
            log.warn("TLS context pre-warm failed; proceeding directly to database connection.", ex);
        }
    }
}
