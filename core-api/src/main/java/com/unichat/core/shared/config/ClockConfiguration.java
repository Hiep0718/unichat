package com.unichat.core.shared.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides time abstractions for deterministic business logic and tests.
 */
@Configuration
public class ClockConfiguration {

    /**
     * Returns the UTC system clock used by production code.
     *
     * @return UTC clock
     */
    @Bean
    public Clock applicationClock() {
        return Clock.systemUTC();
    }
}