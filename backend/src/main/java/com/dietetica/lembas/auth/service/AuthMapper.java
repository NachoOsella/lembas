package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.dto.UserDto;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.stereotype.Component;

/**
 * Maps between auth-layer DTOs and the {@link User} entity.
 *
 * <p>Keeping mapping logic in a dedicated component keeps DTOs free of
 * JPA imports and entity references, and centralises transformation rules
 * for registration, login, and profile responses.</p>
 */
@Component
public class AuthMapper {

    /**
     * Creates a new {@link User} entity from a registration request.
     *
     * <p>New accounts are assigned the {@link Role#CUSTOMER} role by default.
     * The caller is responsible for encoding the raw password via
     * {@code BCryptPasswordEncoder} before passing it as {@code encodedPassword}.</p>
     *
     * @param request         the registration request payload
     * @param encodedPassword the BCrypt-encoded password hash
     * @return a transient {@link User} instance ready for persistence
     */
    public User toEntity(RegisterRequest request, String encodedPassword) {
        return new User(
                null,                       // branchId — null for CUSTOMER
                request.email().toLowerCase().trim(),
                encodedPassword,
                request.firstName().trim(),
                request.lastName().trim(),
                request.phone() != null ? request.phone().trim() : null,
                Role.CUSTOMER
        );
    }

    /**
     * Builds an {@link AuthResponse} after a successful authentication.
     *
     * @param token        the JWT access token
     * @param refreshToken the refresh token
     * @param user         the authenticated user entity
     * @param branchName   the branch display name (nullable)
     * @return the authentication response DTO
     */
    public AuthResponse toAuthResponse(String token, String refreshToken, User user, String branchName) {
        return new AuthResponse(
                token,
                refreshToken,
                toUserDto(user, branchName)
        );
    }

    /**
     * Maps a {@link User} entity to a {@link UserDto} suitable for auth responses.
     *
     * @param user       the user entity
     * @param branchName the branch display name (nullable)
     * @return the user DTO
     */
    public UserDto toUserDto(User user, String branchName) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.getBranchId(),
                branchName
        );
    }
}
