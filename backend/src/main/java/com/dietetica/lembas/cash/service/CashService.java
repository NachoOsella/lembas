package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashEntryDto;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CreateCashMovementRequest;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
    static final String CODE_CASH_MOVEMENT_CLOSED_SESSION = "CASH_MOVEMENT_CLOSED_SESSION";

    private final CashSessionRepository cashSessionRepository;
    private final BranchRepository branchRepository;
    private final CashSessionMapper cashSessionMapper;
    private final CashMovementRepository cashMovementRepository;
    private final CashMovementMapper cashMovementMapper;
    private final PaymentRepository paymentRepository;

    public CashService(
            CashSessionRepository cashSessionRepository,
            BranchRepository branchRepository,
            CashSessionMapper cashSessionMapper,
            CashMovementRepository cashMovementRepository,
            CashMovementMapper cashMovementMapper,
            PaymentRepository paymentRepository
    ) {
        this.cashSessionRepository = cashSessionRepository;
        this.branchRepository = branchRepository;
        this.cashSessionMapper = cashSessionMapper;
        this.cashMovementRepository = cashMovementRepository;
        this.cashMovementMapper = cashMovementMapper;
        this.paymentRepository = paymentRepository;
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
        // The DB enforces "one open session per branch" via a partial unique index
        // (uk_cash_sessions_one_open_per_branch); a race between two requests that
        // both pass the in-memory check above would surface as a
        // DataIntegrityViolationException. Translate it into the same business error
        // the caller would have seen for the slow path.
        CashSession saved;
        try {
            saved = cashSessionRepository.save(session);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            if (isOneOpenPerBranchViolation(ex)) {
                throw new DomainException(
                        CODE_CASH_SESSION_ALREADY_OPEN,
                        HttpStatus.CONFLICT,
                        "A cash session is already open for branch " + branch.getId()
                );
            }
            throw ex;
        }
        return cashSessionMapper.toDto(saved);
    }

    /**
     * Detects whether the given {@link org.springframework.dao.DataIntegrityViolationException}
     * was caused by the partial unique index that enforces one OPEN session per branch.
     */
    private static boolean isOneOpenPerBranchViolation(
            org.springframework.dao.DataIntegrityViolationException ex
    ) {
        return matchesAnyMessage(ex, "uk_cash_sessions_one_open_per_branch", "cash_sessions_branch_id_key")
                || containsPair(ex, "duplicate key", "cash_sessions");
    }

    /**
     * Detects whether a {@link org.springframework.dao.DataIntegrityViolationException}
     * was caused by a missing {@code users(id)} foreign key on cash_movements.
     */
    private static boolean isMissingUserViolation(
            org.springframework.dao.DataIntegrityViolationException ex
    ) {
        return matchesAnyMessage(ex, "created_by_user_id", "fk_cash_movements_created_by_user");
    }

    /**
     * Walks the cause chain of {@code ex} and returns true if any of the listed
     * substrings appears in either the exception's own message or the message of
     * any of its causes. Necessary because the most-specific cause (the underlying
     * SQL exception) only carries the SQL state, not the constraint name.
     */
    private static boolean matchesAnyMessage(
            org.springframework.dao.DataIntegrityViolationException ex,
            String... needles
    ) {
        Throwable current = ex;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                for (String needle : needles) {
                    if (message.contains(needle)) {
                        return true;
                    }
                }
            }
            if (current.getCause() == current) {
                break;
            }
            current = current.getCause();
        }
        return false;
    }

    /** True when the cause chain contains both {@code a} and {@code b} substrings. */
    private static boolean containsPair(
            org.springframework.dao.DataIntegrityViolationException ex,
            String a,
            String b
    ) {
        String combined = collectMessages(ex);
        return combined != null && combined.toLowerCase().contains(a) && combined.toLowerCase().contains(b);
    }

    /** Concatenates every non-null message along the cause chain for substring search. */
    private static String collectMessages(Throwable ex) {
        StringBuilder sb = new StringBuilder();
        Throwable current = ex;
        while (current != null) {
            if (current.getMessage() != null) {
                sb.append(current.getMessage()).append('\n');
            }
            if (current.getCause() == current) {
                break;
            }
            current = current.getCause();
        }
        return sb.length() == 0 ? null : sb.toString();
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
     * Returns a cash session by id, including its manual movements.
     *
     * @param id the session id
     * @return the session as a DTO with movements included
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when the session does not exist
     */
    @Transactional(readOnly = true)
    public CashSessionDto getSessionById(Long id) {
        CashSession session = cashSessionRepository.findById(id)
                .orElseThrow(() -> new DomainException(
                        CODE_CASH_SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Cash session not found"
                ));
        List<CashEntryDto> entries = buildUnifiedEntries(id);
        return cashSessionMapper.toDto(session, entries);
    }

    /**
     * Combines the session's manual cash movements with APPROVED POS payments
     * that were settled in cash (the only payments that physically move the
     * drawer). Returns an empty list when neither source has anything to
     * report.
     *
     * <p>Sorted ascending by {@code occurredAt}; ties broken by id so the order
     * is stable across requests.</p>
     */
    private List<CashEntryDto> buildUnifiedEntries(Long sessionId) {
        List<CashEntryDto> entries = new ArrayList<>();
        cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(sessionId)
                .forEach(movement -> entries.add(toEntry(movement)));
        paymentRepository.findByCashSessionIdAndStatusAndMethodOrderByIdAsc(
                sessionId, PaymentStatus.APPROVED, PaymentMethod.CASH
        ).forEach(payment -> entries.add(toEntry(payment)));
        entries.sort(Comparator
                .comparing(CashEntryDto::occurredAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(CashEntryDto::id, Comparator.nullsLast(Comparator.naturalOrder())));
        return entries;
    }

    /** Adapts a manual movement to the unified entry shape. */
    private CashEntryDto toEntry(CashMovement movement) {
        String direction = switch (movement.getType()) {
            case CASH_IN -> "IN";
            case CASH_OUT -> "OUT";
            case ADJUSTMENT -> "NEUTRAL";
        };
        String method = movement.getMethod() == null ? null : movement.getMethod().name();
        String userName = userFullName(movement.getCreatedByUser());
        return new CashEntryDto(
                "MANUAL",
                movement.getId(),
                movement.getType().name(),
                method,
                direction,
                movement.getAmount(),
                movement.getReason(),
                userName,
                movement.getCreatedAt(),
                null
        );
    }

    /** Adapts an APPROVED CASH payment to the unified entry shape. */
    private CashEntryDto toEntry(Payment payment) {
        String orderNumber = payment.getOrder() == null ? null : payment.getOrder().getOrderNumber();
        String orderLabel = orderNumber == null ? "Sin pedido" : "Pedido #" + orderNumber;
        return new CashEntryDto(
                "PAYMENT",
                payment.getId(),
                "PAYMENT",
                payment.getMethod().name(),
                "IN",
                payment.getAmount(),
                orderNumber == null ? "Pago registrado" : "Pago " + orderLabel,
                orderLabel,
                payment.getApprovedAt() != null ? payment.getApprovedAt() : payment.getCreatedAt(),
                payment.getOrder() == null ? null : payment.getOrder().getId()
        );
    }

    private static String userFullName(User user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        return (first + " " + last).trim();
    }

    /**
     * Registers a manual cash movement in an OPEN session.
     *
     * @param sessionId   the target cash session id
     * @param request     the movement payload
     * @param currentUser the authenticated user
     * @return the created movement as a DTO
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when the session does not exist
     * @throws DomainException {@code CASH_MOVEMENT_CLOSED_SESSION} when the session is already closed
     */
    @Transactional
    public CashMovementDto addMovement(Long sessionId, CreateCashMovementRequest request, User currentUser) {
        ensureInternalUser(currentUser);
        CashSession session = cashSessionRepository.findById(sessionId)
                .orElseThrow(() -> new DomainException(
                        CODE_CASH_SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Cash session not found"
                ));

        if (session.getStatus() == CashSessionStatus.CLOSED) {
            throw new DomainException(
                    CODE_CASH_MOVEMENT_CLOSED_SESSION,
                    HttpStatus.BAD_REQUEST,
                    "Cannot add movements to a closed cash session"
            );
        }

        // amount != 0 is enforced by the DB CHECK; double-check at service level for early feedback.
        if (request.amount().compareTo(java.math.BigDecimal.ZERO) == 0) {
            throw new DomainException(
                    "VALIDATION_ERROR",
                    HttpStatus.BAD_REQUEST,
                    "Movement amount must be different from zero"
            );
        }

        CashMovement movement = new CashMovement();
        movement.setCashSession(session);
        movement.setCreatedByUser(currentUser);
        movement.setType(request.type());
        movement.setMethod(request.method());
        movement.setAmount(request.amount());
        movement.setReason(request.reason().trim());

        // Save the movement. If the user was deleted between the auth check and the
        // save, the FK on created_by_user_id raises a DataIntegrityViolationException
        // that the global handler maps to a generic 409. Re-raise as ACCESS_DENIED so
        // the UI can show a more meaningful message (the user lost mid-flight access).
        CashMovement saved;
        try {
            saved = cashMovementRepository.save(movement);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            if (isMissingUserViolation(ex)) {
                throw new DomainException(
                        CODE_ACCESS_DENIED,
                        HttpStatus.FORBIDDEN,
                        "The authenticated user is no longer valid for this operation"
                );
            }
            throw ex;
        }
        return cashMovementMapper.toDto(saved);
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
