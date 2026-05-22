package com.dietetica.lembas.auth.dto;

import com.dietetica.lembas.users.model.Role;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * User representation returned in auth responses.
 *
 * <p>This DTO is used inside {@link AuthResponse} for register/login replies,
 * and as the direct response body for {@code GET /api/auth/me}. The {@code branchName}
 * and {@code branchId} fields are nullable for CUSTOMER and ADMIN roles.</p>
 *
 * @param id         the unique user identifier
 * @param email      the user's email address
 * @param firstName  the user's first name
 * @param lastName   the user's last name
 * @param role       the system role
 * @param branchId   the branch FK (nullable for CUSTOMER and ADMIN)
 * @param branchName the branch display name (nullable)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserDto(
        Long id,
        String email,
        String firstName,
        String lastName,
        Role role,
        Long branchId,
        String branchName
) {
}
