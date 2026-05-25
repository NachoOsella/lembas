package com.dietetica.lembas.auth.web;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.service.AuthService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
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
    private final SecurityContextHelper securityContextHelper;

    public AuthController(AuthService authService, SecurityContextHelper securityContextHelper) {
        this.authService = authService;
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
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.registerCustomer(request);
    }

    /**
     * Authenticates a user with email and password, returning JWT tokens.
     *
     * @param request credentials payload (email, password)
     * @return authentication response with access and refresh tokens
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.authenticate(request);
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
    public AuthResponse me() {
        return authService.getCurrentUser(securityContextHelper.getCurrentUser());
    }
}
