package com.dietetica.lembas.cash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request payload for closing a cash register session (S3-US08).
 *
 * <p>The cashier declares the physical cash counted in the drawer; the service
 * compares it against the expected cash and persists the close metadata.
 * Optional {@code cashDifferenceReason} is mandatory by business rule whenever
 * the difference is non-zero (the service validates this; the annotation is
 * here as a defensive backstop).</p>
 *
 * <p>See {@code docs/02-domain/cash-register-rules.md} and
 * {@code docs/04-processes/cash-opening-closing-flow.md} for the full rule
 * set.</p>
 *
 * @param countedCashAmount    physical cash counted by the cashier, must be {@code >= 0}
 * @param closingNotes         optional free-form notes for the close operation
 * @param cashDifferenceReason mandatory when the close difference is non-zero
 */
public record CashCloseRequest(
        @NotNull
        @PositiveOrZero
        @DecimalMin("0")
        BigDecimal countedCashAmount,

        @Size(max = 1000)
        String closingNotes,

        @Size(max = 2000)
        String cashDifferenceReason
) {
}
