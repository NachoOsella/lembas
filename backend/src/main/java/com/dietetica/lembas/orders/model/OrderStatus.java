package com.dietetica.lembas.orders.model;

/**
 * Lifecycle states for an order.
 *
 * <p>The full state machine applies to ONLINE orders. POS orders only ever reach
 * {@link #PAID} or {@link #CANCELLED} because the sale is completed at the time
 * of payment (see {@code docs/02-domain/order-rules.md}).</p>
 */
public enum OrderStatus {
    /** Created, waiting for Mercado Pago payment. ONLINE only. */
    PENDING_PAYMENT,
    /** Payment confirmed (online) or sale completed (POS). */
    PAID,
    /** Employee is gathering products. ONLINE only. */
    PREPARING,
    /** Ready for pickup at the branch. ONLINE only. */
    READY,
    /** Handed to the customer at the branch (in-store pickup, not home delivery). ONLINE only. */
    DELIVERED,
    /** Cancelled by customer or staff. Both channels. */
    CANCELLED,
    /** Mercado Pago rejected the payment. ONLINE only. */
    PAYMENT_FAILED,
    /** Payment approved but stock could not be satisfied. ONLINE only. */
    STOCK_CONFLICT
}
