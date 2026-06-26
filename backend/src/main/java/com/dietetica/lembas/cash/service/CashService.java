package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Use cases for the cash register module.
 *
 * <p>Sprint 3 S3-US06 only implements the OPEN use case: opening a cash session
 * for a branch with a declared initial amount. Rules (see
 * {@code docs/02-domain/cash-register-rules.md}):</p>
 * <ul>
 *   <li>Any authorized internal employee (ADMIN, MANAGER, EMPLOYEE) can open.</li>
 *   <li>The branch is derived from the user for MANAGER/EMPLOYEE, and selected
 *       by the user for ADMIN (global, may have no assigned branch).</li>
 *   <li>Only one OPEN session per branch at a time; a duplicate open request
 *       raises {@code CASH_SESSION_ALREADY_OPEN}.</li>
 * </ul>
 */
@Service
public class CashService {

    /** Error codes used by the cash module; documented in {@code docs/05-api/error-handling.md}. */
    static final String CODE_CASH_SESSION_ALREADY_OPEN = "CASH_SESSION_ALREADY_OPEN";
    static final String CODE_CASH_SESSION_NOT_FOUND = "CASH_SESSION_NOT_FOUND";
    static final String CODE_CASH_BRANCH_REQUIRED = "CASH_BRANCH_REQUIRED";
    static final String CODE_INVALID_USER_BRANCH = "INVALID_USER_BRANCH";
    static final String CODE_BRANCH_NOT_FOUND = "BRANCH_NOT_FOUND";
    static final String CODE_ACCESS_DENIED = "ACCESS_DENIED";

    private final CashSessionRepository cashSessionRepository;
    private final BranchRepository branchRepository;
    private final CashSessionMapper cashSessionMapper;

    public CashService(
            CashSessionRepository cashSessionRepository,
            BranchRepository branchRepository,
            CashSessionMapper cashSessionMapper
    ) {
        this.cashSessionRepository = cashSessionRepository;
        this.branchRepository = branchRepository;
        this.cashSessionMapper = cashSessionMapper;
    }

    /**
     * Opens a new cash session for the resolved branch.
     *
     * @param request     the opening payload (amount and optional notes)
     * @param currentUser the authenticated user opening the session
     * @return the created session as a DTO
     * @throws DomainException with the appropriate code on rule violations
     */
    @Transactional
    public CashSessionDto openCashSession(OpenCashSessionRequest request, User currentUser) {
        ensureInternalUser(currentUser);
        Branch branch = resolveBranch(request, currentUser);

        if (cashSessionRepository.existsByBranchIdAndStatus(branch.getId(), CashSessionStatus.OPEN)) {
            throw new DomainException(
                    CODE_CASH_SESSION_ALREADY_OPEN,
                    HttpStatus.CONFLICT,
                    "A cash session is already open for branch " + branch.getId()
            );
        }

        CashSession session = new CashSession();
        session.setBranch(branch);
        session.setOpenedByUser(currentUser);
        session.setOpeningCashAmount(request.openingCashAmount());
        session.setOpeningNotes(normalizeBlank(request.openingNotes()));
        session.setStatus(CashSessionStatus.OPEN);

        // Re-derive status/timestamps are handled by @PrePersist; save returns the persisted entity.
        CashSession saved = cashSessionRepository.save(session);
        return cashSessionMapper.toDto(saved);
    }

    /**
     * Returns the OPEN session for a branch, or raises if none exists.
     *
     * @param branchId    target branch; for ADMIN this comes from the query string
     * @param currentUser the authenticated user
     * @return the open session as a DTO
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when no open session exists
     */
    @Transactional(readOnly = true)
    public CashSessionDto getCurrentSession(Long branchId, User currentUser) {
        ensureInternalUser(currentUser);
        Long resolvedBranchId = resolveBranchIdForCurrent(branchId, currentUser);
        Optional<CashSession> session = cashSessionRepository
                .findFirstByBranchIdAndStatusOrderByOpenedAtDesc(resolvedBranchId, CashSessionStatus.OPEN);
        return session.map(cashSessionMapper::toDto)
                .orElseThrow(() -> new DomainException(
                        CODE_CASH_SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "No open cash session for branch " + resolvedBranchId
                ));
    }

    /**
     * Returns a cash session by id.
     *
     * @param id the session id
     * @return the session as a DTO
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when the session does not exist
     */
    @Transactional(readOnly = true)
    public CashSessionDto getSessionById(Long id) {
        return cashSessionRepository.findById(id)
                .map(cashSessionMapper::toDto)
                .orElseThrow(() -> new DomainException(
                        CODE_CASH_SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Cash session not found"
                ));
    }

    /** Rejects customers from any cash endpoint. */
    private void ensureInternalUser(User user) {
        if (user == null || user.getRole() == Role.CUSTOMER) {
            throw new DomainException(CODE_ACCESS_DENIED, HttpStatus.FORBIDDEN, "Only internal users can manage cash");
        }
    }

    /**
     * Resolves the target branch for an open request.
     *
     * <p>ADMIN must supply {@code branchId}; MANAGER/EMPLOYEE ignore the field
     * and use their assigned branch.</p>
     */
    private Branch resolveBranch(OpenCashSessionRequest request, User user) {
        Long branchId;
        if (user.getRole() == Role.ADMIN) {
            if (request.branchId() == null) {
                throw new DomainException(
                        CODE_CASH_BRANCH_REQUIRED,
                        HttpStatus.BAD_REQUEST,
                        "ADMIN must select a branch to open a cash session"
                );
            }
            branchId = request.branchId();
        } else {
            branchId = user.getBranchId();
            if (branchId == null) {
                throw new DomainException(
                        CODE_INVALID_USER_BRANCH,
                        HttpStatus.BAD_REQUEST,
                        "User has no assigned branch"
                );
            }
        }
        return branchRepository.findById(branchId)
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException(
                        CODE_BRANCH_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Branch not found"
                ));
    }

    /** Resolves the branch id for current-session reads, mirroring the open resolution. */
    private Long resolveBranchIdForCurrent(Long requestedBranchId, User user) {
        if (user.getRole() == Role.ADMIN) {
            if (requestedBranchId == null) {
                throw new DomainException(
                        CODE_CASH_BRANCH_REQUIRED,
                        HttpStatus.BAD_REQUEST,
                        "ADMIN must select a branch to query the current cash session"
                );
            }
            return requestedBranchId;
        }
        if (user.getBranchId() == null) {
            throw new DomainException(
                    CODE_INVALID_USER_BRANCH,
                    HttpStatus.BAD_REQUEST,
                    "User has no assigned branch"
            );
        }
        return user.getBranchId();
    }

    private static String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}