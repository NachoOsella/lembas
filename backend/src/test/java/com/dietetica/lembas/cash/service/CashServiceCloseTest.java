package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashCloseRequest;
import com.dietetica.lembas.cash.dto.CashEntryDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the close use case (S3-US08).
 *
 * <p>Covers the rules documented in
 * {@code docs/02-domain/cash-register-rules.md}:</p>
 * <ul>
 *   <li>Only OPEN sessions can be closed; closing twice is rejected.</li>
 *   <li>Customer is forbidden.</li>
 *   <li>Non-zero difference requires a reason.</li>
 *   <li>Expected / counted / difference are persisted, status flips to CLOSED
 *       and the closer is recorded even when different from the opener.</li>
 *   <li>The response includes the entries timeline and the totals-by-method
 *       breakdown.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class CashServiceCloseTest {

    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionMapper cashSessionMapper;
    @Mock private PaymentRepository paymentRepository;
    @Mock private UserRepository userRepository;
    @Mock private CashCloseCalculator cashCloseCalculator;

    @InjectMocks private CashService cashService;

    @Test
    void closePersistsExpectedCountedDifferenceAndCloser() {
        User opener = user(Role.MANAGER, 1L, 1L);
        User closer = user(Role.EMPLOYEE, 2L, 1L);
        CashSession session = realOpenSession(1L, opener, new BigDecimal("100.00"));

        CashMovement cashIn = movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "200.00");
        Payment cashPayment = payment(PaymentMethod.CASH, "300.00");

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(cashIn));
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of(cashPayment));
        when(userRepository.findById(2L)).thenReturn(Optional.of(closer));
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> inv.getArgument(0));

        CashCloseCalculator.CashCloseResult calc = new CashCloseCalculator.CashCloseResult(
                new BigDecimal("100.00"),
                new BigDecimal("300.00"),
                new BigDecimal("200.00"),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                new BigDecimal("600.00"),
                new CashTotalsByMethodDto(java.util.Map.of(
                        "CASH", new BigDecimal("300.00"),
                        "TRANSFER", BigDecimal.ZERO
                ), java.util.Map.of("CASH", new BigDecimal("200.00")))
        );
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(calc);
        when(cashSessionMapper.toDto(any(CashSession.class), any(), any()))
                .thenReturn(new CashSessionDto(
                        1L, CashSessionStatus.CLOSED, 1L, "Branch 1",
                        1L, "Manager", new BigDecimal("100.00"), null, null,
                        new BigDecimal("600.00"), new BigDecimal("550.00"), new BigDecimal("-50.00"),
                        "Faltante por error de conteo", 2L, "Employee", null, null, null, null,
                        List.<CashEntryDto>of(), null
                ));

        CashCloseRequest request = new CashCloseRequest(
                new BigDecimal("550.00"), "Cierre OK", "Faltante por error de conteo"
        );

        CashSessionDto response = cashService.closeCashSession(1L, request, closer);

        // The mapper is called with the persisted session + entries + totals.
        ArgumentCaptor<CashSession> captor = ArgumentCaptor.forClass(CashSession.class);
        verify(cashSessionRepository).save(captor.capture());
        CashSession saved = captor.getValue();

        assertThat(saved.getStatus()).isEqualTo(CashSessionStatus.CLOSED);
        assertThat(saved.getClosedAt()).isNotNull();
        assertThat(saved.getClosedByUser()).isSameAs(closer);
        assertThat(saved.getCountedCashAmount()).isEqualByComparingTo("550.00");
        assertThat(saved.getExpectedCashAmount()).isEqualByComparingTo("600.00");
        assertThat(saved.getCashDifferenceAmount()).isEqualByComparingTo("-50.00");
        assertThat(saved.getCashDifferenceReason()).isEqualTo("Faltante por error de conteo");
        assertThat(saved.getClosingNotes()).isEqualTo("Cierre OK");
        assertThat(response.status()).isEqualTo(CashSessionStatus.CLOSED);
    }

    @Test
    void closeAllowsDifferentCloserThanOpener() {
        User opener = user(Role.MANAGER, 1L, 1L);
        User closer = user(Role.ADMIN, 99L, null);
        CashSession session = openSession(1L, opener, new BigDecimal("100.00"));

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of());
        when(userRepository.findById(99L)).thenReturn(Optional.of(closer));
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(emptyResult(new BigDecimal("100.00")));
        when(cashSessionMapper.toDto(any(CashSession.class), any(), any()))
                .thenReturn(new CashSessionDto(
                        1L, CashSessionStatus.CLOSED, 1L, "Branch 1",
                        1L, "Manager", new BigDecimal("100.00"), null, null,
                        new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO,
                        null, 99L, "Admin", null, null, null, null,
                        List.<CashEntryDto>of(), null
                ));

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, null);
        CashSessionDto response = cashService.closeCashSession(1L, request, closer);

        // Closer is the admin, opener remains the manager.
        assertThat(response.closedByUserId()).isEqualTo(99L);
        assertThat(response.openedByUserId()).isEqualTo(1L);
    }

    @Test
    void closeRejectsAlreadyClosedSession() {
        User closer = user(Role.MANAGER, 1L, 1L);
        CashSession session = openSession(1L, closer, new BigDecimal("100.00"));
        org.mockito.Mockito.lenient().when(session.getStatus()).thenReturn(CashSessionStatus.CLOSED);
        org.mockito.Mockito.lenient().when(session.getClosedAt()).thenReturn(java.time.OffsetDateTime.now());

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> cashService.closeCashSession(1L, request, closer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo(CashService.CODE_CASH_SESSION_ALREADY_CLOSED);
                    assertThat(de.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                });

        verify(cashSessionRepository, never()).save(any());
    }

    @Test
    void closeRejectsNonInternalUser() {
        User customer = user(Role.CUSTOMER, 7L, null);

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> cashService.closeCashSession(1L, request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo(CashService.CODE_ACCESS_DENIED);
                    assertThat(de.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                });

        verify(cashSessionRepository, never()).findById(any());
    }

    @Test
    void closeRaisesNotFoundWhenSessionMissing() {
        User closer = user(Role.MANAGER, 1L, 1L);
        when(cashSessionRepository.findById(404L)).thenReturn(Optional.empty());

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, null);

        assertThatThrownBy(() -> cashService.closeCashSession(404L, request, closer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo(CashService.CODE_CASH_SESSION_NOT_FOUND);
                    assertThat(de.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                });
    }

    @Test
    void closeRaisesReasonRequiredWhenDifferenceIsNonZeroWithoutReason() {
        User closer = user(Role.MANAGER, 1L, 1L);
        CashSession session = openSession(1L, closer, new BigDecimal("100.00"));

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(closer));
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(emptyResult(new BigDecimal("100.00")));

        // Counted != expected (100 vs 100 -> 0), no diff. Use 90 to create a difference.
        CashCloseRequest request = new CashCloseRequest(new BigDecimal("90.00"), null, null);

        assertThatThrownBy(() -> cashService.closeCashSession(1L, request, closer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo(CashService.CODE_CASH_DIFFERENCE_REASON_REQUIRED);
                    assertThat(de.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                });

        verify(cashSessionRepository, never()).save(any());
    }

    @Test
    void closeAllowsZeroDifferenceWithBlankReason() {
        User closer = user(Role.MANAGER, 1L, 1L);
        CashSession session = openSession(1L, closer, new BigDecimal("100.00"));

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(closer));
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(emptyResult(new BigDecimal("100.00")));
        when(cashSessionMapper.toDto(any(CashSession.class), any(), any()))
                .thenReturn(new CashSessionDto(
                        1L, CashSessionStatus.CLOSED, 1L, "Branch 1",
                        1L, "Manager", new BigDecimal("100.00"), null, null,
                        new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO,
                        null, 1L, "Manager", null, null, null, null,
                        List.<CashEntryDto>of(), null
                ));

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, "   ");

        CashSessionDto response = cashService.closeCashSession(1L, request, closer);

        assertThat(response.cashDifferenceAmount()).isEqualByComparingTo("0.00");
        // The blank reason is normalized to null on the entity.
        ArgumentCaptor<CashSession> captor = ArgumentCaptor.forClass(CashSession.class);
        verify(cashSessionRepository).save(captor.capture());
        assertThat(captor.getValue().getCashDifferenceReason()).isNull();
    }

    @Test
    void closeValidatesCountedNotNull() {
        User closer = user(Role.MANAGER, 1L, 1L);

        CashCloseRequest request = new CashCloseRequest(null, null, null);

        assertThatThrownBy(() -> cashService.closeCashSession(1L, request, closer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("VALIDATION_ERROR");
                    assertThat(de.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    void closeIncludesTotalsByMethodInResponse() {
        User closer = user(Role.MANAGER, 1L, 1L);
        CashSession session = openSession(1L, closer, new BigDecimal("0.00"));

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(closer));
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> inv.getArgument(0));

        CashTotalsByMethodDto totals = new CashTotalsByMethodDto(
                java.util.Map.of("CASH", new BigDecimal("100.00"), "QR", new BigDecimal("50.00")),
                java.util.Map.of("CASH", new BigDecimal("25.00"))
        );
        CashCloseCalculator.CashCloseResult calc = new CashCloseCalculator.CashCloseResult(
                BigDecimal.ZERO, new BigDecimal("100.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("100.00"), totals
        );
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(calc);
        when(cashSessionMapper.toDto(any(CashSession.class), any(), eq(totals)))
                .thenReturn(new CashSessionDto(
                        1L, CashSessionStatus.CLOSED, 1L, "Branch 1",
                        1L, "Manager", new BigDecimal("0.00"), null, null,
                        new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO,
                        null, 1L, "Manager", null, null, null, null,
                        List.<CashEntryDto>of(), totals
                ));

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), null, null);
        CashSessionDto response = cashService.closeCashSession(1L, request, closer);

        verify(cashSessionMapper).toDto(any(CashSession.class), any(), eq(totals));
        assertThat(response.totalsByMethod()).isNotNull();
        assertThat(response.totalsByMethod().paymentsByMethod())
                .containsEntry("CASH", new BigDecimal("100.00"))
                .containsEntry("QR", new BigDecimal("50.00"));
        assertThat(response.totalsByMethod().movementsByMethod())
                .containsEntry("CASH", new BigDecimal("25.00"));
    }

    @Test
    void closeNormalizesBlankClosingNotesAndReason() {
        User closer = user(Role.MANAGER, 1L, 1L);
        CashSession session = openSession(1L, closer, new BigDecimal("100.00"));

        when(cashSessionRepository.findById(1L)).thenReturn(Optional.of(session));
        when(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(1L, PaymentStatus.APPROVED))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(closer));
        when(cashSessionRepository.save(any(CashSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cashCloseCalculator.calculate(any(), any(), any())).thenReturn(emptyResult(new BigDecimal("100.00")));
        when(cashSessionMapper.toDto(any(CashSession.class), any(), any()))
                .thenReturn(new CashSessionDto(
                        1L, CashSessionStatus.CLOSED, 1L, "Branch 1",
                        1L, "Manager", new BigDecimal("100.00"), null, null,
                        new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO,
                        null, 1L, "Manager", null, null, null, null,
                        List.<CashEntryDto>of(), null
                ));

        CashCloseRequest request = new CashCloseRequest(new BigDecimal("100.00"), "  ", "   ");

        cashService.closeCashSession(1L, request, closer);

        ArgumentCaptor<CashSession> captor = ArgumentCaptor.forClass(CashSession.class);
        verify(cashSessionRepository).save(captor.capture());
        CashSession saved = captor.getValue();
        assertThat(saved.getClosingNotes()).isNull();
        assertThat(saved.getCashDifferenceReason()).isNull();
    }

    // ---- helpers ----

    private static User user(Role role, long id, Long branchId) {
        User user = org.mockito.Mockito.mock(User.class);
        org.mockito.Mockito.lenient().when(user.getRole()).thenReturn(role);
        org.mockito.Mockito.lenient().when(user.getId()).thenReturn(id);
        org.mockito.Mockito.lenient().when(user.getBranchId()).thenReturn(branchId);
        org.mockito.Mockito.lenient().when(user.getFirstName()).thenReturn(role.name());
        org.mockito.Mockito.lenient().when(user.getLastName()).thenReturn("User");
        return user;
    }

    private static CashSession openSession(long id, User opener, java.math.BigDecimal opening) {
        CashSession session = org.mockito.Mockito.mock(CashSession.class);
        org.mockito.Mockito.lenient().when(session.getId()).thenReturn(id);
        org.mockito.Mockito.lenient().when(session.getStatus()).thenReturn(CashSessionStatus.OPEN);
        org.mockito.Mockito.lenient().when(session.getOpeningCashAmount()).thenReturn(opening);
        org.mockito.Mockito.lenient().when(session.getOpenedByUser()).thenReturn(opener);
        Branch branch = org.mockito.Mockito.mock(Branch.class);
        org.mockito.Mockito.lenient().when(branch.getId()).thenReturn(1L);
        org.mockito.Mockito.lenient().when(branch.getName()).thenReturn("Branch 1");
        org.mockito.Mockito.lenient().when(session.getBranch()).thenReturn(branch);
        return session;
    }

    /**
     * Real (non-mocked) cash session so we can inspect the entity state after
     * the service mutates it via setters.
     */
    private static CashSession realOpenSession(long id, User opener, java.math.BigDecimal opening) {
        Branch branch = org.mockito.Mockito.mock(Branch.class);
        org.mockito.Mockito.lenient().when(branch.getId()).thenReturn(1L);
        org.mockito.Mockito.lenient().when(branch.getName()).thenReturn("Branch 1");
        CashSession session = new CashSession();
        session.setId(id);
        session.setBranch(branch);
        session.setOpenedByUser(opener);
        session.setOpeningCashAmount(opening);
        session.setStatus(CashSessionStatus.OPEN);
        return session;
    }

    private static CashMovement movement(CashMovementType type, CashMovementMethod method, String amount) {
        CashMovement movement = org.mockito.Mockito.mock(CashMovement.class);
        org.mockito.Mockito.lenient().when(movement.getType()).thenReturn(type);
        org.mockito.Mockito.lenient().when(movement.getMethod()).thenReturn(method);
        org.mockito.Mockito.lenient().when(movement.getAmount()).thenReturn(new BigDecimal(amount));
        org.mockito.Mockito.lenient().when(movement.getId()).thenReturn(0L);
        org.mockito.Mockito.lenient().when(movement.getCreatedByUser()).thenReturn(null);
        org.mockito.Mockito.lenient().when(movement.getCreatedAt()).thenReturn(java.time.OffsetDateTime.now());
        org.mockito.Mockito.lenient().when(movement.getReason()).thenReturn("test");
        return movement;
    }

    private static Payment payment(PaymentMethod method, String amount) {
        Payment payment = org.mockito.Mockito.mock(Payment.class);
        org.mockito.Mockito.lenient().when(payment.getMethod()).thenReturn(method);
        org.mockito.Mockito.lenient().when(payment.getAmount()).thenReturn(new BigDecimal(amount));
        return payment;
    }

    private static CashCloseCalculator.CashCloseResult emptyResult(java.math.BigDecimal expected) {
        return new CashCloseCalculator.CashCloseResult(
                expected, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                expected, CashTotalsByMethodDto.empty()
        );
    }
}
