package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating an existing user via {@code PUT /api/admin/users/{id}}.
 *
 * <p>All fields are optional; only non-null values will be applied.
 * A non-null {@code password} triggers a password reset; a null password leaves the
 * existing password unchanged. The {@code role} is restricted to internal roles
 * (ADMIN, MANAGER, EMPLOYEE); CUSTOMER role is rejected because customer accounts
 * cannot be managed through the admin endpoint.</p>
 *
 * @param email     the unique email address
 * @param password  the new raw password (optional; null leaves current password unchanged)
 * @param firstName the user's first name
 * @param lastName  the user's last name
 * @param phone     optional phone number
 * @param role      the system role (ADMIN, MANAGER, or EMPLOYEE)
 * @param branchId  optional branch FK
 */
public record UpdateUserRequest(

        @Email @Size(max = 255) String email,

        @Size(min = 8, max = 128) String password,

        @Size(max = 100) String firstName,

        @Size(max = 100) String lastName,

        @Size(max = 50)
        @Pattern(regexp = "^[+]?[0-9\\s\\-().]{0,50}$", message = "Invalid phone number format")
        String phone,

        @InternalRole Role role,

        Long branchId
) {
}
