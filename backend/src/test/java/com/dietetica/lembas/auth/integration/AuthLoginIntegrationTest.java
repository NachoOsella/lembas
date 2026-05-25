package com.dietetica.lembas.auth.integration;

import com.dietetica.lembas.LembasBackendApplication;
import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.service.AuthService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-flow integration tests for the JWT login endpoint.
 *
 * <p>Tests the complete {@link AuthService#authenticate} flow against a
 * real PostgreSQL instance, verifying email normalization, BCrypt
 * password comparison, account-disabled checks, and security hardening
 * against credential enumeration.</p>
 *
 * <p>Naming convention: {@code Should_expected_when_condition}.</p>
 */
@SpringBootTest(classes = LembasBackendApplication.class)
@Testcontainers
@ActiveProfiles("test")
class AuthLoginIntegrationTest {

    @Container
    @ServiceConnection
    @SuppressWarnings("rawtypes")
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String RAW_PASSWORD = "Str0ng!Pass";

    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAllInBatch();
    }

    @Nested
    class Authenticate {

        @Test
        void Should_returnTokensAndUser_when_credentialsAreValid() {
            // Register a user first so we have a known user in the database
            authService.registerCustomer(new RegisterRequest(
                    "Frodo", "Baggins",
                    "frodo@lembas.com",
                    RAW_PASSWORD,
                    null
            ));

            LoginRequest login = new LoginRequest("frodo@lembas.com", RAW_PASSWORD);
            AuthResponse response = authService.authenticate(login);

            assertThat(response.token()).isNotBlank();
            assertThat(response.refreshToken()).isNotBlank();
            assertThat(response.user()).isNotNull();
            assertThat(response.user().email()).isEqualTo("frodo@lembas.com");
            assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);
        }

        @Test
        void Should_returnDifferentTokensPerLogin() {
            authService.registerCustomer(new RegisterRequest(
                    "Samwise", "Gamgee",
                    "sam@lembas.com",
                    RAW_PASSWORD,
                    null
            ));

            AuthResponse first = authService.authenticate(
                    new LoginRequest("sam@lembas.com", RAW_PASSWORD));
            AuthResponse second = authService.authenticate(
                    new LoginRequest("sam@lembas.com", RAW_PASSWORD));

            // Each login must issue a fresh token
            assertThat(first.token()).isNotEqualTo(second.token());
            assertThat(first.user().id()).isEqualTo(second.user().id());
        }

        @Test
        void Should_throwInvalidCredentials_when_passwordIsWrong() {
            authService.registerCustomer(new RegisterRequest(
                    "Pippin", "Took",
                    "pippin@lembas.com",
                    RAW_PASSWORD,
                    null
            ));

            assertThatThrownBy(() -> authService.authenticate(
                    new LoginRequest("pippin@lembas.com", "WrongPassword1")))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException de = (DomainException) ex;
                        assertThat(de.getCode()).isEqualTo("INVALID_CREDENTIALS");
                        assertThat(de.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                        // Generic message that doesn't reveal cause
                        assertThat(de.getMessage()).isEqualTo("Invalid email or password");
                    });
        }

        @Test
        void Should_throwInvalidCredentials_when_emailNotFound() {
            assertThatThrownBy(() -> authService.authenticate(
                    new LoginRequest("nonexistent@lembas.com", RAW_PASSWORD)))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException de = (DomainException) ex;
                        assertThat(de.getCode()).isEqualTo("INVALID_CREDENTIALS");
                        assertThat(de.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    });
        }

        @Test
        void Should_throwAccountDisabled_when_userIsDisabled() {
            // Register a user, then manually disable it
            authService.registerCustomer(new RegisterRequest(
                    "Merry", "Brandybuck",
                    "merry@lembas.com",
                    RAW_PASSWORD,
                    null
            ));

            User user = userRepository.findByEmail("merry@lembas.com").orElseThrow();
            user.setEnabled(false);
            userRepository.saveAndFlush(user);

            assertThatThrownBy(() -> authService.authenticate(
                    new LoginRequest("merry@lembas.com", RAW_PASSWORD)))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException de = (DomainException) ex;
                        assertThat(de.getCode()).isEqualTo("ACCOUNT_DISABLED");
                        assertThat(de.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    });
        }

        @Test
        void Should_normalizeEmail_when_loginWithUppercase() {
            authService.registerCustomer(new RegisterRequest(
                    "Bilbo", "Baggins",
                    "bilbo@lembas.com",
                    RAW_PASSWORD,
                    null
            ));

            AuthResponse response = authService.authenticate(
                    new LoginRequest("  BILBO@LEMBAS.COM  ", RAW_PASSWORD));

            assertThat(response.user().email()).isEqualTo("bilbo@lembas.com");
        }

        @Test
        void Should_storeEncodedPassword_when_userRegisteredForLogin() {
            authService.registerCustomer(new RegisterRequest(
                    "Gandalf", "Grey",
                    "gandalf@lembas.com",
                    "P4ssword!99",
                    null
            ));

            User stored = userRepository.findByEmail("gandalf@lembas.com").orElseThrow();
            assertThat(stored.getPasswordHash())
                    .isNotEqualTo("P4ssword!99")
                    .startsWith("$2a$");

            // Login must work with BCrypt comparison
            AuthResponse response = authService.authenticate(
                    new LoginRequest("gandalf@lembas.com", "P4ssword!99"));
            assertThat(response.token()).isNotBlank();
        }

        @Test
        void Should_notAuthenticate_when_rawPasswordStored() {
            // Directly persist a user without encoding (simulating a bad data scenario)
            // This should fail because BCrypt won't match against a raw password
            User rawUser = new User(null, "bad@lembas.com", "plaintext",
                    "Bad", "User", null, Role.CUSTOMER);
            userRepository.saveAndFlush(rawUser);

            assertThatThrownBy(() -> authService.authenticate(
                    new LoginRequest("bad@lembas.com", "plaintext")))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException de = (DomainException) ex;
                        assertThat(de.getCode()).isEqualTo("INVALID_CREDENTIALS");
                    });
        }
    }
}
