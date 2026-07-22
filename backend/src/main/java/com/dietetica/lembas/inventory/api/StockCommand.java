package com.dietetica.lembas.inventory.api;

import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.StockAdjustmentRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.model.StockMovementType;
import java.math.BigDecimal;

/** Write-side inventory contract for feature boundaries and application use cases. */
public interface StockCommand {

    /** Expected outcomes when attempting an online-order deduction. */
    enum OnlineOrderDeductionOutcome {
        DEDUCTED,
        INSUFFICIENT_STOCK
    }

    /** Creates a stock lot and its purchase-entry movement atomically. */
    StockLotDto createStockLot(CreateStockLotRequest request);

    /** Deducts one product using FEFO and records the requested movement type. */
    DeductionPlan deductStock(Long productId, Long branchId, BigDecimal quantity, StockMovementType type);

    /** Deducts stock manually while preserving the authorized branch and audit reason. */
    DeductionPlan deductManualStock(Long productId, Long branchId, BigDecimal quantity, String reason);

    /** Deducts all valid positive-quantity lines of an online order or throws when stock is insufficient. */
    void deductForOnlineOrder(Long orderId);

    /**
     * Attempts to deduct an online order without throwing for expected stock insufficiency.
     * Unexpected failures still propagate.
     */
    OnlineOrderDeductionOutcome tryDeductForOnlineOrder(Long orderId);

    /** Applies a traceable manual stock adjustment. */
    void adjustStock(StockAdjustmentRequest request);

    /** Reverses sale movements for an order and returns the number of movements processed. */
    int reverseMovementsForOrder(Long orderId);
}
