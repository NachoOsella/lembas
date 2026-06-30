package com.dietetica.lembas.pos.dto;

import com.dietetica.lembas.payments.model.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request used by employees to register an in-store sale.
 *
 * <p>Bound to {@code POST /api/pos/sales}. Validations are enforced by Bean
 * Validation; business rules (open cash session, FEFO stock availability)
 * are enforced by {@code PosSaleService}.</p>
 *
 * @param items         the cart lines to bill; at least one required
 * @param paymentMethod the commercial payment method; the provider is
 *                      always {@code MANUAL} for POS sales
 * @param cashReceived  optional, only meaningful for CASH payments: the
 *                      amount handed by the customer, used to compute change
 *                      and persisted in the payment metadata. Null for
 *                      QR / TRANSFER / CARD / OTHER.
 * @param notes         optional free-text notes; persisted on the order
 */
public record CreatePosSaleRequest(
        @NotEmpty @Size(max = 100) List<@Valid CreatePosSaleItemRequest> items,
        @NotNull PaymentMethod paymentMethod,
        @Positive BigDecimal cashReceived,
        @Size(max = 500) String notes
) {
}
