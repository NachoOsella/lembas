package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

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

    private static final String TOKEN_TYPE_CLAIM = "tokenType";
    private static final String ACCESS_TOKEN_TYPE = "ACCESS";
    private static final String REFRESH_TOKEN_TYPE = "REFRESH";

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
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .claim(TOKEN_TYPE_CLAIM, ACCESS_TOKEN_TYPE)
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
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .claim(TOKEN_TYPE_CLAIM, REFRESH_TOKEN_TYPE)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(REFRESH_EXPIRATION)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Validates a JWT token signature and structure, returning the parsed claims.
     *
     * <p>This method verifies the HMAC-SHA256 signature but does <strong>not</strong>
     * check expiration. Expiration checks are done by the parser at parse-time
     * and result in an {@link ExpiredJwtException}.</p>
     *
     * @param token the raw JWT token string
     * @return the parsed claims on successful validation
     * @throws ExpiredJwtException     if the token is expired
     * @throws MalformedJwtException   if the token is structurally invalid
     * @throws SignatureException      if the signature does not match
     * @throws UnsupportedJwtException if the token uses an unsupported algorithm
     * @throws IllegalArgumentException if the token is null or blank
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Returns whether the parsed claims belong to an access token.
     *
     * @param claims parsed JWT claims
     * @return {@code true} when the token is intended for API authentication
     */
    public boolean isAccessToken(Claims claims) {
        return ACCESS_TOKEN_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    /**
     * Extracts the user ID from a validated JWT token.
     *
     * @param token the raw JWT token string
     * @return the user ID stored in the subject claim
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = validateToken(token);
        return Long.parseLong(claims.getSubject());
    }

    /**
     * Extracts the role claim from a validated JWT token.
     *
     * @param token the raw JWT token string
     * @return the role stored in the token claims
     */
    public Role getRoleFromToken(String token) {
        Claims claims = validateToken(token);
        return Role.valueOf(claims.get("role", String.class));
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
