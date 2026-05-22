package com.dietetica.lembas.users.repository;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

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
        userRepository.save(new User(1L, "role-employee@lembas.com", "hash", "Role", "Employee",
                null, Role.EMPLOYEE));
        userRepository.flush();

        Page<User> customers = userRepository.findByRole(Role.CUSTOMER, PageRequest.of(0, 10));

        assertThat(customers.getContent())
                .extracting(User::getEmail)
                .contains("role-customer@lembas.com")
                .doesNotContain("role-employee@lembas.com");
    }

    /**
     * Verifies branch filtering and enabled-user filtering queries.
     */
    @Test
    void findByBranchIdAndFindByEnabledTrueReturnExpectedUsers() {
        User enabledBranchUser = new User(1L, "enabled-branch@lembas.com", "hash", "Enabled", "Branch",
                null, Role.EMPLOYEE);
        User disabledBranchUser = new User(1L, "disabled-branch@lembas.com", "hash", "Disabled", "Branch",
                null, Role.EMPLOYEE);
        disabledBranchUser.setEnabled(false);
        User otherBranchUser = new User(null, "enabled-customer@lembas.com", "hash", "Enabled", "Customer",
                null, Role.CUSTOMER);
        userRepository.save(enabledBranchUser);
        userRepository.save(disabledBranchUser);
        userRepository.save(otherBranchUser);
        userRepository.flush();

        Page<User> branchUsers = userRepository.findByBranchId(1L, PageRequest.of(0, 10));

        assertThat(branchUsers.getContent())
                .extracting(User::getEmail)
                .contains("enabled-branch@lembas.com", "disabled-branch@lembas.com")
                .doesNotContain("enabled-customer@lembas.com");
        assertThat(userRepository.findByEnabledTrue())
                .extracting(User::getEmail)
                .contains("enabled-branch@lembas.com", "enabled-customer@lembas.com")
                .doesNotContain("disabled-branch@lembas.com");
    }
}
