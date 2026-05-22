package com.dietetica.lembas.users.repository;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the {@link User} entity.
 *
 * <p>Provides login lookups, paginated queries for admin management,
 * and existence checks for duplicate-email validation.</p>
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their unique email address.
     *
     * @param email the email to look up
     * @return an {@link Optional} containing the user if found, or empty otherwise
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether a user with the given email already exists.
     *
     * @param email the email to check
     * @return {@code true} if a user with that email exists
     */
    boolean existsByEmail(String email);

    /**
     * Returns a paginated list of users filtered by role.
     *
     * @param role     the role to filter by
     * @param pageable pagination parameters
     * @return a page of users with the given role
     */
    Page<User> findByRole(Role role, Pageable pageable);

    /**
     * Returns a paginated list of users assigned to a branch.
     *
     * @param branchId the branch ID
     * @param pageable pagination parameters
     * @return a page of users for the given branch
     */
    Page<User> findByBranchId(Long branchId, Pageable pageable);

    /**
     * Returns all enabled users.
     *
     * @return list of active users
     */
    List<User> findByEnabledTrue();
}
