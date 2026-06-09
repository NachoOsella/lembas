package com.dietetica.lembas.auth.web;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RefreshTokenRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.service.AuthCookieService;
import com.dietetica.lembas.auth.service.AuthService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for public authentication endpoints.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final SecurityContextHelper securityContextHelper;

    public AuthController(AuthService authService, AuthCookieService authCookieService, SecurityContextHelper securityContextHelper) {
        this.authService = authService;
        this.authCookieService = authCookieService;
        this.securityContextHelper = securityContextHelper;
    }

    /**
     * Registers a new customer account and returns authentication tokens.
     *
     * @param request validated registration payload
     * @return authentication response with access and refresh tokens
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request,
                                 HttpServletRequest httpRequest,
                                 HttpServletResponse httpResponse) {
        AuthResponse authResponse = authService.registerCustomer(request);
        authCookieService.writeAuthCookies(authResponse, httpRequest, httpResponse);
        return authCookieService.withoutBodyTokens(authResponse);
    }

    /**
     * Authenticates a user with email and password, returning JWT tokens.
     *
     * @param request credentials payload (email, password)
     * @return authentication response with access and refresh tokens
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest httpRequest,
                              HttpServletResponse httpResponse) {
        AuthResponse authResponse = authService.authenticate(request);
        authCookieService.writeAuthCookies(authResponse, httpRequest, httpResponse);
        return authCookieService.withoutBodyTokens(authResponse);
    }

    /**
     * Exchanges a valid refresh token for a new rotated token pair.
     *
     * @param request refresh-token payload
     * @return authentication response with fresh access and refresh tokens
     */
    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody(required = false) @Valid RefreshTokenRequest request,
                                HttpServletRequest httpRequest,
                                HttpServletResponse httpResponse) {
        String refreshToken = request != null ? request.refreshToken() : readCookie(httpRequest, AuthCookieService.REFRESH_COOKIE_NAME);
        AuthResponse authResponse = authService.refresh(refreshToken);
        authCookieService.writeAuthCookies(authResponse, httpRequest, httpResponse);
        return authCookieService.withoutBodyTokens(authResponse);
    }

    /**
     * Clears authentication cookies in the browser.
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        authService.logout(readCookie(httpRequest, AuthCookieService.REFRESH_COOKIE_NAME));
        authCookieService.clearAuthCookies(httpRequest, httpResponse);
    }

    /**
     * Returns the profile of the currently authenticated user.
     *
     * <p>Requires a valid JWT bearer token in the Authorization header.
     * The response does not include token fields (null).</p>
     *
     * @return the authenticated user's profile
     */
    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public AuthResponse me() {
        return authService.getCurrentUser(securityContextHelper.getCurrentUser());
    }

    /** Reads a named cookie from the request, returning null when it is missing. */
    private String readCookie(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
