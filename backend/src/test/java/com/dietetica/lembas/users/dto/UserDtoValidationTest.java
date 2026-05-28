package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bean Validation tests for user-management request DTOs.
 */
class UserDtoValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    // -------------------------------------------------------------------------
    // CreateInternalUserRequest
    // -------------------------------------------------------------------------

    @Test
    void validCreateInternalUserRequestHasNoViolations() {
        var request = new CreateInternalUserRequest(
                "admin@lembas.com",
                "password123",
                "Admin",
                "User",
                null,
                Role.ADMIN,
                null
        );

        Set<ConstraintViolation<CreateInternalUserRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    @Test
    void validCreateInternalUserRequestAcceptsAllInternalRoles() {
        internalRoles().forEach(role -> {
            var request = new CreateInternalUserRequest(
                    role.name().toLowerCase() + "@lembas.com",
                    "password123",
                    "Test",
                    role.name(),
                    null,
                    role,
                    role == Role.ADMIN ? null : 1L
            );

            assertThat(validator.validate(request)).isEmpty();
        });
    }

    @Test
    void invalidCreateInternalUserRequestRejectsCustomerRole() {
        var request = new CreateInternalUserRequest(
                "customer@lembas.com",
                "password123",
                "Customer",
                "User",
                null,
                Role.CUSTOMER,
                null
        );

        Set<ConstraintViolation<CreateInternalUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("role");
        assertThat(violations)
                .extracting(v -> v.getMessage())
                .anyMatch(msg -> msg.contains("ADMIN") || msg.contains("MANAGER") || msg.contains("EMPLOYEE"));
    }

    @Test
    void invalidCreateInternalUserRequestHasExpectedViolations() {
        var request = new CreateInternalUserRequest(
                "",
                "short",
                "",
                "",
                "not-a-phone!!",
                Role.ADMIN,
                null
        );

        Set<ConstraintViolation<CreateInternalUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("email", "password", "firstName", "lastName", "phone");
    }

    // -------------------------------------------------------------------------
    // UpdateUserRequest
    // -------------------------------------------------------------------------

    @Test
    void validUpdateUserRequestAcceptsAllOptionalFieldsAsNull() {
        var request = new UpdateUserRequest(null, null, null, null, null, null, null);

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    @Test
    void validUpdateUserRequestAcceptsValidValues() {
        var request = new UpdateUserRequest(
                "admin@lembas.com",
                "newpassword123",
                "Updated",
                "Name",
                "+54 351 123 4567",
                Role.MANAGER,
                1L
        );

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    @Test
    void invalidUpdateUserRequestRejectsCustomerRole() {
        var request = new UpdateUserRequest(null, null, null, null, null, Role.CUSTOMER, null);

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("role");
    }

    @Test
    void invalidUpdateUserRequestRejectsShortPassword() {
        var request = new UpdateUserRequest(
                null,
                "short",
                null,
                null,
                null,
                null,
                null
        );

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("password");
    }

    @Test
    void invalidUpdateUserRequestRejectsInvalidEmailAndPhone() {
        var request = new UpdateUserRequest(
                "not-an-email",
                null,
                null,
                null,
                "abc",
                null,
                null
        );

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("email", "phone");
    }

    @Test
    void invalidUpdateUserRequestRejectsBlankOptionalTextFields() {
        var request = new UpdateUserRequest(
                "   ",
                null,
                "   ",
                "   ",
                null,
                null,
                null
        );

        Set<ConstraintViolation<UpdateUserRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("email", "firstName", "lastName");
    }

    /**
     * Returns the three internal roles for parameterized testing.
     */
    private static java.util.List<Role> internalRoles() {
        return java.util.List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE);
    }
}
