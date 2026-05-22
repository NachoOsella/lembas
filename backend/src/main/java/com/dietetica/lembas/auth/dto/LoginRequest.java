package com.dietetica.lembas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for {@code POST /api/auth/login}.
 *
 * <p>Accepts the user's credentials and returns an {@link AuthResponse} with
 * a JWT token upon successful authentication.</p>
 *
 * @param email    the user's email address
 * @param password the user's raw password
 */
public record LoginRequest(
        @NotBlank @Email @Size(max = 255) String email,

        @NotBlank @Size(max = 128) String password
) {
}
