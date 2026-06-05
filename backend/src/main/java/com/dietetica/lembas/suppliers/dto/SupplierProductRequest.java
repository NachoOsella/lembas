package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Request used to associate a product with a supplier and replacement cost. */
public record SupplierProductRequest(
        @NotNull Long productId,
        @NotNull Long supplierId,
        @Size(max = 100) String supplierSku,
        @NotNull @PositiveOrZero BigDecimal currentCost,
        boolean preferred
) {
}
