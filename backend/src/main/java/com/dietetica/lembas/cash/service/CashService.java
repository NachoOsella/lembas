package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashCloseRequest;
import com.dietetica.lembas.cash.dto.CashEntryDto;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
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
import com.dietetica.lembas.users.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
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
    static final String CODE_CASH_SESSION_ALREADY_CLOSED = "CASH_SESSION_ALREADY_CLOSED";
    static final String CODE_CASH_DIFFERENCE_REASON_REQUIRED = "CASH_DIFFERENCE_REASON_REQUIRED";

    private final CashSessionRepository cashSessionRepository;
    private final BranchRepository branchRepository;
    private final CashSessionMapper cashSessionMapper;
    private final CashMovementRepository cashMovementRepository;
    private final CashMovementMapper cashMovementMapper;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final CashCloseCalculator cashCloseCalculator;

    public CashService(
            CashSessionRepository cashSessionRepository,
            BranchRepository branchRepository,
            CashSessionMapper cashSessionMapper,
            CashMovementRepository cashMovementRepository,
            CashMovementMapper cashMovementMapper,
            PaymentRepository paymentRepository,
            UserRepository userRepository,
            CashCloseCalculator cashCloseCalculator
    ) {
        this.cashSessionRepository = cashSessionRepository;
        this.branchRepository = branchRepository;
        this.cashSessionMapper = cashSessionMapper;
        this.cashMovementRepository = cashMovementRepository;
        this.cashMovementMapper = cashMovementMapper;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.cashCloseCalculator = cashCloseCalculator;
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
        String combined = collectMessages(ex);
        if (combined == null) {
            return false;
        }
        return combined.contains("uk_cash_sessions_one_open_per_branch")
                || combined.contains("cash_sessions_branch_id_key");
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
        // Include every APPROVED payment regardless of method so the FE
        // timeline shows QR, transfers, card, etc. alongside cash. The
        // physical-cash calculations on top of this list keep filtering by
        // CASH; the table here is a chronological activity log.
        paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(
                sessionId, PaymentStatus.APPROVED
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
        // The currentUser comes from the security context as a detached entity; if
        // attached to the movement directly, Hibernate would attempt to merge it
        // (an extra UPDATE on the users row) which can race with concurrent updates
        // and surface as a misleading constraint violation. Re-load the user inside
        // this transaction so the FK is satisfied by a managed reference instead.
        movement.setCreatedByUser(userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new DomainException(
                        CODE_ACCESS_DENIED,
                        HttpStatus.FORBIDDEN,
                        "The authenticated user is no longer valid"
                )));
        movement.setType(request.type());
        movement.setMethod(request.method());
        movement.setAmount(request.amount());
        movement.setReason(request.reason().trim());

        return cashMovementMapper.toDto(cashMovementRepository.save(movement));
    }

    /**
     * Closes an OPEN cash session after the cashier reports the physical cash
     * counted in the drawer (S3-US08).
     *
     * <p>The expected cash is computed by {@link CashCloseCalculator} from the
     * session opening amount, its APPROVED payments grouped by method and the
     * manual movements registered during the session. The difference between
     * the counted and expected amounts is persisted along with the closing
     * user, timestamp and optional notes. When the difference is non-zero, a
     * non-blank {@code cashDifferenceReason} is mandatory; the session still
     * closes anyway, per the business rule.</p>
     *
     * @param sessionId   target session
     * @param request     close payload (counted amount, notes, reason)
     * @param currentUser authenticated user (must be internal)
     * @return the closed session as a DTO, including the entries timeline and
     *         the totals-by-method breakdown
     * @throws DomainException {@code CASH_SESSION_NOT_FOUND} when the id is unknown,
     *                         {@code CASH_SESSION_ALREADY_CLOSED} when already closed,
     *                         {@code CASH_DIFFERENCE_REASON_REQUIRED} when the
     *                         difference is non-zero and the reason is missing
     */
    @Transactional
    public CashSessionDto closeCashSession(Long sessionId, CashCloseRequest request, User currentUser) {
        ensureInternalUser(currentUser);

        // Defensive: counted cash is @PositiveOrZero at the DTO layer but the
        // service still treats null as an explicit error so the caller gets a
        // clear code rather than a NullPointerException later. Done before any
        // DB lookup so the request is short-circuited on bad input.
        if (request.countedCashAmount() == null) {
            throw new DomainException(
                    "VALIDATION_ERROR",
                    HttpStatus.BAD_REQUEST,
                    "countedCashAmount is required"
            );
        }

        CashSession session = cashSessionRepository.findById(sessionId)
                .orElseThrow(() -> new DomainException(
                        CODE_CASH_SESSION_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Cash session not found"
                ));

        if (session.getStatus() == CashSessionStatus.CLOSED) {
            throw new DomainException(
                    CODE_CASH_SESSION_ALREADY_CLOSED,
                    HttpStatus.CONFLICT,
                    "Cash session " + sessionId + " is already closed"
            );
        }

        // Re-load the closer inside the transaction so the FK is satisfied by a
        // managed reference (same defensive pattern as addMovement).
        User closer = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new DomainException(
                        CODE_ACCESS_DENIED,
                        HttpStatus.FORBIDDEN,
                        "The authenticated user is no longer valid"
                ));

        // Load the inputs the calculator needs. Manual movements are already
        // ordered by createdAt; payments are filtered to APPROVED so cancelled
        // and refunded ones never affect the drawer.
        List<CashMovement> movements = cashMovementRepository
                .findByCashSessionIdOrderByCreatedAtAsc(sessionId);
        List<Payment> approvedPayments = paymentRepository
                .findByCashSessionIdAndStatusOrderByIdAsc(sessionId, PaymentStatus.APPROVED);

        CashCloseCalculator.CashCloseResult calc = cashCloseCalculator
                .calculate(session, approvedPayments, movements);

        BigDecimal counted = request.countedCashAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal expected = calc.expectedCashAmount();
        BigDecimal difference = counted.subtract(expected).setScale(2, RoundingMode.HALF_UP);

        String normalizedReason = normalizeBlank(request.cashDifferenceReason());
        if (difference.signum() != 0 && (normalizedReason == null)) {
            throw new DomainException(
                    CODE_CASH_DIFFERENCE_REASON_REQUIRED,
                    HttpStatus.BAD_REQUEST,
                    "A non-zero cash difference requires a justification"
            );
        }

        // Persist the close metadata. The @PreUpdate hook refreshes updatedAt.
        session.setExpectedCashAmount(expected);
        session.setCountedCashAmount(counted);
        session.setCashDifferenceAmount(difference);
        session.setCashDifferenceReason(normalizedReason);
        session.setClosingNotes(normalizeBlank(request.closingNotes()));
        session.setClosedByUser(closer);
        session.setClosedAt(OffsetDateTime.now());
        session.setStatus(CashSessionStatus.CLOSED);

        CashSession saved = cashSessionRepository.save(session);

        // Build the response with the unified entries timeline plus the
        // totals-by-method breakdown for the close report.
        List<CashEntryDto> entries = buildUnifiedEntries(sessionId);
        return cashSessionMapper.toDto(saved, entries, calc.totalsByMethod());
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
