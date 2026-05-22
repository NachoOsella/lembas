package com.dietetica.lembas.users.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for enabling or disabling a user via {@code PATCH /api/admin/users/{id}/status}.
 *
 * @param enabled {@code true} to activate the account, {@code false} to deactivate it
 */
public record UserStatusRequest(
        @NotNull Boolean enabled
) {
}
