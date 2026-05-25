package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.dietetica.lembas.users.service.UserBranchPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Application service for authentication use cases.
 *
 * <p>Owns the transactional boundaries for registration and authentication
 * flows, enforcing domain rules such as email uniqueness and password
 * strength (delegated to Bean Validation at the controller boundary).</p>
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuthMapper authMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final UserBranchPolicy userBranchPolicy;

    public AuthService(UserRepository userRepository, AuthMapper authMapper,
                       JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder,
                       UserBranchPolicy userBranchPolicy) {
        this.userRepository = userRepository;
        this.authMapper = authMapper;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.userBranchPolicy = userBranchPolicy;
    }

    /**
     * Registers a new customer account.
     *
     * <p>This operation is atomic: if any step fails (e.g. duplicate email),
     * no user is persisted. New accounts are assigned the {@code CUSTOMER}
     * role with {@code branch_id = null}.</p>
     *
     * @param request the registration payload (firstName, lastName, email, password, phone)
     * @return an {@link AuthResponse} containing the JWT access token, refresh token, and user info
     * @throws DomainException with code {@code EMAIL_DUPLICATED} if the email is already registered
     */
    @Transactional
    public AuthResponse registerCustomer(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email().toLowerCase().trim())) {
            throw new DomainException(
                    "EMAIL_DUPLICATED",
                    HttpStatus.CONFLICT,
                    "An account with this email address already exists"
            );
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User user = authMapper.toEntity(request, encodedPassword);
        userBranchPolicy.validate(user.getRole(), user.getBranchId());
        User savedUser = userRepository.save(user);

        String accessToken = jwtTokenProvider.createAccessToken(savedUser);
        String refreshToken = jwtTokenProvider.createRefreshToken(savedUser);

        // CUSTOMER accounts have no branch, so branchName is null
        return authMapper.toAuthResponse(accessToken, refreshToken, savedUser, null);
    }

    /**
     * Authenticates a user by email and password.
     *
     * <p>The login flow:</p>
     * <ol>
     *   <li>Look up the user by normalized email</li>
     *   <li>Verify the account is enabled</li>
     *   <li>Validate the password against the stored BCrypt hash</li>
     *   <li>Issue access and refresh JWT tokens</li>
     * </ol>
     *
     * @param request credentials payload (email, password)
     * @return an {@link AuthResponse} with JWT tokens and user info
     * @throws DomainException with code {@code INVALID_CREDENTIALS} if the email is not found
     *                         or the password does not match
     * @throws DomainException with code {@code ACCOUNT_DISABLED} if the account is disabled
     */
    @Transactional(readOnly = true)
    public AuthResponse authenticate(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new DomainException(
                        "INVALID_CREDENTIALS",
                        HttpStatus.UNAUTHORIZED,
                        "Invalid email or password"
                ));

        if (!user.isEnabled()) {
            throw new DomainException(
                    "ACCOUNT_DISABLED",
                    HttpStatus.FORBIDDEN,
                    "Your account has been disabled. Please contact support."
            );
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new DomainException(
                    "INVALID_CREDENTIALS",
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        String accessToken = jwtTokenProvider.createAccessToken(user);
        String refreshToken = jwtTokenProvider.createRefreshToken(user);

        // branchName is null for login responses — a separate branch lookup can be added later
        return authMapper.toAuthResponse(accessToken, refreshToken, user, null);
    }

    /**
     * Returns the currently authenticated user's profile.
     *
     * <p>Used by {@code GET /api/auth/me} to return the caller's own user info.
     * Branch name is resolved as {@code null} since the MVP does not include
     * a dedicated branch lookup at this stage.</p>
     *
     * @param user the authenticated domain user
     * @return a {@link AuthResponse} containing user info without tokens
     */
    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(User user) {
        return authMapper.toAuthResponse(null, null, user, null);
    }
}
