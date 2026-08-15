package com.unichat.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Starts the UniChat Core API process.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class UniChatCoreApplication {

    static {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }


    /**
     * Starts Spring Boot with environment-driven configuration.
     *
     * @param arguments command-line arguments
     */
    public static void main(String[] arguments) {
        SpringApplication.run(UniChatCoreApplication.class, arguments);
    }
}