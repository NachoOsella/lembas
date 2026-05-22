package com.dietetica.lembas.auth.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Configuration properties for JWT token generation.
 *
 * <p>Values are sourced from the {@code app.security.*} namespace in
 * {@code application.yml} (or environment variables).</p>
 *
 * @param jwtSecret     the HMAC-SHA256 signing key (must be at least 256 bits)
 * @param jwtExpiration the access token time-to-live (default: 24h)
 */
@ConfigurationProperties(prefix = "app.security")
public record JwtProperties(
        String jwtSecret,
        Duration jwtExpiration
) {
}
