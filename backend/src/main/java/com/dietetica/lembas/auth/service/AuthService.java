package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.model.RefreshToken;
import com.dietetica.lembas.auth.repository.RefreshTokenRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.dietetica.lembas.users.service.UserBranchPolicy;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
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

    private static final Duration REVOKED_TOKEN_RETENTION = Duration.ofDays(30);

    private final UserRepository userRepository;
    private final AuthMapper authMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final UserBranchPolicy userBranchPolicy;
    private final RefreshTokenRepository refreshTokenRepository;

    public AuthService(UserRepository userRepository, AuthMapper authMapper,
                       JwtTokenProvider jwtTokenProvider, PasswordEncoder passwordEncoder,
                       UserBranchPolicy userBranchPolicy, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.authMapper = authMapper;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.userBranchPolicy = userBranchPolicy;
        this.refreshTokenRepository = refreshTokenRepository;
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
        if (userRepository.existsByEmail(request.email().trim().toLowerCase(Locale.ROOT))) {
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
        String refreshToken = issueRefreshToken(savedUser);

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
    @Transactional
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
        String refreshToken = issueRefreshToken(user);

        // branchName is null for login responses — a separate branch lookup can be added later
        return authMapper.toAuthResponse(accessToken, refreshToken, user, null);
    }

    /**
     * Rotates a valid refresh token and returns a fresh access/refresh pair.
     *
     * <p>The presented refresh token is revoked in the same transaction before
     * the replacement token is persisted. Reusing a revoked token revokes any
     * other active tokens for the same user as a compromise-containment measure.</p>
     *
     * @param rawRefreshToken refresh JWT previously returned by login/register/refresh
     * @return an {@link AuthResponse} with newly issued tokens and user info
     * @throws DomainException with code {@code INVALID_REFRESH_TOKEN} when the token is invalid,
     *                         expired, revoked, or belongs to a disabled/deleted user
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        Claims claims = parseRefreshClaims(rawRefreshToken);
        String tokenHash = hashToken(rawRefreshToken);
        Instant now = Instant.now();

        RefreshToken currentToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(this::invalidRefreshToken);

        User user = currentToken.getUser();
        if (currentToken.getRevokedAt() != null) {
            refreshTokenRepository.revokeActiveTokensByUser(user, now);
            throw invalidRefreshToken();
        }
        if (!currentToken.isActiveAt(now)) {
            currentToken.revoke(now);
            throw invalidRefreshToken();
        }
        if (!user.isEnabled()) {
            currentToken.revoke(now);
            throw invalidRefreshToken();
        }
        if (!user.getId().toString().equals(claims.getSubject())) {
            currentToken.revoke(now);
            throw invalidRefreshToken();
        }

        currentToken.markRotated(now);
        String accessToken = jwtTokenProvider.createAccessToken(user);
        String replacementRefreshToken = issueRefreshToken(user);

        return authMapper.toAuthResponse(accessToken, replacementRefreshToken, user, null);
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

    /** Revokes the presented refresh token during logout, if it is known to the server. */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String tokenHash = hashToken(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(refreshToken -> refreshToken.revoke(Instant.now()));
    }

    /** Creates and persists a new active refresh token for the user. */
    private String issueRefreshToken(User user) {
        Instant now = Instant.now();
        cleanupObsoleteRefreshTokens(user, now);

        String rawRefreshToken = jwtTokenProvider.createRefreshToken(user);
        RefreshToken refreshToken = new RefreshToken(
                user,
                hashToken(rawRefreshToken),
                now.plus(JwtTokenProvider.REFRESH_EXPIRATION),
                now
        );
        refreshTokenRepository.save(refreshToken);
        return rawRefreshToken;
    }

    /** Validates token syntax/signature and confirms the token type is REFRESH. */
    private Claims parseRefreshClaims(String rawRefreshToken) {
        try {
            Claims claims = jwtTokenProvider.validateToken(rawRefreshToken);
            if (!jwtTokenProvider.isRefreshToken(claims)) {
                throw invalidRefreshToken();
            }
            return claims;
        } catch (JwtException | IllegalArgumentException e) {
            throw invalidRefreshToken();
        }
    }

    /** Removes obsolete refresh-token rows for the user to limit unbounded growth. */
    private void cleanupObsoleteRefreshTokens(User user, Instant now) {
        refreshTokenRepository.deleteObsoleteTokensByUser(user, now, now.minus(REVOKED_TOKEN_RETENTION));
    }

    /** Hashes a bearer token before persistence or lookup. */
    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest is not available", e);
        }
    }

    /** Builds the standard invalid-refresh-token error without leaking details. */
    private DomainException invalidRefreshToken() {
        return new DomainException(
                "INVALID_REFRESH_TOKEN",
                HttpStatus.UNAUTHORIZED,
                "Invalid or expired refresh token"
        );
    }
}
