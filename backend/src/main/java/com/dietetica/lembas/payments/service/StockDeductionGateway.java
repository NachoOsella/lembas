package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.Order;

/**
 * Payments-owned contract for stock effects triggered by provider status changes.
 *
 * <p>Implemented by the inventory module so payments does not import inventory internals.</p>
 */
public interface StockDeductionGateway {

    /**
     * Deducts stock for the supplied order using the FEFO policy.
     *
     * @return true if stock was successfully deducted, false when the order
     *         cannot be satisfied (caller should mark the order as STOCK_CONFLICT).
     */
    boolean deductForOrder(Order order);

    /**
     * Restores the exact lots consumed by the order's original sale movements.
     *
     * @return the number of original sale movements reversed
     */
    int reverseForOrder(Long orderId);
}
