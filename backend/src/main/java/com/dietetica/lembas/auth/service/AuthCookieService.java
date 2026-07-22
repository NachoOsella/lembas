package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.shared.config.SecurityPolicyProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * Writes and clears authentication cookies used by the stateless JWT API.
 *
 * <p>Tokens are kept in HttpOnly cookies so browser JavaScript cannot read
 * them. The access cookie is available to all API endpoints, while the refresh
 * cookie is scoped to the refresh endpoint to reduce accidental exposure.</p>
 */
@Service
public class AuthCookieService {

    public static final String ACCESS_COOKIE_NAME = "lembas_access_token";
    public static final String REFRESH_COOKIE_NAME = "lembas_refresh_token";

    private static final String API_PATH = "/api";
    private static final String REFRESH_PATH = "/api/auth/refresh";
    private static final String SAME_SITE_POLICY = "Strict";

    private final JwtProperties jwtProperties;
    private final boolean forceSecureCookies;

    /** Keeps direct callers on the local-development cookie behavior. */
    public AuthCookieService(JwtProperties jwtProperties) {
        this(jwtProperties, new SecurityPolicyProperties(List.of(), false));
    }

    @Autowired
    public AuthCookieService(JwtProperties jwtProperties, SecurityPolicyProperties securityPolicyProperties) {
        this.jwtProperties = jwtProperties;
        this.forceSecureCookies = securityPolicyProperties.forceSecureCookies();
    }

    /** Adds fresh access and refresh cookies for a successful auth response. */
    public void writeAuthCookies(AuthResponse authResponse, HttpServletRequest request, HttpServletResponse response) {
        if (authResponse.token() != null) {
            response.addHeader(
                    "Set-Cookie",
                    buildCookie(
                                    ACCESS_COOKIE_NAME,
                                    authResponse.token(),
                                    API_PATH,
                                    jwtProperties.jwtExpiration(),
                                    request)
                            .toString());
        }
        if (authResponse.refreshToken() != null) {
            response.addHeader(
                    "Set-Cookie",
                    buildCookie(
                                    REFRESH_COOKIE_NAME,
                                    authResponse.refreshToken(),
                                    REFRESH_PATH,
                                    JwtTokenProvider.REFRESH_EXPIRATION,
                                    request)
                            .toString());
        }
    }

    /** Clears both auth cookies during logout or invalid-session handling. */
    public void clearAuthCookies(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(
                "Set-Cookie",
                buildCookie(ACCESS_COOKIE_NAME, "", API_PATH, Duration.ZERO, request)
                        .toString());
        response.addHeader(
                "Set-Cookie",
                buildCookie(REFRESH_COOKIE_NAME, "", REFRESH_PATH, Duration.ZERO, request)
                        .toString());
    }

    /** Returns an auth response without token fields for JSON serialization. */
    public AuthResponse withoutBodyTokens(AuthResponse authResponse) {
        return new AuthResponse(null, null, authResponse.user());
    }

    /** Builds a secure-by-context HttpOnly cookie with a strict same-site policy. */
    private ResponseCookie buildCookie(
            String name, String value, String path, Duration maxAge, HttpServletRequest request) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(forceSecureCookies || request.isSecure())
                .sameSite(SAME_SITE_POLICY)
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
