package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

/** Request item for a purchase order line. */
public record PurchaseOrderItemRequest(
        @NotNull Long supplierProductId,
        @NotNull @Positive BigDecimal quantityOrdered,
        @PositiveOrZero BigDecimal unitCost
) {
}
