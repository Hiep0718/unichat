package com.unichat.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Starts the UniChat Core API process.
 */
@SpringBootApplication
public class UniChatCoreApplication {

    /**
     * Starts Spring Boot with environment-driven configuration.
     *
     * @param arguments command-line arguments
     */
    public static void main(String[] arguments) {
        SpringApplication.run(UniChatCoreApplication.class, arguments);
    }
}