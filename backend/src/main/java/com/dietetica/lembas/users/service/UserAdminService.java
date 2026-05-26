package com.dietetica.lembas.users.service;

import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.dto.CreateInternalUserRequest;
import com.dietetica.lembas.users.dto.UpdateUserRequest;
import com.dietetica.lembas.users.dto.UserMetricsResponse;
import com.dietetica.lembas.users.dto.UserResponse;
import com.dietetica.lembas.users.dto.UserStatusRequest;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * Application service for admin user management (CRUD of internal users).
 *
 * <p>Owns transactional boundaries for creating, updating, listing, and
 * disabling internal users. All endpoints in this service are restricted
 * to the ADMIN role at the controller boundary.</p>
 */
@Service
public class UserAdminService {

    private static final List<Role> INTERNAL_ROLES = List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE);

    private final UserRepository userRepository;
    private final UserBranchPolicy userBranchPolicy;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(UserRepository userRepository,
                            UserBranchPolicy userBranchPolicy,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userBranchPolicy = userBranchPolicy;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Returns a paginated list of users, optionally filtered by role, branch, and search text.
     *
     * @param role     optional role filter
     * @param branchId optional branch filter
     * @param search   optional search term matched against name and email
     * @param pageable pagination parameters
     * @return a page of user responses
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(Role role, Long branchId, String search, Pageable pageable) {
        if (role == Role.CUSTOMER) {
            throw new DomainException(
                    "INVALID_ROLE_FILTER",
                    HttpStatus.BAD_REQUEST,
                    "Customer users cannot be managed from the admin endpoint"
            );
        }

        String normalizedSearch = normalizeSearch(search);
        return userRepository.findInternalUsers(INTERNAL_ROLES, role, branchId, normalizedSearch, pageable)
                .map(this::toResponse);
    }

    /**
     * Normalizes a free-text search term for case-insensitive matching.
     * The query applies {@code lower()} on column values, so the search term
     * is lowercased here to match without wrapping the bound parameter in {@code lower()}
     * (which causes PostgreSQL type-inference issues when the value is {@code null}).
     */
    private String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String normalized = search.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    /**
     * Returns aggregate metrics for the internal user directory via a single native query.
     */
    @Transactional(readOnly = true)
    public UserMetricsResponse getUserMetrics() {
        var m = userRepository.computeUserMetrics();
        return new UserMetricsResponse(m.getTotalUsers(), m.getEnabledUsers(), m.getUsersWithBranch());
    }

    /**
     * Creates a new internal user.
     *
     * @param request the creation payload
     * @return the created user response
     * @throws DomainException with code {@code EMAIL_DUPLICATED} if the email is already registered
     */
    @Transactional
    public UserResponse createUser(CreateInternalUserRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DomainException(
                    "EMAIL_DUPLICATED",
                    HttpStatus.CONFLICT,
                    "A user with this email address already exists"
            );
        }

        String encodedPassword = passwordEncoder.encode(request.password());

        User user = new User(
                request.branchId(),
                normalizedEmail,
                encodedPassword,
                request.firstName().trim(),
                request.lastName().trim(),
                request.phone() != null ? request.phone().trim() : null,
                request.role()
        );

        userBranchPolicy.validate(user.getRole(), user.getBranchId());
        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    /**
     * Updates an existing user. Only non-null fields from the request are applied.
     *
     * @param id      the user ID to update
     * @param request the update payload (optional fields)
     * @return the updated user response
     * @throws DomainException with code {@code USER_NOT_FOUND} if no user exists with the given ID
     * @throws DomainException with code {@code EMAIL_DUPLICATED} if the new email is taken by another user
     */
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = findInternalUserOrThrow(id);
        if (request.email() != null) {
            String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
            if (!user.getEmail().equals(normalizedEmail) && userRepository.existsByEmail(normalizedEmail)) {
                throw new DomainException(
                        "EMAIL_DUPLICATED",
                        HttpStatus.CONFLICT,
                        "A user with this email address already exists"
                );
            }
            user.setEmail(normalizedEmail);
        }

        if (request.password() != null) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        if (request.firstName() != null) {
            user.setFirstName(request.firstName().trim());
        }

        if (request.lastName() != null) {
            user.setLastName(request.lastName().trim());
        }

        if (request.phone() != null) {
            String normalizedPhone = request.phone().trim();
            user.setPhone(normalizedPhone.isEmpty() ? null : normalizedPhone);
        }

        if (request.role() != null) {
            user.setRole(request.role());
            if (request.role() == Role.ADMIN) {
                user.setBranchId(null);
            }
        }

        if (request.branchId() != null) {
            user.setBranchId(request.branchId());
        }

        userBranchPolicy.validate(user.getRole(), user.getBranchId());
        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    /**
     * Enables or disables a user account.
     *
     * @param id      the user ID
     * @param request the status payload containing the new enabled flag
     * @return the updated user response
     * @throws DomainException with code {@code USER_NOT_FOUND} if no user exists with the given ID
     */
    @Transactional
    public UserResponse updateUserStatus(Long id, UserStatusRequest request) {
        User user = findInternalUserOrThrow(id);

        if (user.getRole() == Role.ADMIN && Boolean.FALSE.equals(request.enabled())
                && userRepository.countByRoleAndEnabledTrue(Role.ADMIN) <= 1) {
            throw new DomainException(
                    "LAST_ADMIN_DISABLE_FORBIDDEN",
                    HttpStatus.BAD_REQUEST,
                    "Cannot disable the last enabled admin user"
            );
        }

        user.setEnabled(request.enabled());
        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    /**
     * Finds an internal user or hides customers from this admin-management boundary.
     */
    private User findInternalUserOrThrow(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new DomainException(
                        "USER_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "User not found with id: " + id
                ));

        if (user.getRole() == Role.CUSTOMER) {
            throw new DomainException(
                    "USER_NOT_FOUND",
                    HttpStatus.NOT_FOUND,
                    "User not found with id: " + id
            );
        }
        return user;
    }

    /**
     * Maps a {@link User} entity to a {@link UserResponse} DTO.
     */
    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getRole(),
                user.getBranchId(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
