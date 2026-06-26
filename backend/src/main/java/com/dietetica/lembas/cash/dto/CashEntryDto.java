package com.dietetica.lembas.cash.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Unified entry in a cash session's flow: either a {@code MANUAL} movement
 * (registered by an operator) or a {@code PAYMENT} linked to the session
 * (typically an APPROVED POS sale paid in cash).
 *
 * <p>Designed for the cash detail screen so the operator can see a single,
 * chronologically sorted timeline of everything that moves the drawer.</p>
 *
 * @param kind          origin of the entry: {@code MANUAL} or {@code PAYMENT}
 * @param id            primary key of the underlying record (movement or payment)
 * @param type          semantic type ({@code CASH_IN}, {@code CASH_OUT},
 *                      {@code ADJUSTMENT}, {@code PAYMENT})
 * @param method        payment method code ({@code CASH}, {@code TRANSFER},
 *                      {@code QR}, {@code DEBIT_CARD}, {@code OTHER}, ...)
 * @param direction     cash flow direction: {@code IN}, {@code OUT} or {@code NEUTRAL}
 * @param amount        signed (or absolute) amount of the entry, in the session currency
 * @param description   human-readable description (movement reason or
 *                      "Pago pedido #N")
 * @param registeredBy  who/what produced the entry (operator full name or
 *                      "Pedido #N")
 * @param occurredAt    when the entry was recorded (createdAt for both kinds)
 * @param referenceId   optional link to the source record (order id for payments)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CashEntryDto(
        String kind,
        Long id,
        String type,
        String method,
        String direction,
        BigDecimal amount,
        String description,
        String registeredBy,
        OffsetDateTime occurredAt,
        Long referenceId
) {
}
