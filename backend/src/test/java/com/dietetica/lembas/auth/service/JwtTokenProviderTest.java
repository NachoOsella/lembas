package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for JWT token generation and configured signing rules.
 */
class JwtTokenProviderTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    /**
     * Verifies that access tokens include the authenticated user's identity and role claims.
     */
    @Test
    void createAccessTokenIncludesExpectedClaims() {
        JwtTokenProvider provider = new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        User user = new User(10L, null, "customer@lembas.com", "hash", "Customer", "Lembas",
                null, Role.CUSTOMER, true, null, null);

        String token = provider.createAccessToken(user);

        Claims claims = Jwts.parser()
                .verifyWith(provider.getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        assertThat(claims.getSubject()).isEqualTo("10");
        assertThat(claims.get("email", String.class)).isEqualTo("customer@lembas.com");
        assertThat(claims.get("role", String.class)).isEqualTo("CUSTOMER");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    /**
     * Verifies that refresh tokens carry only the subject and standard time claims.
     */
    @Test
    void createRefreshTokenIncludesSubjectWithoutUserProfileClaims() {
        JwtTokenProvider provider = new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        User user = new User(11L, null, "customer@lembas.com", "hash", "Customer", "Lembas",
                null, Role.CUSTOMER, true, null, null);

        String token = provider.createRefreshToken(user);

        Claims claims = Jwts.parser()
                .verifyWith(provider.getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        assertThat(claims.getSubject()).isEqualTo("11");
        assertThat(claims.get("email")).isNull();
        assertThat(claims.get("role")).isNull();
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    /**
     * Verifies that weak signing secrets are rejected during provider creation.
     */
    @Test
    void constructorRejectsShortSecret() {
        assertThatThrownBy(() -> new JwtTokenProvider(new JwtProperties("too-short", Duration.ofHours(1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 32 characters");
    }

    /**
     * Verifies that blank signing secrets are rejected during provider creation.
     */
    @Test
    void constructorRejectsBlankSecret() {
        assertThatThrownBy(() -> new JwtTokenProvider(new JwtProperties(" ", Duration.ofHours(1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must not be empty");
    }
}
