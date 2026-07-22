package com.dietetica.lembas.shared.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dietetica.lembas.auth.service.AuthCookieService;
import com.dietetica.lembas.auth.service.AuthService;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.auth.web.AuthController;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Security filter-chain tests for authentication route authorization rules.
 */
@WebMvcTest(
        controllers = {AuthController.class, GlobalExceptionHandler.class},
        properties = "app.security.allowed-origins=http://localhost:4200,http://localhost:8080")
@Import({SecurityConfig.class, com.dietetica.lembas.auth.service.JwtAuthenticationFilter.class})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AuthCookieService authCookieService;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private LembasUserDetailsService userDetailsService;

    /**
     * Verifies the documented /api/auth/me endpoint requires a bearer token.
     */
    @Test
    void Should_returnUnauthorized_when_meEndpointHasNoToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    /**
     * Verifies public auth endpoints remain reachable without credentials.
     */
    @Test
    @WithMockUser(roles = "CUSTOMER")
    void Should_forbidCustomerAccess_when_callingAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/admin/unknown")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_forbidEmployeeAccess_when_callingCustomerEndpoint() throws Exception {
        mockMvc.perform(get("/api/customer/unknown")).andExpect(status().isForbidden());
    }

    @Test
    void Should_allowAnonymousAccess_when_callingPublicAuthEndpoints() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void Should_rejectTraceRequests() throws Exception {
        mockMvc.perform(request(HttpMethod.TRACE, "/api/auth/login")).andExpect(status().isBadRequest());
    }

    @Test
    void Should_setExactSecurityHeaders() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(header().string(
                                "Content-Security-Policy",
                                "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string("Permissions-Policy", "geolocation=(), camera=(), microphone=()"));
    }

    @Test
    void Should_allowConfiguredAndSameOriginWrites_butRejectUntrustedOrForwardedOrigins() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .header("Origin", "http://localhost:4200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/login")
                        .header("Origin", "http://localhost")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/login")
                        .header("Origin", "https://untrusted.example")
                        .header("X-Forwarded-Proto", "https")
                        .header("X-Forwarded-Host", "untrusted.example")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
