package com.dietetica.lembas.users.service;

import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Enforces the branch assignment rules for users before persistence.
 */
@Component
public class UserBranchPolicy {

    /**
     * Validates whether the given role can be used with the provided branch identifier.
     *
     * @param role the user role to validate
     * @param branchId the branch identifier, nullable for roles that do not require a branch
     * @throws DomainException when the role and branch assignment are inconsistent
     */
    public void validate(Role role, Long branchId) {
        if (role == Role.CUSTOMER && branchId != null) {
            throw invalidBranch("Customer users cannot be assigned to a branch");
        }

        if ((role == Role.MANAGER || role == Role.EMPLOYEE) && branchId == null) {
            throw invalidBranch("Manager and employee users must be assigned to a branch");
        }
    }

    /**
     * Creates a consistent domain exception for invalid branch assignment rules.
     */
    private DomainException invalidBranch(String message) {
        return new DomainException("INVALID_USER_BRANCH", HttpStatus.BAD_REQUEST, message);
    }
}
