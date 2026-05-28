package com.dietetica.lembas.users.repository;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL-backed persistence tests for {@link UserRepository} queries and mappings.
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Creates a branch row for users whose role requires branch assignment.
     */
    private Long createBranch(String name) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO branches (name) VALUES (?) RETURNING id",
                Long.class,
                name
        );
    }

    /**
     * Verifies email lookup methods used by authentication flows.
     */
    @Test
    void findByEmailAndExistsByEmailUsePersistedEmail() {
        User user = new User(null, "repository-customer@lembas.com", "hash", "Repo", "Customer",
                null, Role.CUSTOMER);
        User savedUser = userRepository.saveAndFlush(user);

        Optional<User> foundUser = userRepository.findByEmail("repository-customer@lembas.com");

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getId()).isEqualTo(savedUser.getId());
        assertThat(userRepository.existsByEmail("repository-customer@lembas.com")).isTrue();
        assertThat(userRepository.existsByEmail("missing@lembas.com")).isFalse();
    }

    /**
     * Verifies paginated role filtering for admin user management.
     */
    @Test
    void findByRoleReturnsOnlyUsersWithRequestedRole() {
        userRepository.save(new User(null, "role-customer@lembas.com", "hash", "Role", "Customer",
                null, Role.CUSTOMER));
        Long branchId = createBranch("Role Test Branch");
        userRepository.save(new User(branchId, "role-employee@lembas.com", "hash", "Role", "Employee",
                null, Role.EMPLOYEE));
        userRepository.flush();

        Page<User> customers = userRepository.findByRole(Role.CUSTOMER, PageRequest.of(0, 10));

        assertThat(customers.getContent())
                .extracting(User::getEmail)
                .contains("role-customer@lembas.com")
                .doesNotContain("role-employee@lembas.com");
    }

    /**
     * Verifies backend search for admin user management is paginated and excludes customers.
     */
    @Test
    void findInternalUsersReturnsMatchingInternalUsersOnly() {
        Long branchId = createBranch("Search Test Branch");
        userRepository.save(new User(null, "search-admin@lembas.com", "hash", "Gandalf", "Grey",
                null, Role.ADMIN));
        userRepository.save(new User(branchId, "search-employee@lembas.com", "hash", "Frodo", "Baggins",
                null, Role.EMPLOYEE));
        userRepository.save(new User(null, "gandalf-customer@lembas.com", "hash", "Gandalf", "Customer",
                null, Role.CUSTOMER));
        userRepository.flush();

        Page<User> result = userRepository.findInternalUsers(
                List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                null,
                null,
                "gandalf",
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent())
                .extracting(User::getEmail)
                .containsExactly("search-admin@lembas.com");
    }

    /**
     * Verifies findInternalUsers works as a regular listing when search is null.
     */
    @Test
    void findInternalUsersReturnsAllInternalUsersWhenSearchIsNull() {
        Long branchId = createBranch("Null Search Branch");
        userRepository.save(new User(null, "null-admin@lembas.com", "hash", "Null", "Admin",
                null, Role.ADMIN));
        userRepository.save(new User(branchId, "null-employee@lembas.com", "hash", "Null", "Employee",
                null, Role.EMPLOYEE));
        userRepository.save(new User(null, "null-customer@lembas.com", "hash", "Null", "Customer",
                null, Role.CUSTOMER));
        userRepository.flush();

        Page<User> result = userRepository.findInternalUsers(
                List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                null, null, null,
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent())
                .extracting(User::getEmail)
                .contains("null-admin@lembas.com", "null-employee@lembas.com")
                .doesNotContain("null-customer@lembas.com");
    }

    /**
     * Verifies enabled-user filtering query.
     */
    @Test
    void findByEnabledTrueReturnsOnlyEnabledUsers() {
        Long branchId = createBranch("Enabled Flag Branch");
        User enabledUser = new User(branchId, "flag-enabled@lembas.com", "hash", "Flag", "Enabled",
                null, Role.EMPLOYEE);
        User disabledUser = new User(branchId, "flag-disabled@lembas.com", "hash", "Flag", "Disabled",
                null, Role.EMPLOYEE);
        disabledUser.setEnabled(false);
        userRepository.save(enabledUser);
        userRepository.save(disabledUser);
        userRepository.flush();

        assertThat(userRepository.findByEnabledTrue())
                .extracting(User::getEmail)
                .contains("flag-enabled@lembas.com")
                .doesNotContain("flag-disabled@lembas.com");
    }

    /**
     * Verifies the database rejects customers with branch assignments.
     */
    @Test
    void Should_rejectCustomerWithBranch_when_databaseConstraintIsChecked() {
        Long branchId = createBranch("Customer Constraint Branch");
        User invalidCustomer = new User(branchId, "invalid-customer-branch@lembas.com", "hash",
                "Invalid", "Customer", null, Role.CUSTOMER);

        assertThatThrownBy(() -> userRepository.saveAndFlush(invalidCustomer))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * Verifies the database rejects internal branch roles without a branch.
     */
    @Test
    void Should_rejectInternalUserWithoutBranch_when_databaseConstraintIsChecked() {
        User invalidEmployee = new User(null, "invalid-employee-branch@lembas.com", "hash",
                "Invalid", "Employee", null, Role.EMPLOYEE);

        assertThatThrownBy(() -> userRepository.saveAndFlush(invalidEmployee))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}

