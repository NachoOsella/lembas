package com.dietetica.lembas.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for exchanging a refresh token for a new token pair.
 *
 * @param refreshToken the currently active refresh token issued by the backend
 */
public record RefreshTokenRequest(
        @NotBlank String refreshToken
) {
}
