package com.dietetica.lembas.users.api;

import com.dietetica.lembas.users.model.User;
import java.util.Optional;

/**
 * Authentication-facing access to user accounts.
 *
 * <p>This contract keeps authentication independent from the users persistence
 * repository while retaining the existing user entity as the internal account
 * representation used by the authentication flow.</p>
 */
public interface UserDirectory {

    /** Returns whether an account already uses the supplied normalized email. */
    boolean existsByEmail(String email);

    /** Persists a customer account created by the registration use case. */
    User registerCustomer(User user);

    /** Finds an account by its normalized email. */
    Optional<User> findByEmail(String email);

    /** Finds an account by its database identifier. */
    Optional<User> findById(Long userId);
}
