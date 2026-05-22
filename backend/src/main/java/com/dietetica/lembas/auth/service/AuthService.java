package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.dietetica.lembas.users.service.UserBranchPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
