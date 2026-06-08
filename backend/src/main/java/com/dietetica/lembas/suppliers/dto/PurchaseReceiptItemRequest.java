package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Request line for receiving one purchase-order item. */
public record PurchaseReceiptItemRequest(
        @NotNull Long purchaseOrderItemId,
        @NotNull @Positive BigDecimal quantityReceived,
        @NotNull @PositiveOrZero BigDecimal unitCost,
        @Size(max = 100) String lotCode,
        @Future LocalDate expirationDate
) {
}
