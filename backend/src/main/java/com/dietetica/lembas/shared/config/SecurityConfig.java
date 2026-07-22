package com.dietetica.lembas.shared.config;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.shared.dto.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Defines the initial stateless API security baseline.
 */
@Configuration
@EnableConfigurationProperties(SecurityPolicyProperties.class)
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OriginValidationFilter originValidationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            OriginValidationFilter originValidationFilter,
            ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.originValidationFilter = originValidationFilter;
        this.objectMapper = objectMapper;
    }

    /**
     * Configures public and protected route spaces according to the documented API layout.
     *
     * <p>The JWT filter runs before {@link UsernamePasswordAuthenticationFilter} so that
     * valid tokens populate the security context before any authorization decision.</p>
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
                // Same-origin deployment does not need credentialed CORS; origin validation protects cookie writes.
                .headers(headers -> headers.contentSecurityPolicy(policy -> policy.policyDirectives(
                                "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"))
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(policy -> policy.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .permissionsPolicyHeader(policy -> policy.policy("geolocation=(), camera=(), microphone=()")))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authenticationException) -> writeSecurityError(
                                response, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required", request))
                        .accessDeniedHandler((request, response, accessDeniedException) -> writeSecurityError(
                                response, HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access denied", request)))
                .authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.TRACE, "/**")
                        .denyAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me")
                        .authenticated()
                        .requestMatchers("/api/store/**", "/api/webhooks/**", "/uploads/**")
                        .permitAll()
                        .requestMatchers("/api/customer/**")
                        .hasRole("CUSTOMER")
                        // POS endpoints are restricted to internal staff (ADMIN/MANAGER/EMPLOYEE).
                        // CUSTOMER is explicitly excluded: the POS is in-store only.
                        .requestMatchers("/api/pos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        // Every admin endpoint requires an internal role. Individual controllers
                        // further restrict management operations with @PreAuthorize.
                        .requestMatchers("/api/admin/**")
                        .hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers("/actuator/health", "/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .addFilterBefore(originValidationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Provides the application-wide password encoder.
     * All passwords are hashed using BCrypt with strength 10.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Exposes the {@link AuthenticationManager} as a bean so that it can be used
     * in integration tests that simulate authenticated requests.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Writes a uniform {@link ApiError} payload for security-layer failures.
     */
    private void writeSecurityError(
            HttpServletResponse response, HttpStatus status, String code, String message, HttpServletRequest request)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }

        ApiError error = new ApiError(status.value(), code, message, null, Instant.now(), request.getRequestURI());

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), error);
    }
}
