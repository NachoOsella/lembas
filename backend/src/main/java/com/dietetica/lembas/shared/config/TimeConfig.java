package com.dietetica.lembas.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** Provides time-related infrastructure beans used by services. */
@Configuration
public class TimeConfig {

    /** Returns the system clock so time-dependent services can be tested deterministically. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
