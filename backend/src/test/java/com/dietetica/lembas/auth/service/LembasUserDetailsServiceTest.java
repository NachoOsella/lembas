package com.dietetica.lembas.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.users.api.UserDirectory;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * Unit tests for {@link LembasUserDetailsService}.
 *
 * <p>Covers: loading by email and by ID, email normalization,
 * and error handling for missing users.</p>
 */
@ExtendWith(MockitoExtension.class)
class LembasUserDetailsServiceTest {

    @Mock
    private UserDirectory userDirectory;

    @InjectMocks
    private LembasUserDetailsService userDetailsService;

    private static final Long USER_ID = 1L;
    private static final String EMAIL = "frodo@lembas.com";

    private User createUser() {
        return new User(
                USER_ID,
                null,
                EMAIL,
                "$2a$10$encoded",
                "Frodo",
                "Baggins",
                "+54 351 123 4567",
                Role.CUSTOMER,
                true,
                null,
                null);
    }

    // -------------------------------------------------------------------------
    // loadUserByUsername (by email)
    // -------------------------------------------------------------------------

    @Test
    void Should_returnUserDetails_when_userExistsByEmail() {
        User user = createUser();
        when(userDirectory.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername(EMAIL);

        assertThat(result).isInstanceOf(LembasUserDetails.class);
        assertThat(result.getUsername()).isEqualTo(EMAIL);
        assertThat(result.getAuthorities()).extracting("authority").containsExactly("ROLE_CUSTOMER");
        assertThat(result.isEnabled()).isTrue();
    }

    @Test
    void Should_throwUsernameNotFoundException_when_emailNotFound() {
        when(userDirectory.findByEmail("unknown@lembas.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown@lembas.com"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("unknown@lembas.com");
    }

    @Test
    void Should_normalizeEmailToLowercase_when_loadingByUsername() {
        User user = createUser();
        when(userDirectory.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        // The service calls email.trim().toLowerCase(Locale.ROOT) before querying
        userDetailsService.loadUserByUsername("  FRODO@LEMBAS.COM  ");

        // Verify the repository was called with the normalized form
        org.mockito.Mockito.verify(userDirectory).findByEmail(EMAIL);
    }

    // -------------------------------------------------------------------------
    // loadUserById
    // -------------------------------------------------------------------------

    @Test
    void Should_returnUserDetails_when_userExistsById() {
        User user = createUser();
        when(userDirectory.findById(USER_ID)).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserById(USER_ID);

        assertThat(result).isInstanceOf(LembasUserDetails.class);
        assertThat(result.getUsername()).isEqualTo(EMAIL);
        assertThat(result.getAuthorities()).extracting("authority").containsExactly("ROLE_CUSTOMER");
    }

    @Test
    void Should_throwUsernameNotFoundException_when_idNotFound() {
        when(userDirectory.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserById(999L))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("999");
    }

    // -------------------------------------------------------------------------
    // Integration of LembasUserDetails wrapper
    // -------------------------------------------------------------------------

    @Test
    void Should_wrapUserInLembasUserDetails_when_loadingByEmail() {
        User user = createUser();
        when(userDirectory.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        LembasUserDetails details = (LembasUserDetails) userDetailsService.loadUserByUsername(EMAIL);

        assertThat(details.getUser()).isSameAs(user);
        assertThat(details.getUser().getFirstName()).isEqualTo("Frodo");
        assertThat(details.getUser().getRole()).isEqualTo(Role.CUSTOMER);
    }

    @Test
    void Should_wrapUserInLembasUserDetails_when_loadingById() {
        User user = createUser();
        when(userDirectory.findById(USER_ID)).thenReturn(Optional.of(user));

        LembasUserDetails details = (LembasUserDetails) userDetailsService.loadUserById(USER_ID);

        assertThat(details.getUser()).isSameAs(user);
        assertThat(details.getUser().getEmail()).isEqualTo(EMAIL);
    }
}
