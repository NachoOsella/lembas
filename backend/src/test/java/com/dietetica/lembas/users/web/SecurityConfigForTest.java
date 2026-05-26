package com.dietetica.lembas.users.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Minimal security configuration for controller authorization tests.
 *
 * <p>Activates {@link EnableMethodSecurity} so that {@code @PreAuthorize}
 * annotations on the controller are evaluated during {@code @WebMvcTest}
 * slices. No filter chain, JWT filter, or other beans are required — the
 * test relies on {@code @WithMockUser} to provide the security context and
 * {@code @AutoConfigureMockMvc(addFilters = false)} to disable the HTTP
 * filter chain.</p>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfigForTest {
}
