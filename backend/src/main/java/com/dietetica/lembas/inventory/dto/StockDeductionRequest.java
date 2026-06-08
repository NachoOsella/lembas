package com.dietetica.lembas.inventory.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request sent by admins to deduct stock manually for a product in a branch.
 *
 * <p>The deduction follows FEFO policy and records a MANUAL_ADJUSTMENT stock movement.</p>
 *
 * @param productId the product to deduct from
 * @param branchId  the branch where stock resides
 * @param quantity  positive amount to deduct
 * @param reason    optional human-readable reason for the adjustment
 */
public record StockDeductionRequest(
        @NotNull Long productId,
        @NotNull Long branchId,
        @NotNull @Positive BigDecimal quantity,
        @Size(max = 500) String reason
) {
}
