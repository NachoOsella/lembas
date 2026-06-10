package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

/** Request that updates global defaults used to calculate price update preview rows. */
public record PriceUpdateBatchDefaultsRequest(
        @DecimalMin(value = "0.00") @Digits(integer = 3, fraction = 2) BigDecimal newProductMarginPercentage,
        Boolean applyCostUpdatesByDefault,
        Boolean applySalePriceUpdatesByDefault,
        Boolean excludeUnchangedByDefault
) {
}
