package com.dietetica.lembas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Main entry point for the Dietetica Lembas backend application.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class LembasBackendApplication {

    /**
     * Starts the Spring Boot application context.
     */
    public static void main(String[] args) {
        SpringApplication.run(LembasBackendApplication.class, args);
    }
}
