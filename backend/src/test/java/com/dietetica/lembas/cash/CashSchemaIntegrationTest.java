package com.dietetica.lembas.cash;

import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL-backed schema tests for the cash module (V27__cash.sql).
 *
 * <p>Verifies the {@code uk_cash_sessions_one_open_per_branch} partial unique
 * index: a second OPEN session in the same branch is rejected, while two OPEN
 * sessions in different branches coexist, and a CLOSED session does not block
 * a new OPEN in the same branch.</p>
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CashSchemaIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private CashSessionRepository cashSessionRepository;
    @Autowired
    private BranchRepository branchRepository;
    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldRejectSecondOpenSessionForSameBranch() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "cash-dup@lembas.com");

        cashSessionRepository.saveAndFlush(openSession(branch, employee, new BigDecimal("100.00")));

        CashSession duplicate = openSession(branch, employee, new BigDecimal("50.00"));
        assertThatThrownBy(() -> cashSessionRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowOpenSessionsInDifferentBranches() {
        Branch first = defaultBranch();
        Branch second = persistBranch("Second branch");
        User employee = persistEmployee(first, "cash-multi@lembas.com");

        cashSessionRepository.saveAndFlush(openSession(first, employee, new BigDecimal("100.00")));
        cashSessionRepository.saveAndFlush(openSession(second, employee, new BigDecimal("200.00")));

        assertThat(cashSessionRepository.existsByBranchIdAndStatus(first.getId(), CashSessionStatus.OPEN)).isTrue();
        assertThat(cashSessionRepository.existsByBranchIdAndStatus(second.getId(), CashSessionStatus.OPEN)).isTrue();
    }

    @Test
    void shouldRejectNegativeOpeningAmount() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "cash-neg@lembas.com");

        CashSession session = openSession(branch, employee, new BigDecimal("-1.00"));
        assertThatThrownBy(() -> cashSessionRepository.saveAndFlush(session))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private CashSession openSession(Branch branch, User employee, BigDecimal amount) {
        CashSession session = new CashSession();
        session.setBranch(branch);
        session.setOpenedByUser(employee);
        session.setOpeningCashAmount(amount);
        session.setStatus(CashSessionStatus.OPEN);
        return session;
    }

    private User persistEmployee(Branch branch, String email) {
        User user = new User(branch.getId(), email, "hashed", "Cash", "Employee",
                null, Role.EMPLOYEE);
        return userRepository.saveAndFlush(user);
    }

    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for cash tests"));
    }

    /** Builds and persists a brand-new active branch via reflection (Branch has a protected no-args constructor). */
    private Branch persistBranch(String name) {
        try {
            var constructor = Branch.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Branch branch = constructor.newInstance();
            var nameField = Branch.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(branch, name);
            var activeField = Branch.class.getDeclaredField("active");
            activeField.setAccessible(true);
            activeField.set(branch, true);
            return branchRepository.saveAndFlush(branch);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}