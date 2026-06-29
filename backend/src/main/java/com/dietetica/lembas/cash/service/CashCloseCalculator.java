package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Stateless calculator that turns a {@link CashSession} plus its associated
 * APPROVED payments and manual movements into a complete close calculation
 * (S3-US08).
 *
 * <p>Responsibilities:</p>
 * <ul>
 *   <li>Compute {@code expectedCashAmount} following
 *       {@code docs/02-domain/cash-register-rules.md} (Closing section):
 *       {@code opening + sum(CASH payments APPROVED) + sum(CASH_IN CASH
 *       movements) - sum(CASH_OUT CASH movements) + sum(ADJUSTMENT CASH
 *       movements)}.</li>
 *   <li>Group payments by {@link PaymentMethod} for the informational
 *       "totals by method" report.</li>
 *   <li>Group manual movements by {@link CashMovementMethod} (absolute
 *       amount) for the same report.</li>
 *   <li>Never touch the database: persistence is the service's job.</li>
 *   <li>Never throw on data shape: callers must pre-filter the inputs. The
 *       calculator assumes {@code payments} are already APPROVED and
 *       {@code movements} belong to {@code session}.</li>
 * </ul>
 *
 * <p>All amounts are returned with scale 2 and {@link RoundingMode#HALF_UP}
 * to match the entity column constraints ({@code DECIMAL(12, 2)}).</p>
 */
@Component
class CashCloseCalculator {

    /** Rounding context used for every monetary output. */
    private static final int MONEY_SCALE = 2;

    /**
     * Result of the close calculation. All amounts are non-null; the opening
     * amount and the four movement/payment subtotals are always populated
     * (possibly zero) and the {@code expectedCashAmount} follows the rule
     * documented in {@code docs/02-domain/cash-register-rules.md}.
     */
    record CashCloseResult(
            BigDecimal openingCashAmount,
            BigDecimal totalPaymentsCash,
            BigDecimal totalMovementsIn,
            BigDecimal totalMovementsOut,
            BigDecimal totalMovementsAdjustment,
            BigDecimal expectedCashAmount,
            CashTotalsByMethodDto totalsByMethod
    ) {
    }

    /**
     * Computes the close result from the given inputs.
     *
     * @param session          the session being closed (its opening amount is used)
     * @param approvedPayments payments already filtered to {@link PaymentStatus#APPROVED}
     *                         and known to belong to {@code session}
     * @param manualMovements  manual cash movements already filtered to this session
     * @return an immutable calculation result
     */
    CashCloseResult calculate(
            CashSession session,
            List<Payment> approvedPayments,
            List<CashMovement> manualMovements
    ) {
        Objects.requireNonNull(session, "session");
        BigDecimal opening = scale(session.getOpeningCashAmount());

        // ----- Payments -----
        BigDecimal totalPaymentsCash = BigDecimal.ZERO;
        Map<String, BigDecimal> paymentsByMethod = new java.util.LinkedHashMap<>();
        for (Payment payment : approvedPayments) {
            PaymentMethod method = payment.getMethod();
            BigDecimal amount = scale(payment.getAmount());
            paymentsByMethod.merge(method.name(), amount, BigDecimal::add);
            if (method == PaymentMethod.CASH) {
                totalPaymentsCash = totalPaymentsCash.add(amount);
            }
        }

        // ----- Manual movements -----
        BigDecimal totalIn = BigDecimal.ZERO;
        BigDecimal totalOut = BigDecimal.ZERO;
        BigDecimal totalAdjustment = BigDecimal.ZERO;
        Map<String, BigDecimal> movementsByMethod = new java.util.LinkedHashMap<>();
        for (CashMovement movement : manualMovements) {
            CashMovementType type = movement.getType();
            CashMovementMethod method = movement.getMethod();
            BigDecimal absAmount = scale(movement.getAmount()).abs();
            // For the "by method" report we always use the absolute amount.
            movementsByMethod.merge(method.name(), absAmount, BigDecimal::add);

            // For the expected cash only CASH-method movements count (per docs).
            if (method == CashMovementMethod.CASH) {
                if (type == CashMovementType.CASH_IN) {
                    totalIn = totalIn.add(absAmount);
                } else if (type == CashMovementType.CASH_OUT) {
                    totalOut = totalOut.add(absAmount);
                } else if (type == CashMovementType.ADJUSTMENT) {
                    // ADJUSTMENT can be positive or negative; add the signed value.
                    totalAdjustment = totalAdjustment.add(scale(movement.getAmount()));
                }
            }
        }

        // ----- Expected cash -----
        BigDecimal expected = opening
                .add(totalPaymentsCash)
                .add(totalIn)
                .subtract(totalOut)
                .add(totalAdjustment);
        expected = scale(expected);

        // Round all the per-method subtotals so the JSON payload is consistent.
        paymentsByMethod.replaceAll((k, v) -> scale(v));
        movementsByMethod.replaceAll((k, v) -> scale(v));

        CashTotalsByMethodDto totalsByMethod = new CashTotalsByMethodDto(
                paymentsByMethod.isEmpty() ? Map.of() : Map.copyOf(paymentsByMethod),
                movementsByMethod.isEmpty() ? Map.of() : Map.copyOf(movementsByMethod)
        );

        return new CashCloseResult(
                opening,
                scale(totalPaymentsCash),
                scale(totalIn),
                scale(totalOut),
                scale(totalAdjustment),
                expected,
                totalsByMethod
        );
    }

    /** Returns a HALF_UP, scale-2 representation; nulls are coerced to zero. */
    private static BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
