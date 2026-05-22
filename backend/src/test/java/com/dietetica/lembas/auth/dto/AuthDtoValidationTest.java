package com.dietetica.lembas.auth.dto;

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
 * Bean Validation tests for authentication request DTOs.
 */
class AuthDtoValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    /**
     * Creates a reusable Jakarta Bean Validation validator for DTO constraint checks.
     */
    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    /**
     * Releases Bean Validation resources after all tests.
     */
    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    /**
     * Verifies that a valid registration request satisfies all DTO constraints.
     */
    @Test
    void validRegisterRequestHasNoViolations() {
        RegisterRequest request = new RegisterRequest(
                "Frodo",
                "Baggins",
                "frodo@lembas.com",
                "password123",
                "+54 351 123 4567"
        );

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    /**
     * Verifies that invalid registration input reports field-level violations.
     */
    @Test
    void invalidRegisterRequestHasExpectedViolations() {
        RegisterRequest request = new RegisterRequest(
                "",
                "",
                "not-an-email",
                "short",
                "invalid phone letters"
        );

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("firstName", "lastName", "email", "password", "phone");
    }

    /**
     * Verifies that login requires a syntactically valid email and a non-blank password.
     */
    @Test
    void invalidLoginRequestHasExpectedViolations() {
        LoginRequest request = new LoginRequest("not-an-email", "");

        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(request);

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email", "password");
    }
}
