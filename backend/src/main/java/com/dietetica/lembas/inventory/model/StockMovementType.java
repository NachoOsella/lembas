package com.dietetica.lembas.inventory.model;

/**
 * Business reasons that can create a stock movement.
 *
 * <p>The movement quantity is signed in {@link StockMovement}: entries and returns
 * are positive, while sales, waste, and internal consumption are negative.</p>
 */
public enum StockMovementType {
    PURCHASE_ENTRY,
    POS_SALE,
    ONLINE_SALE,
    CANCELLATION_RETURN,
    MANUAL_ADJUSTMENT,
    WASTE,
    INTERNAL_CONSUMPTION
}
