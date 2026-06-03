package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link SecurityContextHelper}.
 *
 * <p>Uses the real {@link SecurityContextHolder} with a mock
 * {@link Authentication} to verify principal extraction and
 * error handling.</p>
 */
class SecurityContextHelperTest {

    private final SecurityContextHelper helper = new SecurityContextHelper();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void Should_returnCurrentUser_when_authenticationContainsLembasUserDetails() {
        User user = new User(1L, null, "frodo@lembas.com", "hash", "Frodo",
                "Baggins", null, Role.CUSTOMER, true, null, null);
        LembasUserDetails principal = new LembasUserDetails(user);
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(principal);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User result = helper.getCurrentUser();

        assertThat(result).isEqualTo(user);
        assertThat(result.getEmail()).isEqualTo("frodo@lembas.com");
        assertThat(result.getFirstName()).isEqualTo("Frodo");
    }

    @Test
    void Should_throwIllegalStateException_when_noAuthenticationExists() {
        SecurityContextHolder.clearContext();

        assertThatThrownBy(() -> helper.getCurrentUser())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void Should_throwIllegalStateException_when_authenticationIsNotAuthenticated() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(false);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        assertThatThrownBy(() -> helper.getCurrentUser())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void Should_throwIllegalStateException_when_principalIsUnexpectedType() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("unexpected-string-principal");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        assertThatThrownBy(() -> helper.getCurrentUser())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unexpected principal type");
    }

    @Test
    void Should_throwIllegalStateException_when_principalIsAnUnsupportedType() {
        // Spring Security sets a String principal (e.g. "anonymousUser") when no
        // user is authenticated but the request still reaches a secured endpoint.
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("anonymousUser");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        assertThatThrownBy(() -> helper.getCurrentUser())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unexpected principal type")
                .hasMessageContaining("String");
    }
}
