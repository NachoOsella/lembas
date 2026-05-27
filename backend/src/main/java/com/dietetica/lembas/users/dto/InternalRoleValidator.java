package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates that a {@link Role} value is an internal role
 * (ADMIN, MANAGER, or EMPLOYEE) and rejects CUSTOMER.
 *
 * <p>Null values are delegated to {@code @NotNull} on the annotated field
 * so that a missing role produces a standard "must not be null" violation
 * rather than a misleading role-restriction message.</p>
 */
public class InternalRoleValidator implements ConstraintValidator<InternalRole, Role> {

    @Override
    public boolean isValid(Role role, ConstraintValidatorContext context) {
        // Null is handled by @NotNull — don't report here.
        if (role == null) {
            return true;
        }
        return role != Role.CUSTOMER;
    }
}
