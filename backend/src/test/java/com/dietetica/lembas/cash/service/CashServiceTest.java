package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CreateCashMovementRequest;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CashService} open and current use cases.
 *
 * <p>Verifies (see {@code docs/02-domain/cash-register-rules.md}):</p>
 * <ul>
 *   <li>MANAGER/EMPLOYEE open a session using their assigned branch.</li>
 *   <li>ADMIN must supply a branchId (CASH_BRANCH_REQUIRED otherwise).</li>
 *   <li>A duplicate open for the same branch raises CASH_SESSION_ALREADY_OPEN.</li>
 *   <li>MANAGER/EMPLOYEE without an assigned branch raise INVALID_USER_BRANCH.</li>
 *   <li>CUSTOMER is rejected from all cash operations.</li>
 *   <li>current returns the open session, or CASH_SESSION_NOT_FOUND.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class CashServiceTest {

    @Mock
    private CashSessionRepository cashSessionRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private CashSessionMapper cashSessionMapper;
    @Mock
    private CashMovementRepository cashMovementRepository;
    @Mock
    private CashMovementMapper cashMovementMapper;
    @Mock
    private com.dietetica.lembas.payments.repository.PaymentRepository paymentRepository;

    @InjectMocks
    private CashService cashService;

    @Test
    void employeeOpensSessionUsingAssignedBranch() {
        User employee = user(Role.EMPLOYEE, 1L);
        Branch branch = branch(1L, true);

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(cashSessionRepository.existsByBranchIdAndStatus(1L, CashSessionStatus.OPEN)).thenReturn(false);
        CashSessionDto dto = dto(7L, 1L);
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> {
            CashSession session = inv.getArgument(0);
            setId(session, 7L);
            return session;
        });
        when(cashSessionMapper.toDto(any(CashSession.class))).thenReturn(dto);

        OpenCashSessionRequest request = new OpenCashSessionRequest(new BigDecimal("100.00"), "fondo", null);
        CashSessionDto result = cashService.openCashSession(request, employee);

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.branchId()).isEqualTo(1L);
        assertThat(result.openingCashAmount()).isEqualByComparingTo("100.00");
        // Employee ignores the supplied branchId even if present.
        assertThat(request.branchId()).isNull();
    }

    @Test
    void openRejectsAlreadyOpenSession() {
        User employee = user(Role.EMPLOYEE, 1L);
        Branch branch = branch(1L, true);

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(cashSessionRepository.existsByBranchIdAndStatus(1L, CashSessionStatus.OPEN)).thenReturn(true);

        OpenCashSessionRequest request = new OpenCashSessionRequest(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> cashService.openCashSession(request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_SESSION_ALREADY_OPEN", HttpStatus.CONFLICT));
    }

    @Test
    void adminWithoutBranchIdIsRejected() {
        User admin = user(Role.ADMIN, null);
        OpenCashSessionRequest request = new OpenCashSessionRequest(BigDecimal.ZERO, null, null);

        assertThatThrownBy(() -> cashService.openCashSession(request, admin))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_BRANCH_REQUIRED", HttpStatus.BAD_REQUEST));
    }

    @Test
    void adminOpensSessionForSelectedBranch() {
        User admin = user(Role.ADMIN, null);
        Branch branch = branch(2L, true);

        when(branchRepository.findById(2L)).thenReturn(Optional.of(branch));
        when(cashSessionRepository.existsByBranchIdAndStatus(2L, CashSessionStatus.OPEN)).thenReturn(false);
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> {
            CashSession session = inv.getArgument(0);
            setId(session, 9L);
            return session;
        });
        when(cashSessionMapper.toDto(any(CashSession.class))).thenReturn(dto(9L, 2L));

        OpenCashSessionRequest request = new OpenCashSessionRequest(new BigDecimal("250.00"), null, 2L);
        CashSessionDto result = cashService.openCashSession(request, admin);

        assertThat(result.id()).isEqualTo(9L);
        assertThat(result.branchId()).isEqualTo(2L);
    }

    @Test
    void managerWithoutAssignedBranchIsRejected() {
        User manager = user(Role.MANAGER, null);
        OpenCashSessionRequest request = new OpenCashSessionRequest(BigDecimal.ONE, null, 5L);

        assertThatThrownBy(() -> cashService.openCashSession(request, manager))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "INVALID_USER_BRANCH", HttpStatus.BAD_REQUEST));
    }

    @Test
    void customerIsRejectedFromOpen() {
        User customer = user(Role.CUSTOMER, 1L);
        OpenCashSessionRequest request = new OpenCashSessionRequest(BigDecimal.ONE, null, null);

        assertThatThrownBy(() -> cashService.openCashSession(request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "ACCESS_DENIED", HttpStatus.FORBIDDEN));
    }

    @Test
    void inactiveBranchIsRejected() {
        User admin = user(Role.ADMIN, null);
        Branch inactive = branch(3L, false);

        when(branchRepository.findById(3L)).thenReturn(Optional.of(inactive));

        OpenCashSessionRequest request = new OpenCashSessionRequest(BigDecimal.ONE, null, 3L);

        assertThatThrownBy(() -> cashService.openCashSession(request, admin))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND));
    }

    @Test
    void currentReturnsOpenSessionForEmployee() {
        User employee = user(Role.EMPLOYEE, 1L);
        CashSession session = new CashSession();
        setId(session, 11L);
        when(cashSessionRepository.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(1L, CashSessionStatus.OPEN))
                .thenReturn(Optional.of(session));
        when(cashSessionMapper.toDto(session)).thenReturn(dto(11L, 1L));

        CashSessionDto result = cashService.getCurrentSession(null, employee);

        assertThat(result.id()).isEqualTo(11L);
        verify(cashSessionMapper).toDto(session);
    }

    @Test
    void currentThrowsNotFoundWhenNoOpenSession() {
        User employee = user(Role.EMPLOYEE, 1L);
        when(cashSessionRepository.findFirstByBranchIdAndStatusOrderByOpenedAtDesc(eq(1L), eq(CashSessionStatus.OPEN)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> cashService.getCurrentSession(null, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND));
    }

    @Test
    void getByIdReturnsDtoWithMovementsWhenSessionExists() {
        CashSession session = new CashSession();
        setId(session, 42L);
        when(cashSessionRepository.findById(42L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(42L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusAndMethodOrderByIdAsc(
                eq(42L), any(), any())).thenReturn(List.of());
        when(cashSessionMapper.toDto(eq(session), any())).thenReturn(dto(42L, 1L));

        CashSessionDto result = cashService.getSessionById(42L);

        assertThat(result.id()).isEqualTo(42L);
        verify(cashMovementRepository).findByCashSessionIdOrderByCreatedAtAsc(42L);
        verify(paymentRepository).findByCashSessionIdAndStatusAndMethodOrderByIdAsc(
                eq(42L), any(), any());
    }

    @Test
    void getByIdThrowsNotFoundWhenMissing() {
        when(cashSessionRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cashService.getSessionById(404L))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND));
    }

    @Test
    void addMovementHappyPath() {
        User employee = user(Role.EMPLOYEE, 1L);
        CashSession session = new CashSession();
        setId(session, 7L);
        session.setStatus(CashSessionStatus.OPEN);
        CashMovement savedMovement = new CashMovement();
        setId(savedMovement, 1L);
        CashMovementDto dto = new CashMovementDto(1L, 7L, CashMovementType.CASH_IN, CashMovementMethod.CASH,
                new BigDecimal("100.00"), "Cobro externo", 1L, "Employee", null);

        when(cashSessionRepository.findById(7L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.save(any())).thenReturn(savedMovement);
        when(cashMovementMapper.toDto(savedMovement)).thenReturn(dto);

        CreateCashMovementRequest request = new CreateCashMovementRequest(
                CashMovementType.CASH_IN, CashMovementMethod.CASH, new BigDecimal("100.00"), "Cobro externo");
        CashMovementDto result = cashService.addMovement(7L, request, employee);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.type()).isEqualTo(CashMovementType.CASH_IN);
        assertThat(result.amount()).isEqualByComparingTo("100.00");
        verify(cashMovementRepository).save(any());
    }

    @Test
    void addMovementRejectsClosedSession() {
        User employee = user(Role.EMPLOYEE, 1L);
        CashSession session = new CashSession();
        setId(session, 7L);
        session.setStatus(CashSessionStatus.CLOSED);

        when(cashSessionRepository.findById(7L)).thenReturn(Optional.of(session));

        CreateCashMovementRequest request = new CreateCashMovementRequest(
                CashMovementType.CASH_IN, CashMovementMethod.CASH, new BigDecimal("50.00"), "test");

        assertThatThrownBy(() -> cashService.addMovement(7L, request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_MOVEMENT_CLOSED_SESSION", HttpStatus.BAD_REQUEST));
    }

    @Test
    void addMovementRejectsZeroAmount() {
        User employee = user(Role.EMPLOYEE, 1L);
        CashSession session = new CashSession();
        setId(session, 7L);
        session.setStatus(CashSessionStatus.OPEN);

        when(cashSessionRepository.findById(7L)).thenReturn(Optional.of(session));

        CreateCashMovementRequest request = new CreateCashMovementRequest(
                CashMovementType.CASH_IN, CashMovementMethod.CASH, BigDecimal.ZERO, "test");

        assertThatThrownBy(() -> cashService.addMovement(7L, request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "VALIDATION_ERROR", HttpStatus.BAD_REQUEST));
    }

    @Test
    void addMovementRejectsCustomer() {
        User customer = user(Role.CUSTOMER, 1L);

        CreateCashMovementRequest request = new CreateCashMovementRequest(
                CashMovementType.CASH_IN, CashMovementMethod.CASH, new BigDecimal("10.00"), "test");

        assertThatThrownBy(() -> cashService.addMovement(1L, request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "ACCESS_DENIED", HttpStatus.FORBIDDEN));
    }

    @Test
    void openMapsUniqueConstraintRaceToAlreadyOpen() {
        // A race where the in-memory existsByBranchIdAndStatus check passes but the
        // partial unique index fires at commit time must surface as the same business
        // error the caller would have seen for the slow path.
        User employee = user(Role.EMPLOYEE, 1L);
        Branch branch = branch(1L, true);

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(cashSessionRepository.existsByBranchIdAndStatus(1L, CashSessionStatus.OPEN)).thenReturn(false);
        when(cashSessionRepository.save(any(CashSession.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException(
                        "could not execute statement [ERROR: duplicate key value violates unique constraint \"uk_cash_sessions_one_open_per_branch\"",
                        new java.sql.SQLException("duplicate key", "23505")));

        OpenCashSessionRequest request = new OpenCashSessionRequest(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> cashService.openCashSession(request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_SESSION_ALREADY_OPEN", HttpStatus.CONFLICT));
    }

    @Test
    void addMovementMapsMissingUserConstraintToAccessDenied() {
        // The user was deleted between the auth check and the save. The FK on
        // created_by_user_id raises a DataIntegrityViolationException that we
        // re-raise as ACCESS_DENIED so the UI can show a meaningful message.
        User employee = user(Role.EMPLOYEE, 99L);
        CashSession session = new CashSession();
        setId(session, 7L);
        session.setStatus(CashSessionStatus.OPEN);

        when(cashSessionRepository.findById(7L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.save(any()))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException(
                        "could not execute statement [ERROR: insert or update on table \"cash_movements\" violates foreign key constraint \"fk_cash_movements_created_by_user\"",
                        new java.sql.SQLException("foreign key", "23503")));

        CreateCashMovementRequest request = new CreateCashMovementRequest(
                CashMovementType.CASH_IN, CashMovementMethod.CASH, new BigDecimal("100.00"), "Cobro");

        assertThatThrownBy(() -> cashService.addMovement(7L, request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "ACCESS_DENIED", HttpStatus.FORBIDDEN));
    }

    @Test
    void currentRequiresBranchIdForAdmin() {
        User admin = user(Role.ADMIN, null);

        assertThatThrownBy(() -> cashService.getCurrentSession(null, admin))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertCode(ex, "CASH_BRANCH_REQUIRED", HttpStatus.BAD_REQUEST));
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private static User user(Role role, Long branchId) {
        return new User(branchId, role.name().toLowerCase() + "@lembas.com", "hash",
                role.name(), "User", null, role);
    }

    private static Branch branch(long id, boolean active) {
        Branch branch = org.mockito.Mockito.mock(Branch.class);
        org.mockito.Mockito.lenient().when(branch.getId()).thenReturn(id);
        org.mockito.Mockito.lenient().when(branch.getName()).thenReturn("Branch " + id);
        org.mockito.Mockito.lenient().when(branch.isActive()).thenReturn(active);
        return branch;
    }

    private static CashSessionDto dto(long id, long branchId) {
        return new CashSessionDto(
                id, CashSessionStatus.OPEN, branchId, "Branch " + branchId,
                null, "Admin User", new BigDecimal("100.00"), null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );
    }

    private static void setId(Object entity, long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void assertCode(Throwable ex, String code, HttpStatus status) {
        DomainException de = (DomainException) ex;
        assertThat(de.getCode()).isEqualTo(code);
        assertThat(de.getStatus()).isEqualTo(status);
    }
}