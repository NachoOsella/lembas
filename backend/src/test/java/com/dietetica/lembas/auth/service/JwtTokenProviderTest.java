package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

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

    @Nested
    class ValidateToken {

        private final JwtTokenProvider provider =
                new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        private final User user = new User(10L, null, "customer@lembas.com", "hash",
                "Customer", "Lembas", null, Role.CUSTOMER, true, null, null);

        @Test
        void Should_returnClaims_when_tokenIsValid() {
            String token = provider.createAccessToken(user);
            Claims claims = provider.validateToken(token);

            assertThat(claims.getSubject()).isEqualTo("10");
            assertThat(claims.get("tokenType", String.class)).isEqualTo("ACCESS");
            assertThat(provider.isAccessToken(claims)).isTrue();
            assertThat(claims.get("email", String.class)).isEqualTo("customer@lembas.com");
            assertThat(claims.get("role", String.class)).isEqualTo("CUSTOMER");
        }

        @Test
        void Should_throwExpiredJwtException_when_tokenIsExpired() {
            // Create a provider that issues tokens that expire immediately (negative duration).
            // Instead, create a token manually with an expiration in the past.
            SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
            String expiredToken = Jwts.builder()
                    .subject("10")
                    .issuedAt(Date.from(Instant.now().minus(Duration.ofHours(2))))
                    .expiration(Date.from(Instant.now().minus(Duration.ofHours(1))))
                    .signWith(key)
                    .compact();

            assertThatThrownBy(() -> provider.validateToken(expiredToken))
                    .isInstanceOf(ExpiredJwtException.class);
        }

        @Test
        void Should_throwSignatureException_when_tokenSignedWithDifferentKey() {
            SecretKey otherKey = Keys.hmacShaKeyFor(
                    "other-key-0123456789abcdef0123456789".getBytes(StandardCharsets.UTF_8));
            String badToken = Jwts.builder()
                    .subject("10")
                    .issuedAt(new Date())
                    .expiration(Date.from(Instant.now().plus(Duration.ofHours(1))))
                    .signWith(otherKey)
                    .compact();

            assertThatThrownBy(() -> provider.validateToken(badToken))
                    .isInstanceOf(SignatureException.class);
        }

        @Test
        void Should_throwMalformedJwtException_when_tokenIsGarbage() {
            assertThatThrownBy(() -> provider.validateToken("not-a-jwt"))
                    .isInstanceOf(MalformedJwtException.class);
        }
    }

    @Nested
    class TokenType {

        private final JwtTokenProvider provider =
                new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        private final User user = new User(10L, null, "customer@lembas.com", "hash",
                "Customer", "Lembas", null, Role.CUSTOMER, true, null, null);

        @Test
        void Should_returnFalse_when_tokenIsRefreshToken() {
            String token = provider.createRefreshToken(user);
            Claims claims = provider.validateToken(token);

            assertThat(claims.get("tokenType", String.class)).isEqualTo("REFRESH");
            assertThat(provider.isAccessToken(claims)).isFalse();
        }
    }

    @Nested
    class GetUserIdFromToken {

        private final JwtTokenProvider provider =
                new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        private final User user = new User(42L, null, "user@lembas.com", "hash",
                "Test", "User", null, Role.CUSTOMER, true, null, null);

        @Test
        void Should_returnUserId_when_tokenIsValid() {
            String token = provider.createAccessToken(user);
            Long userId = provider.getUserIdFromToken(token);

            assertThat(userId).isEqualTo(42L);
        }
    }

    @Nested
    class GetRoleFromToken {

        private final JwtTokenProvider provider =
                new JwtTokenProvider(new JwtProperties(SECRET, Duration.ofHours(2)));
        private final User adminUser = new User(1L, 1L, "admin@lembas.com", "hash",
                "Admin", "User", null, Role.ADMIN, true, null, null);

        @Test
        void Should_returnRole_when_tokenIsValid() {
            String token = provider.createAccessToken(adminUser);
            Role role = provider.getRoleFromToken(token);

            assertThat(role).isEqualTo(Role.ADMIN);
        }
    }
}
