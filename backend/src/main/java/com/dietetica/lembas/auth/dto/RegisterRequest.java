package com.dietetica.lembas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for {@code POST /api/auth/register}.
 *
 * <p>All fields except {@code phone} are required. The {@code password} is the raw
 * password; it will be BCrypt-encoded before persistence. A successful registration
 * returns an {@link AuthResponse} with a JWT token.</p>
 *
 * @param firstName the user's first name
 * @param lastName  the user's last name
 * @param email     the unique email address (must be a valid email format)
 * @param password  the raw password (minimum 8 characters)
 * @param phone     optional phone number
 */
public record RegisterRequest(
        @NotBlank @Size(max = 100) String firstName,

        @NotBlank @Size(max = 100) String lastName,

        @NotBlank @Email @Size(max = 255) String email,

        @NotBlank @Size(min = 8, max = 128) String password,

        @Size(max = 50)
        @Pattern(regexp = "^[+]?[0-9\\s\\-().]{0,50}$", message = "Invalid phone number format")
        String phone
) {
}
