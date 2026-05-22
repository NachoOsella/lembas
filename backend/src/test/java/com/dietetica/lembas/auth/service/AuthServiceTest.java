package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for customer registration business rules.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;

    /**
     * Creates the service under test with mocked infrastructure collaborators.
     */
    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, new AuthMapper(), jwtTokenProvider, passwordEncoder);
    }

    /**
     * Verifies that a new customer is persisted with a hashed password and receives tokens.
     */
    @Test
    void registerCustomerCreatesCustomerAndReturnsTokens() {
        RegisterRequest request = new RegisterRequest(
                "Samwise",
                "Gamgee",
                "SAM@LEMBAS.COM",
                "password123",
                null
        );
        User savedUser = new User(42L, null, "sam@lembas.com", "encoded-password", "Samwise", "Gamgee",
                null, Role.CUSTOMER, true, null, null);

        when(userRepository.existsByEmail("sam@lembas.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.createAccessToken(savedUser)).thenReturn("access-token");
        when(jwtTokenProvider.createRefreshToken(savedUser)).thenReturn("refresh-token");

        AuthResponse response = authService.registerCustomer(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User persistedUser = userCaptor.getValue();
        assertThat(persistedUser.getEmail()).isEqualTo("sam@lembas.com");
        assertThat(persistedUser.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(persistedUser.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(persistedUser.getBranchId()).isNull();

        assertThat(response.token()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.user().id()).isEqualTo(42L);
        assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
    }

    /**
     * Verifies that duplicate emails are rejected before password hashing or persistence.
     */
    @Test
    void registerCustomerRejectsDuplicatedEmail() {
        RegisterRequest request = new RegisterRequest(
                "Samwise",
                "Gamgee",
                " SAM@LEMBAS.COM ",
                "password123",
                null
        );
        when(userRepository.existsByEmail("sam@lembas.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.registerCustomer(request))
                .isInstanceOf(DomainException.class)
                .satisfies(exception -> {
                    DomainException domainException = (DomainException) exception;
                    assertThat(domainException.getCode()).isEqualTo("EMAIL_DUPLICATED");
                    assertThat(domainException.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                });

        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
        verify(jwtTokenProvider, never()).createAccessToken(any());
        verify(jwtTokenProvider, never()).createRefreshToken(any());
    }
}
