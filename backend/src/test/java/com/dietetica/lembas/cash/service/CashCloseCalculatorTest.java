package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CashCloseCalculator} covering every branch of the
 * expected-cash rule and the totals-by-method grouping.
 *
 * <p>These tests do not touch Spring or the database; they exercise the pure
 * calculation contract of the calculator. The service-level close use case is
 * tested separately in {@code CashServiceCloseTest}.</p>
 */
class CashCloseCalculatorTest {

    private final CashCloseCalculator calculator = new CashCloseCalculator();

    @Test
    void expectedCashEqualsOpeningWhenNoPaymentsOrMovements() {
        CashSession session = sessionWithOpening(new BigDecimal("500.00"));
        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), List.of());

        assertThat(result.openingCashAmount()).isEqualByComparingTo("500.00");
        assertThat(result.totalPaymentsCash()).isEqualByComparingTo("0.00");
        assertThat(result.totalMovementsIn()).isEqualByComparingTo("0.00");
        assertThat(result.totalMovementsOut()).isEqualByComparingTo("0.00");
        assertThat(result.totalMovementsAdjustment()).isEqualByComparingTo("0.00");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("500.00");
        assertThat(result.totalsByMethod().paymentsByMethod()).isEmpty();
        assertThat(result.totalsByMethod().movementsByMethod()).isEmpty();
    }

    @Test
    void expectedCashSumsCashPayments() {
        CashSession session = sessionWithOpening(new BigDecimal("100.00"));
        List<Payment> payments = List.of(
                payment(PaymentMethod.CASH, new BigDecimal("150.00")),
                payment(PaymentMethod.QR, new BigDecimal("80.00")),
                payment(PaymentMethod.CASH, new BigDecimal("50.00"))
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, payments, List.of());

        assertThat(result.totalPaymentsCash()).isEqualByComparingTo("200.00");
        // QR payments do not affect expected cash.
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("300.00");
        // Totals-by-method includes both CASH and QR.
        assertThat(result.totalsByMethod().paymentsByMethod())
                .containsEntry("CASH", new BigDecimal("200.00"))
                .containsEntry("QR", new BigDecimal("80.00"));
    }

    @Test
    void expectedCashSumsCASHInAndSubtractsCASHOut() {
        CashSession session = sessionWithOpening(new BigDecimal("100.00"));
        List<CashMovement> movements = List.of(
                movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "200.00"),
                movement(CashMovementType.CASH_OUT, CashMovementMethod.CASH, "50.00")
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), movements);

        assertThat(result.totalMovementsIn()).isEqualByComparingTo("200.00");
        assertThat(result.totalMovementsOut()).isEqualByComparingTo("50.00");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("250.00");
    }

    @Test
    void expectedCashAddsCashAdjustmentsSigned() {
        CashSession session = sessionWithOpening(new BigDecimal("100.00"));
        List<CashMovement> movements = List.of(
                // Positive adjustment adds to expected.
                movement(CashMovementType.ADJUSTMENT, CashMovementMethod.CASH, "20.00"),
                // Negative adjustment subtracts from expected.
                movement(CashMovementType.ADJUSTMENT, CashMovementMethod.CASH, "-30.00")
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), movements);

        assertThat(result.totalMovementsAdjustment()).isEqualByComparingTo("-10.00");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("90.00");
    }

    @Test
    void expectedCashIgnoresNonCashMethodsForMovements() {
        CashSession session = sessionWithOpening(new BigDecimal("100.00"));
        List<CashMovement> movements = List.of(
                movement(CashMovementType.CASH_IN, CashMovementMethod.TRANSFER, "500.00"),
                movement(CashMovementType.CASH_OUT, CashMovementMethod.OTHER, "300.00"),
                movement(CashMovementType.ADJUSTMENT, CashMovementMethod.TRANSFER, "100.00")
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), movements);

        // None of these affect expected cash.
        assertThat(result.totalMovementsIn()).isEqualByComparingTo("0.00");
        assertThat(result.totalMovementsOut()).isEqualByComparingTo("0.00");
        assertThat(result.totalMovementsAdjustment()).isEqualByComparingTo("0.00");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("100.00");
        // But they DO show up in the informational totals-by-method.
        assertThat(result.totalsByMethod().movementsByMethod())
                .containsEntry("TRANSFER", new BigDecimal("600.00")) // 500 + 100 abs
                .containsEntry("OTHER", new BigDecimal("300.00"));
    }

    @Test
    void expectedCashIgnoresNonCashPayments() {
        CashSession session = sessionWithOpening(new BigDecimal("100.00"));
        List<Payment> payments = List.of(
                payment(PaymentMethod.QR, new BigDecimal("250.00")),
                payment(PaymentMethod.TRANSFER, new BigDecimal("400.00")),
                payment(PaymentMethod.DEBIT_CARD, new BigDecimal("150.00")),
                payment(PaymentMethod.CREDIT_CARD, new BigDecimal("200.00"))
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, payments, List.of());

        assertThat(result.totalPaymentsCash()).isEqualByComparingTo("0.00");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("100.00");
        // Informational totals still include them.
        assertThat(result.totalsByMethod().paymentsByMethod())
                .containsEntry("QR", new BigDecimal("250.00"))
                .containsEntry("TRANSFER", new BigDecimal("400.00"))
                .containsEntry("DEBIT_CARD", new BigDecimal("150.00"))
                .containsEntry("CREDIT_CARD", new BigDecimal("200.00"));
    }

    @Test
    void totalsByMethodGroupsAllApprovedPaymentMethods() {
        CashSession session = sessionWithOpening(new BigDecimal("0.00"));
        List<Payment> payments = List.of(
                payment(PaymentMethod.CASH, new BigDecimal("100.00")),
                payment(PaymentMethod.CASH, new BigDecimal("50.00")),
                payment(PaymentMethod.QR, new BigDecimal("80.00")),
                payment(PaymentMethod.TRANSFER, new BigDecimal("70.00"))
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, payments, List.of());

        assertThat(result.totalsByMethod().paymentsByMethod())
                .containsEntry("CASH", new BigDecimal("150.00"))
                .containsEntry("QR", new BigDecimal("80.00"))
                .containsEntry("TRANSFER", new BigDecimal("70.00"))
                .hasSize(3);
    }

    @Test
    void totalsByMethodGroupsAllMovementMethodsWithAbsAmount() {
        CashSession session = sessionWithOpening(new BigDecimal("0.00"));
        List<CashMovement> movements = List.of(
                movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "100.00"),
                movement(CashMovementType.CASH_OUT, CashMovementMethod.CASH, "-40.00"),
                movement(CashMovementType.CASH_IN, CashMovementMethod.TRANSFER, "60.00"),
                movement(CashMovementType.ADJUSTMENT, CashMovementMethod.OTHER, "-25.00")
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), movements);

        assertThat(result.totalsByMethod().movementsByMethod())
                .containsEntry("CASH", new BigDecimal("140.00"))     // 100 + 40
                .containsEntry("TRANSFER", new BigDecimal("60.00"))
                .containsEntry("OTHER", new BigDecimal("25.00"))
                .hasSize(3);
    }

    @Test
    void totalsByMethodIsEmptyWhenNoData() {
        CashSession session = sessionWithOpening(new BigDecimal("0.00"));
        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, List.of(), List.of());

        CashTotalsByMethodDto totals = result.totalsByMethod();
        assertThat(totals).isNotNull();
        assertThat(totals.paymentsByMethod()).isEmpty();
        assertThat(totals.movementsByMethod()).isEmpty();
    }

    @Test
    void decimalsAreRoundedHalfUpToTwoPlaces() {
        CashSession session = sessionWithOpening(new BigDecimal("100.005"));
        // 100.005 rounds to 100.01 with HALF_UP.
        List<Payment> payments = List.of(
                payment(PaymentMethod.CASH, new BigDecimal("50.005"))
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, payments, List.of());

        assertThat(result.openingCashAmount()).isEqualByComparingTo("100.01");
        assertThat(result.totalPaymentsCash()).isEqualByComparingTo("50.01");
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("150.02");
    }

    @Test
    void fullScenarioCombinesAllRules() {
        CashSession session = sessionWithOpening(new BigDecimal("1000.00"));
        List<Payment> payments = List.of(
                payment(PaymentMethod.CASH, new BigDecimal("500.00")),
                payment(PaymentMethod.QR, new BigDecimal("300.00")),
                payment(PaymentMethod.TRANSFER, new BigDecimal("200.00"))
        );
        List<CashMovement> movements = List.of(
                movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "150.00"),
                movement(CashMovementType.CASH_OUT, CashMovementMethod.CASH, "50.00"),
                movement(CashMovementType.ADJUSTMENT, CashMovementMethod.CASH, "10.00"),
                movement(CashMovementType.CASH_IN, CashMovementMethod.TRANSFER, "75.00")
        );

        CashCloseCalculator.CashCloseResult result = calculator.calculate(session, payments, movements);

        // expected = 1000 + 500 (CASH pmts) + 150 (CASH_IN) - 50 (CASH_OUT) + 10 (ADJ)
        assertThat(result.expectedCashAmount()).isEqualByComparingTo("1610.00");

        assertThat(result.totalsByMethod().paymentsByMethod())
                .containsEntry("CASH", new BigDecimal("500.00"))
                .containsEntry("QR", new BigDecimal("300.00"))
                .containsEntry("TRANSFER", new BigDecimal("200.00"));
        assertThat(result.totalsByMethod().movementsByMethod())
                .containsEntry("CASH", new BigDecimal("210.00"))   // 150 + 50 + 10
                .containsEntry("TRANSFER", new BigDecimal("75.00"));
    }

    // ---- helpers ----

    private static CashSession sessionWithOpening(BigDecimal opening) {
        CashSession session = mock(CashSession.class);
        when(session.getOpeningCashAmount()).thenReturn(opening);
        return session;
    }

    private static Payment payment(PaymentMethod method, BigDecimal amount) {
        Payment payment = mock(Payment.class);
        when(payment.getMethod()).thenReturn(method);
        when(payment.getAmount()).thenReturn(amount);
        return payment;
    }

    private static CashMovement movement(CashMovementType type, CashMovementMethod method, String amount) {
        CashMovement movement = mock(CashMovement.class);
        when(movement.getType()).thenReturn(type);
        when(movement.getMethod()).thenReturn(method);
        when(movement.getAmount()).thenReturn(new BigDecimal(amount));
        return movement;
    }
}
