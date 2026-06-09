package com.dietetica.lembas.suppliers.dto;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Request for per-row overrides in a price update batch preview grid. */
public record PriceUpdateBatchItemUpdateRequest(
        Long productId,
        @Size(max = 100) String supplierSku,
        @Size(max = 100) String barcode,
        @Size(max = 255) String productName,
        @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal newCost,
        @DecimalMin(value = "0.00") @Digits(integer = 5, fraction = 3) BigDecimal transferPercentage,
        @DecimalMin(value = "0.00") @Digits(integer = 3, fraction = 2) BigDecimal newProductMarginPercentage,
        @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal finalSalePrice,
        Boolean applyCostUpdate,
        Boolean applySalePriceUpdate,
        Boolean createProduct,
        PriceUpdateBatchItemStatus status
) {
}
