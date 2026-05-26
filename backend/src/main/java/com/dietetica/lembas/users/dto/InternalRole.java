package com.dietetica.lembas.users.dto;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Validates that a {@link com.dietetica.lembas.users.model.Role} is one of the
 * internal roles: {@code ADMIN}, {@code MANAGER}, or {@code EMPLOYEE}.
 *
 * <p>The {@code CUSTOMER} role is rejected because customer accounts must be
 * created through the public registration endpoint.</p>
 *
 * <p>Usage on a record component or field:</p>
 * <pre>{@code
 * @NotNull @InternalRole Role role
 * }</pre>
 */
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = InternalRoleValidator.class)
public @interface InternalRole {

    /**
     * Default error message shown when validation fails.
     *
     * @return the error message
     */
    String message() default "Role must be one of: ADMIN, MANAGER, EMPLOYEE";

    /**
     * Groups for constraint composition.
     *
     * @return the validation groups
     */
    Class<?>[] groups() default {};

    /**
     * Payload for metadata.
     *
     * @return the payload
     */
    Class<? extends Payload>[] payload() default {};
}
