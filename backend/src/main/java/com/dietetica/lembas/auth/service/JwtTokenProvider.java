package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/**
 * Generates and validates JWT access and refresh tokens.
 *
 * <p>Access tokens encode the user's id, email, and role as standard claims
 * and are signed with HMAC-SHA256 using the configured secret. Refresh tokens
 * carry only the user id and have a longer time-to-live.</p>
 */
@Service
public class JwtTokenProvider {

    /** Refresh token TTL — 7 days. */
    private static final Duration REFRESH_EXPIRATION = Duration.ofDays(7);

    private final SecretKey signingKey;
    private final Duration accessExpiration;

    public JwtTokenProvider(JwtProperties properties) {
        String secret = properties.jwtSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT secret must not be empty");
        }
        if (secret.length() < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must be at least 32 characters (256 bits)");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = properties.jwtExpiration();
    }

    /**
     * Creates an access token for the given user.
     *
     * @param user the authenticated user
     * @return a signed JWT access token
     */
    public String createAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessExpiration)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Creates a refresh token for the given user.
     *
     * <p>Refresh tokens carry minimal claims and have a longer TTL
     * (7 days). They can be exchanged for a new access token without
     * requiring the user to re-authenticate.</p>
     *
     * @param user the authenticated user
     * @return a signed JWT refresh token
     */
    public String createRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(REFRESH_EXPIRATION)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Returns the HMAC-SHA256 signing key (exposed for the JWT authentication filter).
     *
     * @return the signing key
     */
    SecretKey getSigningKey() {
        return signingKey;
    }
}
