package com.dietetica.lembas.auth.integration;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.auth.dto.AuthResponse;
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
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-flow integration tests for customer registration.
 *
 * <p>Uses {@link SpringBootTest} with a real PostgreSQL instance (Testcontainers)
 * to verify the complete {@link AuthService#registerCustomer} flow: Bean
 * Validation, email uniqueness, password encoding, and JWT token generation.</p>
 *
 * <p>Naming convention: {@code Should_expected_when_condition}.</p>
 */
class AuthRegistrationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanDatabase() {
        userRepository.deleteAllInBatch();
    }

    @Nested
    class RegisterCustomer {

        @Test
        void Should_persistUser_when_registerCustomerWithValidData() {
            RegisterRequest request = new RegisterRequest(
                    "Frodo", "Baggins",
                    "frodo@lembas.com",
                    "Str0ng!Pass",
                    "+54 351 123 4567"
            );

            AuthResponse response = authService.registerCustomer(request);

            // Verify response contains tokens and user DTO
            assertThat(response.token()).isNotBlank();
            assertThat(response.refreshToken()).isNotBlank();
            assertThat(response.user()).isNotNull();
            assertThat(response.user().email()).isEqualTo("frodo@lembas.com");
            assertThat(response.user().role()).isEqualTo(Role.CUSTOMER);

            // Verify user was actually persisted in the database
            Optional<User> persisted = userRepository.findByEmail("frodo@lembas.com");
            assertThat(persisted).isPresent();
            assertThat(persisted.get().getFirstName()).isEqualTo("Frodo");
            assertThat(persisted.get().getLastName()).isEqualTo("Baggins");
            assertThat(persisted.get().getPhone()).isEqualTo("+54 351 123 4567");
            assertThat(persisted.get().getRole()).isEqualTo(Role.CUSTOMER);
            assertThat(persisted.get().isEnabled()).isTrue();
            assertThat(persisted.get().getBranchId()).isNull();
        }

        @Test
        void Should_storeEncodedPassword_when_registerCustomer() {
            RegisterRequest request = new RegisterRequest(
                    "Samwise", "Gamgee",
                    "sam@lembas.com",
                    "Str0ng!Pass",
                    null
            );

            authService.registerCustomer(request);

            Optional<User> persisted = userRepository.findByEmail("sam@lembas.com");
            assertThat(persisted).isPresent();
            // The stored hash must not be the raw password
            assertThat(persisted.get().getPasswordHash())
                    .isNotBlank()
                    .isNotEqualTo("Str0ng!Pass")
                    .startsWith("$2a"); // BCrypt hash prefix
        }

        @Test
        void Should_throwEmailDuplicated_when_registerCustomerWithExistingEmail() {
            RegisterRequest request = new RegisterRequest(
                    "Merry", "Brandybuck",
                    "merry@lembas.com",
                    "Str0ng!Pass",
                    null
            );

            // First registration succeeds
            authService.registerCustomer(request);

            // Second registration with same email must fail
            RegisterRequest duplicateRequest = new RegisterRequest(
                    "Merry", "Adelardo",
                    "merry@lembas.com",
                    "OtherPass1",
                    null
            );

            assertThatThrownBy(() -> authService.registerCustomer(duplicateRequest))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException domainEx = (DomainException) ex;
                        assertThat(domainEx.getCode()).isEqualTo("EMAIL_DUPLICATED");
                        assertThat(domainEx.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    });
        }

        @Test
        void Should_notCreateDuplicatedUser_when_emailAlreadyExists() {
            RegisterRequest first = new RegisterRequest(
                    "Pippin", "Took",
                    "pippin@lembas.com",
                    "Str0ng!Pass",
                    null
            );
            authService.registerCustomer(first);

            RegisterRequest second = new RegisterRequest(
                    "Peregrin", "Took",
                    "pippin@lembas.com",
                    "OtherPass1",
                    null
            );
            assertThatThrownBy(() -> authService.registerCustomer(second))
                    .isInstanceOf(DomainException.class);

            // Only one user with that email must exist
            long count = userRepository.findByEmail("pippin@lembas.com").stream().count();
            assertThat(count).isOne();
        }

        @Test
        void Should_normalizeEmail_when_registerCustomerWithTrailingSpaces() {
            RegisterRequest request = new RegisterRequest(
                    "Bilbo", "Baggins",
                    "  BILBO@LEMBAS.COM  ",
                    "Str0ng!Pass",
                    null
            );

            authService.registerCustomer(request);

            // Email must be stored trimmed and lowered
            Optional<User> stored = userRepository.findByEmail("bilbo@lembas.com");
            assertThat(stored).isPresent();
            assertThat(stored.get().getEmail()).isEqualTo("bilbo@lembas.com");
        }

        @Test
        void Should_registerCustomer_when_phoneIsNull() {
            RegisterRequest request = new RegisterRequest(
                    "Gandalf", "Grey",
                    "gandalf@lembas.com",
                    "Str0ng!Pass",
                    null
            );

            AuthResponse response = authService.registerCustomer(request);

            assertThat(response.user().email()).isEqualTo("gandalf@lembas.com");
            Optional<User> persisted = userRepository.findByEmail("gandalf@lembas.com");
            assertThat(persisted).isPresent();
            assertThat(persisted.get().getPhone()).isNull();
        }

        @Test
        void Should_persistEmailUniqueConstraint_when_twoDifferentUsersRegister() {
            RegisterRequest first = new RegisterRequest(
                    "User1", "Test",
                    "user1@lembas.com",
                    "Str0ng!Pass1",
                    null
            );
            RegisterRequest second = new RegisterRequest(
                    "User2", "Test",
                    "user2@lembas.com",
                    "Str0ng!Pass2",
                    null
            );

            authService.registerCustomer(first);
            authService.registerCustomer(second);

            assertThat(userRepository.findByEmail("user1@lembas.com")).isPresent();
            assertThat(userRepository.findByEmail("user2@lembas.com")).isPresent();
        }
    }
}
