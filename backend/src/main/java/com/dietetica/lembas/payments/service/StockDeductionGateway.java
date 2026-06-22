package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.Order;

/**
 * Abstraction over the FEFO stock deduction triggered when a Mercado Pago
 * payment is approved.
 *
 * <p>Implemented by the inventory module so the payments layer stays free of
 * inventory-specific imports and tests can swap a deterministic fake.</p>
 */
public interface StockDeductionGateway {

    /**
     * Deducts stock for the supplied order using the FEFO policy.
     *
     * @return true if stock was successfully deducted, false when the order
     *         cannot be satisfied (caller should mark the order as STOCK_CONFLICT).
     */
    boolean deductForOrder(Order order);
}
