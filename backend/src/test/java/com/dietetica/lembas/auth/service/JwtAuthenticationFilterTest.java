package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the {@link JwtAuthenticationFilter}.
 *
 * <p>Verifies that valid tokens populate the security context and that
 * missing, expired, or malformed tokens leave the context empty.</p>
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private LembasUserDetailsService userDetailsService;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;

    private static final User user = new User(10L, null, "user@lembas.com", "hash",
            "Test", "User", null, Role.CUSTOMER, true, null, null);

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
        SecurityContextHolder.clearContext();
    }

    @Test
    void Should_setAuthentication_when_tokenIsValid() throws Exception {
        String validToken = createValidToken();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + validToken);
        MockHttpServletResponse response = new MockHttpServletResponse();

        LembasUserDetails userDetails = new LembasUserDetails(user);
        Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                .parseSignedClaims(validToken).getPayload();
        when(jwtTokenProvider.validateToken(validToken)).thenReturn(claims);
        when(jwtTokenProvider.isAccessToken(claims)).thenReturn(true);
        when(userDetailsService.loadUserById(10L)).thenReturn(userDetails);

        filter.doFilterInternal(request, response, filterChain);

        SecurityContext context = SecurityContextHolder.getContext();
        assertThat(context.getAuthentication()).isNotNull();
        assertThat(context.getAuthentication().getPrincipal()).isEqualTo(userDetails);
        assertThat(context.getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_CUSTOMER");

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void Should_notSetAuthentication_when_noAuthorizationHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void Should_notSetAuthentication_when_headerNotBearer() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void Should_notSetAuthentication_when_tokenIsRefreshToken() throws Exception {
        String refreshToken = createValidToken();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + refreshToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                .parseSignedClaims(refreshToken).getPayload();

        when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(claims);
        when(jwtTokenProvider.isAccessToken(claims)).thenReturn(false);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        verify(userDetailsService, never()).loadUserById(anyLong());
    }

    @Test
    void Should_notSetAuthentication_when_tokenSubjectUserDoesNotExist() throws Exception {
        String validToken = createValidToken();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + validToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                .parseSignedClaims(validToken).getPayload();

        when(jwtTokenProvider.validateToken(validToken)).thenReturn(claims);
        when(jwtTokenProvider.isAccessToken(claims)).thenReturn(true);
        when(userDetailsService.loadUserById(10L))
                .thenThrow(new org.springframework.security.core.userdetails.UsernameNotFoundException("missing"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void Should_notSetAuthentication_when_tokenIsExpired() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer expired.token.here");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtTokenProvider.validateToken("expired.token.here"))
                .thenThrow(new io.jsonwebtoken.ExpiredJwtException(null, null, "expired"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        verify(userDetailsService, never()).loadUserById(anyLong());
    }

    @Test
    void Should_notSetAuthentication_when_tokenIsMalformed() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer garbage");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtTokenProvider.validateToken("garbage"))
                .thenThrow(new io.jsonwebtoken.MalformedJwtException("malformed"));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void Should_continueFilterChain_when_tokenIsMissing() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    private String createValidToken() {
        SecretKey key = getSigningKey();
        return Jwts.builder()
                .subject("10")
                .claim("tokenType", "ACCESS")
                .claim("email", "user@lembas.com")
                .claim("role", "CUSTOMER")
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plus(Duration.ofHours(1))))
                .signWith(key)
                .compact();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }
}
