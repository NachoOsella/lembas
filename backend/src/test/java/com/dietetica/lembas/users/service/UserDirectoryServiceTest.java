package com.dietetica.lembas.users.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Unit tests for the authentication-facing users contract implementation. */
@ExtendWith(MockitoExtension.class)
class UserDirectoryServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserDirectoryService userDirectory;

    @Test
    void shouldDelegateEmailExistenceCheckToUsersPersistence() {
        when(userRepository.existsByEmail("frodo@lembas.com")).thenReturn(true);

        assertThat(userDirectory.existsByEmail("frodo@lembas.com")).isTrue();

        verify(userRepository).existsByEmail("frodo@lembas.com");
    }

    @Test
    void shouldRegisterCustomerThroughUsersPersistence() {
        User user = new User(
                null,
                "frodo@lembas.com",
                "hash",
                "Frodo",
                "Baggins",
                null,
                com.dietetica.lembas.users.model.Role.CUSTOMER);
        when(userRepository.save(user)).thenReturn(user);

        assertThat(userDirectory.registerCustomer(user)).isSameAs(user);

        verify(userRepository).save(user);
    }

    @Test
    void shouldExposeAuthenticationLookupsWithoutExposingRepository() {
        User user = new User(
                null,
                "frodo@lembas.com",
                "hash",
                "Frodo",
                "Baggins",
                null,
                com.dietetica.lembas.users.model.Role.CUSTOMER);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThat(userDirectory.findByEmail(user.getEmail())).containsSame(user);
        assertThat(userDirectory.findById(1L)).containsSame(user);

        verify(userRepository).findByEmail(user.getEmail());
        verify(userRepository).findById(1L);
    }
}
