package com.dietetica.lembas.inventory.dto;

import com.dietetica.lembas.inventory.model.StockMovementType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request sent by admins to manually adjust stock for a product.
 *
 * <p>A positive quantity increases stock (manual correction, found difference).
 * A negative quantity decreases stock using FEFO or from a specific lot.
 * The reason is mandatory for traceability.</p>
 *
 * @param productId  the product to adjust
 * @param branchId   the branch where stock resides
 * @param quantity   amount to adjust (positive = increase, negative = decrease, never zero)
 * @param reason     mandatory human-readable reason for the adjustment
 * @param type       type of adjustment: MANUAL_ADJUSTMENT, INTERNAL_CONSUMPTION, or WASTE
 * @param stockLotId optional specific lot to adjust; when null and negative uses FEFO
 */
public record StockAdjustmentRequest(
        @NotNull Long productId,
        @NotNull Long branchId,
        @NotNull @PositiveOrZero BigDecimal quantity,
        @NotNull @Size(min = 1, max = 500) String reason,
        @NotNull StockMovementType type,
        Long stockLotId
) {
}
