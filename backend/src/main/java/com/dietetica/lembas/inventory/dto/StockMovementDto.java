package com.dietetica.lembas.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Stock movement returned by the movements list endpoint.
 *
 * <p>Each entry represents an immutable stock change with full traceability.</p>
 *
 * @param id              movement identifier
 * @param stockLotId      affected lot
 * @param productId       denormalized product reference
 * @param productName     denormalized product name for display
 * @param branchId        denormalized branch reference
 * @param branchName      denormalized branch name for display
 * @param type            movement type (PURCHASE_ENTRY, POS_SALE, MANUAL_ADJUSTMENT, etc.)
 * @param quantity        signed quantity (positive for entry/return, negative for sale/adjustment)
 * @param unitCostSnapshot frozen cost at movement time
 * @param reason          human-readable reason when applicable
 * @param createdByUserId user that registered the movement
 * @param createdAt       immutable timestamp
 */
public record StockMovementDto(
        Long id,
        Long stockLotId,
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        String type,
        BigDecimal quantity,
        BigDecimal unitCostSnapshot,
        String reason,
        Long createdByUserId,
        OffsetDateTime createdAt
) {
}
