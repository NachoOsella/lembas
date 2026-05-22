package com.dietetica.lembas.users.service;

import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for user role and branch assignment policy rules.
 */
class UserBranchPolicyTest {

    private final UserBranchPolicy policy = new UserBranchPolicy();

    /**
     * Verifies valid role and branch combinations accepted by the domain policy.
     */
    @Test
    void Should_acceptValidBranchAssignments_when_roleRulesAreSatisfied() {
        assertThatCode(() -> policy.validate(Role.CUSTOMER, null)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validate(Role.ADMIN, null)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validate(Role.ADMIN, 1L)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validate(Role.MANAGER, 1L)).doesNotThrowAnyException();
        assertThatCode(() -> policy.validate(Role.EMPLOYEE, 1L)).doesNotThrowAnyException();
    }

    /**
     * Verifies customers cannot be tied to an internal branch.
     */
    @Test
    void Should_rejectCustomerBranchAssignment_when_branchIsPresent() {
        assertThatThrownBy(() -> policy.validate(Role.CUSTOMER, 1L))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_USER_BRANCH")
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasMessage("Customer users cannot be assigned to a branch");
    }

    /**
     * Verifies internal branch roles always require a branch.
     */
    @Test
    void Should_rejectInternalRoles_when_branchIsMissing() {
        assertThatThrownBy(() -> policy.validate(Role.EMPLOYEE, null))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_USER_BRANCH")
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasMessage("Manager and employee users must be assigned to a branch");

        assertThatThrownBy(() -> policy.validate(Role.MANAGER, null))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_USER_BRANCH")
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasMessage("Manager and employee users must be assigned to a branch");
    }
}
