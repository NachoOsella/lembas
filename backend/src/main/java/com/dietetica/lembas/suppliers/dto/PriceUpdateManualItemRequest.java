package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** One manually entered supplier row for a price update batch preview. */
public record PriceUpdateManualItemRequest(
        @Size(max = 100) String supplierSku,
        @Size(max = 100) String barcode,
        @Size(max = 255) String productName,
        @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal newCost
) {
}
