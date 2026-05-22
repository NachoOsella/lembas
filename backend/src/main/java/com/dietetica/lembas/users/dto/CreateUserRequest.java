package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a new user via {@code POST /api/admin/users}.
 *
 * @param email        the unique email address (must be a valid email format)
 * @param password     the raw password (will be BCrypt-encoded before persistence)
 * @param firstName    the user's first name
 * @param lastName     the user's last name
 * @param phone        optional phone number
 * @param role         the system role (ADMIN, MANAGER, EMPLOYEE, CUSTOMER)
 * @param branchId     optional branch FK (required for MANAGER and EMPLOYEE)
 */
public record CreateUserRequest(
        @NotBlank @Email @Size(max = 255) String email,

        @NotBlank @Size(min = 8, max = 128) String password,

        @NotBlank @Size(max = 100) String firstName,

        @NotBlank @Size(max = 100) String lastName,

        @Size(max = 50)
        @Pattern(regexp = "^[+]?[0-9\\s\\-().]{0,50}$", message = "Invalid phone number format")
        String phone,

        @NotNull Role role,

        Long branchId
) {
}
