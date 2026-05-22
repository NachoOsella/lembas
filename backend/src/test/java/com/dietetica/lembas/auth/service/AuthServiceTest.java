package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService} registration business rules.
 *
 * <p>Covers: happy path, password hashing, duplicate email rejection,
 * email normalization, and side-effect guarantees on failure.</p>
 *
 * <p>Naming convention: {@code Should_expected_when_condition}.</p>
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

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, new AuthMapper(), jwtTokenProvider, passwordEncoder);
    }

    @Nested
    class RegisterCustomer {

        private static final String RAW_PASSWORD = "Str0ng!Pass";
        private static final String ENCODED_PASSWORD = "$2a$10$encoded";
        private static final String ACCESS_TOKEN = "access-token";
        private static final String REFRESH_TOKEN = "refresh-token";

        private final RegisterRequest validRequest = new RegisterRequest(
                "Frodo",
                "Baggins",
                "frodo@lembas.com",
                RAW_PASSWORD,
                "+54 351 123 4567"
        );

        private void stubSuccess() {
            when(userRepository.existsByEmail("frodo@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(1L, null, "frodo@lembas.com", ENCODED_PASSWORD, "Frodo", "Baggins",
                    "+54 351 123 4567", Role.CUSTOMER, true, null, null);
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtTokenProvider.createAccessToken(savedUser)).thenReturn(ACCESS_TOKEN);
            when(jwtTokenProvider.createRefreshToken(savedUser)).thenReturn(REFRESH_TOKEN);
        }

        @Test
        void Should_returnTokensAndUser_when_registerCustomerWithValidData() {
            stubSuccess();

            AuthResponse response = authService.registerCustomer(validRequest);

            assertThat(response.token()).isEqualTo(ACCESS_TOKEN);
            assertThat(response.refreshToken()).isEqualTo(REFRESH_TOKEN);
            assertThat(response.user()).isNotNull();
            assertThat(response.user().id()).isEqualTo(1L);
            assertThat(response.user().email()).isEqualTo("frodo@lembas.com");
            assertThat(response.user().firstName()).isEqualTo("Frodo");
            assertThat(response.user().lastName()).isEqualTo("Baggins");
            assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
            assertThat(response.user().branchId()).isNull();
        }

        @Test
        void Should_encodePassword_when_registerCustomer() {
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(1L, null, "frodo@lembas.com", ENCODED_PASSWORD, "Frodo", "Baggins",
                    "+54 351 123 4567", Role.CUSTOMER, true, null, null);
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtTokenProvider.createAccessToken(any(User.class))).thenReturn(ACCESS_TOKEN);
            when(jwtTokenProvider.createRefreshToken(any(User.class))).thenReturn(REFRESH_TOKEN);

            authService.registerCustomer(validRequest);

            verify(passwordEncoder).encode(RAW_PASSWORD);
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getPasswordHash()).isEqualTo(ENCODED_PASSWORD);
        }

        @Test
        void Should_throwEmailDuplicated_when_registerCustomerWithExistingEmail() {
            when(userRepository.existsByEmail("frodo@lembas.com")).thenReturn(true);

            assertThatThrownBy(() -> authService.registerCustomer(validRequest))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "EMAIL_DUPLICATED")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.CONFLICT)
                    .hasMessage("An account with this email address already exists");
        }

        @Test
        void Should_notPerformSideEffects_when_registerCustomerWithDuplicateEmail() {
            when(userRepository.existsByEmail("frodo@lembas.com")).thenReturn(true);

            assertThatThrownBy(() -> authService.registerCustomer(validRequest))
                    .isInstanceOf(DomainException.class);

            verify(passwordEncoder, never()).encode(anyString());
            verify(userRepository, never()).save(any());
            verify(jwtTokenProvider, never()).createAccessToken(any());
            verify(jwtTokenProvider, never()).createRefreshToken(any());
        }

        @Test
        void Should_normalizeEmail_when_registerCustomerWithTrailingSpaces() {
            RegisterRequest request = new RegisterRequest(
                    "Frodo", "Baggins",
                    "  FRODO@LEMBAS.COM  ",
                    RAW_PASSWORD, null
            );
            when(userRepository.existsByEmail("frodo@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(1L, null, "frodo@lembas.com", ENCODED_PASSWORD, "Frodo", "Baggins",
                    null, Role.CUSTOMER, true, null, null);
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtTokenProvider.createAccessToken(savedUser)).thenReturn(ACCESS_TOKEN);
            when(jwtTokenProvider.createRefreshToken(savedUser)).thenReturn(REFRESH_TOKEN);

            authService.registerCustomer(request);

            verify(userRepository).existsByEmail("frodo@lembas.com");
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo("frodo@lembas.com");
        }

        @Test
        void Should_registerCustomer_when_phoneIsNull() {
            RegisterRequest request = new RegisterRequest(
                    "Samwise", "Gamgee",
                    "sam@lembas.com",
                    RAW_PASSWORD, null
            );
            when(userRepository.existsByEmail("sam@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(2L, null, "sam@lembas.com", ENCODED_PASSWORD, "Samwise", "Gamgee",
                    null, Role.CUSTOMER, true, null, null);
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtTokenProvider.createAccessToken(savedUser)).thenReturn(ACCESS_TOKEN);
            when(jwtTokenProvider.createRefreshToken(savedUser)).thenReturn(REFRESH_TOKEN);

            AuthResponse response = authService.registerCustomer(request);

            assertThat(response.user().id()).isEqualTo(2L);
            assertThat(response.user().branchId()).isNull();
            assertThat(response.user().branchName()).isNull();
        }

        @Test
        void Should_assignCustomerRole_when_registerCustomer() {
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(1L, null, "frodo@lembas.com", ENCODED_PASSWORD, "Frodo", "Baggins",
                    null, Role.CUSTOMER, true, null, null);
            when(userRepository.save(any(User.class))).thenReturn(savedUser);
            when(jwtTokenProvider.createAccessToken(any(User.class))).thenReturn(ACCESS_TOKEN);
            when(jwtTokenProvider.createRefreshToken(any(User.class))).thenReturn(REFRESH_TOKEN);

            authService.registerCustomer(validRequest);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getRole()).isEqualTo(Role.CUSTOMER);
            assertThat(captor.getValue().getBranchId()).isNull();
        }
    }
}
