package com.dietetica.lembas.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.shared.config.SecurityPolicyProperties;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * Regression tests for auth-cookie browser security attributes.
 */
class AuthCookieServiceTest {

    private static final String JWT_SECRET = "0123456789abcdef0123456789abcdef";

    @Test
    void Should_forceSecureCookies_when_productionPolicyIsEnabled() {
        AuthCookieService cookieService = cookieService(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.writeAuthCookies(authResponse(), new MockHttpServletRequest("POST", "/api/auth/login"), response);

        assertThat(response.getHeaders("Set-Cookie")).allSatisfy(cookie -> {
            assertThat(cookie).contains("Secure");
            assertThat(cookie).contains("HttpOnly");
            assertThat(cookie).contains("SameSite=Strict");
        });
    }

    @Test
    void Should_keepHttpDevCookiesUsable_when_productionPolicyIsDisabled() {
        AuthCookieService cookieService = cookieService(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.writeAuthCookies(authResponse(), new MockHttpServletRequest("POST", "/api/auth/login"), response);

        assertThat(response.getHeaders("Set-Cookie")).allSatisfy(cookie -> {
            assertThat(cookie).doesNotContain("Secure");
            assertThat(cookie).contains("HttpOnly");
            assertThat(cookie).contains("SameSite=Strict");
        });
    }

    @Test
    void Should_secureDevelopmentCookies_whenRequestIsHttps() {
        AuthCookieService cookieService = cookieService(false);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setSecure(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.writeAuthCookies(authResponse(), request, response);

        assertThat(response.getHeaders("Set-Cookie"))
                .allSatisfy(cookie -> assertThat(cookie).contains("Secure"));
    }

    private AuthCookieService cookieService(boolean forceSecureCookies) {
        return new AuthCookieService(
                new JwtProperties(JWT_SECRET, Duration.ofHours(24)),
                new SecurityPolicyProperties(List.of("http://localhost:4200"), forceSecureCookies));
    }

    private AuthResponse authResponse() {
        return new AuthResponse("access-token", "refresh-token", null);
    }
}
