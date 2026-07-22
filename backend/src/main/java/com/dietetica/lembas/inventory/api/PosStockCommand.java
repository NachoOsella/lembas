package com.dietetica.lembas.inventory.api;

/**
 * POS-specific stock deduction contract.
 *
 * <p>The referenced order supplies the branch and item quantities. Inventory applies FEFO under
 * pessimistic lot locks and records {@code POS_SALE} movements linked to that order.</p>
 */
public interface PosStockCommand {

    /** Deducts every positive item of the persisted POS order. */
    void deductForPosOrder(Long orderId);
}
