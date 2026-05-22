package com.dietetica.lembas.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response DTO for authentication operations.
 *
 * <p>Returned by {@code POST /api/auth/register} and {@code POST /api/auth/login}
 * on success. The {@code refreshToken} can be used to obtain a new {@code token}
 * without re-authenticating.</p>
 *
 * @param token        the JWT access token
 * @param refreshToken the refresh token for obtaining a new access token
 * @param user         the authenticated user details
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthResponse(
        String token,
        String refreshToken,
        UserDto user
) {
}
