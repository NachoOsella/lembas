package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating an internal user via {@code POST /api/admin/users}.
 *
 * <p>This DTO is intended exclusively for admin-created internal users with roles
 * {@link Role#ADMIN}, {@link Role#MANAGER}, or {@link Role#EMPLOYEE}.
 * The {@link Role#CUSTOMER} role is rejected at the validation boundary by the
 * {@link InternalRole} constraint — customers must register via the public
 * {@code POST /api/auth/register} endpoint using {@code RegisterRequest}.</p>
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>ADMIN: branchId is optional (global access).</li>
 *   <li>MANAGER / EMPLOYEE: branchId is required (assigned branch), enforced by
 *       {@code UserBranchPolicy} at the service layer.</li>
 * </ul>
 *
 * @param email     the unique email address
 * @param password  the raw password (BCrypt-encoded before persistence)
 * @param firstName the user's first name
 * @param lastName  the user's last name
 * @param phone     optional phone number
 * @param role      the internal role (ADMIN, MANAGER, or EMPLOYEE)
 * @param branchId  optional branch FK (required for MANAGER and EMPLOYEE)
 */
public record CreateInternalUserRequest(
        @NotBlank @Email @Size(max = 255) String email,

        @NotBlank @Size(min = 8, max = 128) String password,

        @NotBlank @Size(max = 100) String firstName,

        @NotBlank @Size(max = 100) String lastName,

        @Size(max = 50)
        @Pattern(regexp = "^[+]?[0-9\\s\\-().]{0,50}$", message = "Invalid phone number format")
        String phone,

        @NotNull @InternalRole Role role,

        Long branchId
) {
}
