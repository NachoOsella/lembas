package com.dietetica.lembas.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extracts and validates JWT tokens from the {@code Authorization} header or
 * the HttpOnly access-token cookie on every request, populating the Spring
 * Security context for valid tokens.
 *
 * <p>This filter runs once per request (via {@link OncePerRequestFilter})
 * after Spring Security's built-in filters. It does not abort the filter
 * chain on missing or invalid tokens; it simply leaves the context
 * unauthenticated, letting the authorization layer decide whether the
 * endpoint requires authentication.</p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final LembasUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
                                   LembasUserDetailsService userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    /**
     * Extracts the JWT bearer token, validates it, and sets the
     * authentication in the Spring Security context.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (token != null) {
            try {
                Claims claims = jwtTokenProvider.validateToken(token);
                if (!jwtTokenProvider.isAccessToken(claims)) {
                    log.debug("Rejected non-access JWT for request {}", request.getRequestURI());
                    filterChain.doFilter(request, response);
                    return;
                }

                Long userId = Long.parseLong(claims.getSubject());

                UserDetails userDetails = userDetailsService.loadUserById(userId);
                if (!userDetails.isEnabled()) {
                    SecurityContextHolder.clearContext();
                    log.debug("Rejected JWT for disabled user id={} request={}", userId, request.getRequestURI());
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (ExpiredJwtException e) {
                SecurityContextHolder.clearContext();
                log.debug("JWT token expired for request {}", request.getRequestURI());
            } catch (UsernameNotFoundException e) {
                SecurityContextHolder.clearContext();
                log.debug("JWT subject no longer exists for request {}", request.getRequestURI());
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
                log.debug("Invalid JWT token for request {}", request.getRequestURI());
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extracts the access token from the bearer header or auth cookie.
     *
     * @param request the incoming HTTP request
     * @return the raw token string without the {@code Bearer } prefix, or {@code null}
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }

        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (AuthCookieService.ACCESS_COOKIE_NAME.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
