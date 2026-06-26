package com.dietetica.lembas.cash.dto;

import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request to register a manual cash movement in an OPEN cash session.
 *
 * <p>Amount may be positive or negative but must not be zero (the service
 * validates {@code amount != 0} on top of the DB CHECK).</p>
 */
public record CreateCashMovementRequest(
        @NotNull CashMovementType type,
        @NotNull CashMovementMethod method,
        @NotNull @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank String reason
) {
}