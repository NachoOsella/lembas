package com.dietetica.lembas.cash.dto;

import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Informational totals for a cash session, grouped by payment method (S3-US08).
 *
 * <p>Two separate groupings are surfaced so the close report can distinguish
 * between payments (orders settled through the cash session) and manual
 * movements (operator-registered cash flows):</p>
 *
 * <ul>
 *   <li>{@code paymentsByMethod} groups APPROVED payments by their
 *       {@link PaymentMethod} ({@code CASH}, {@code QR}, {@code TRANSFER},
 *       {@code DEBIT_CARD}, {@code CREDIT_CARD}, {@code CHECKOUT_PRO},
 *       {@code OTHER}). Only methods with at least one payment are present.</li>
 *   <li>{@code movementsByMethod} groups manual cash movements by their
 *       {@link CashMovementMethod} ({@code CASH}, {@code TRANSFER},
 *       {@code OTHER}) using the absolute amount.</li>
 * </ul>
 *
 * <p>Keys are the {@code name()} of the source enum so the FE can use a plain
 * string record. Values are non-null {@link BigDecimal} with two decimals
 * (HALF_UP). Maps are never null; empty maps serialize to {@code {}}.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({"paymentsByMethod", "movementsByMethod"})
public record CashTotalsByMethodDto(
        Map<String, BigDecimal> paymentsByMethod,
        Map<String, BigDecimal> movementsByMethod
) {
    /** Empty totals — used when a session has no payments and no movements. */
    public static CashTotalsByMethodDto empty() {
        return new CashTotalsByMethodDto(Map.of(), Map.of());
    }
}
