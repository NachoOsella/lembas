package com.dietetica.lembas.users.dto;

import com.dietetica.lembas.users.model.Role;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Response DTO for user data exposed via the API.
 *
 * <p>This is the single representation used for both collection and detail responses.
 * Nullable fields (phone, branchId) are omitted from JSON when {@code null}.</p>
 *
 * @param id        the unique user identifier
 * @param email     the user's email address
 * @param firstName the user's first name
 * @param lastName  the user's last name
 * @param phone     the optional phone number
 * @param role      the system role
 * @param branchId  the branch FK (nullable for CUSTOMER and ADMIN)
 * @param enabled   whether the account is active
 * @param createdAt the account creation timestamp
 * @param updatedAt the last-update timestamp
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String phone,
        Role role,
        Long branchId,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
}
