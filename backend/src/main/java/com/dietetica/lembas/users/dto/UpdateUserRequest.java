package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating an existing user via {@code PUT /api/admin/users/{id}}.
 *
 * <p>All fields are optional; only non-null values will be applied.</p>
 *
 * @param email     the unique email address
 * @param firstName the user's first name
 * @param lastName  the user's last name
 * @param phone     optional phone number
 * @param role      the system role
 * @param branchId  optional branch FK
 */
public record UpdateUserRequest(

        @Email @Size(max = 255) String email,

        @Size(max = 100) String firstName,

        @Size(max = 100) String lastName,

        @Size(max = 50)
        @Pattern(regexp = "^[+]?[0-9\\s\\-().]{0,50}$", message = "Invalid phone number format")
        String phone,

        Role role,

        Long branchId
) {
}
