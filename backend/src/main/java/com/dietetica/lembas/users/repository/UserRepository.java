package com.dietetica.lembas.users.repository;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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
     * Returns a paginated list of internal users, optionally filtered by role, branch,
     * and free-text search. When {@code search} is {@code null} the search predicates
     * are elided via {@code :search is null} short-circuit.
     *
     * <p><b>Performance note:</b> leading-wildcard {@code LIKE} patterns defeat
     * standard B-tree indexes. When the internal user count exceeds ~5-10K rows,
     * add a PostgreSQL {@code pg_trgm} GIN index on
     * {@code (email, first_name, last_name)}.</p>
     *
     * @param roles    allowed internal roles
     * @param role     optional role filter
     * @param branchId optional branch ID filter
     * @param search   optional search term (trimmed, lowercased in the service layer;
     *                 the query applies {@code lower()} on column values)
     * @param pageable pagination parameters
     * @return a page of matching internal users
     */
    @Query("""
            select u
            from User u
            where u.role in :roles
              and (:role is null or u.role = :role)
              and (:branchId is null or u.branchId = :branchId)
              and (:search is null or (
                    lower(u.email) like concat('%', cast(:search as string), '%')
                    or lower(u.firstName) like concat('%', cast(:search as string), '%')
                    or lower(u.lastName) like concat('%', cast(:search as string), '%')
                    or lower(concat(u.firstName, ' ', u.lastName)) like concat('%', cast(:search as string), '%')
              ))
            """)
    Page<User> findInternalUsers(
            @Param("roles") Collection<Role> roles,
            @Param("role") Role role,
            @Param("branchId") Long branchId,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Single-shot native aggregation for the admin users directory:
     * returns total, enabled, and branch-assigned counts for internal roles.
     *
     * <p>Column aliases use double-quoted camelCase on purpose so that
     * {@link UserMetricsProjection} accessors map directly.</p>
     */
    @Query(value = """
            SELECT count(*)             AS "totalUsers",
                   count(*) FILTER (WHERE enabled = true)  AS "enabledUsers",
                   count(*) FILTER (WHERE branch_id IS NOT NULL) AS "usersWithBranch"
            FROM users
            WHERE role IN ('ADMIN','MANAGER','EMPLOYEE')
            """, nativeQuery = true)
    UserMetricsProjection computeUserMetrics();

    /**
     * Projection for the single-query user metrics aggregation.
     */
    interface UserMetricsProjection {
        long getTotalUsers();
        long getEnabledUsers();
        long getUsersWithBranch();
    }

    /**
     * Counts enabled users with the given role. Used by the last-admin-disable guard.
     *
     * @param role the role to count
     * @return the number of enabled users with that role
     */
    long countByRoleAndEnabledTrue(Role role);

    /**
     * Returns all enabled users.
     *
     * @return list of active users
     */
    List<User> findByEnabledTrue();
}
