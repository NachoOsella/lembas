package com.dietetica.lembas.shared.config;

import com.dietetica.lembas.shared.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Rejects cross-origin browser writes for cookie-authenticated API requests.
 *
 * <p>HttpOnly cookies are sent automatically by browsers, so unsafe methods
 * need an origin check while CSRF tokens are not enabled. Requests without an
 * {@code Origin} header are allowed to keep non-browser clients and same-origin
 * form-less requests working.</p>
 */
@Component
public class OriginValidationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of(
            HttpMethod.GET.name(),
            HttpMethod.HEAD.name(),
            HttpMethod.OPTIONS.name(),
            HttpMethod.TRACE.name()
    );

    private final ObjectMapper objectMapper;
    private final Set<String> allowedOrigins;

    public OriginValidationFilter(
            ObjectMapper objectMapper,
            @Value("${app.security.allowed-origins:http://localhost:4200,http://localhost:8080}") String allowedOrigins
    ) {
        this.objectMapper = objectMapper;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Validates unsafe API requests before they reach controllers. */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!requiresOriginValidation(request) || isAllowedOrigin(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        ApiError error = new ApiError(
                HttpStatus.FORBIDDEN.value(),
                "INVALID_ORIGIN",
                "Request origin is not allowed",
                null,
                Instant.now(),
                request.getRequestURI()
        );
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), error);
    }

    /** Returns whether a request method and path can mutate API state. */
    private boolean requiresOriginValidation(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/") && !SAFE_METHODS.contains(request.getMethod());
    }

    /** Allows configured frontend origins and same-origin requests. */
    private boolean isAllowedOrigin(HttpServletRequest request) {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (!StringUtils.hasText(origin)) {
            return true;
        }
        if (allowedOrigins.contains(origin)) {
            return true;
        }
        String sameOrigin = request.getScheme() + "://" + request.getServerName() + serverPortSuffix(request);
        return origin.equals(sameOrigin) || originMatchesForwardedHost(origin, request);
    }

    /** Builds an origin port suffix only when the port is not the scheme default. */
    private String serverPortSuffix(HttpServletRequest request) {
        int port = request.getServerPort();
        boolean defaultHttp = "http".equals(request.getScheme()) && port == 80;
        boolean defaultHttps = "https".equals(request.getScheme()) && port == 443;
        return defaultHttp || defaultHttps ? "" : ":" + port;
    }

    /** Accepts same-origin requests when the app runs behind a forwarding proxy. */
    private boolean originMatchesForwardedHost(String origin, HttpServletRequest request) {
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (!StringUtils.hasText(forwardedProto) || !StringUtils.hasText(forwardedHost)) {
            return false;
        }
        URI forwardedOrigin = URI.create(forwardedProto + "://" + forwardedHost);
        return origin.equals(forwardedOrigin.toString());
    }
}
