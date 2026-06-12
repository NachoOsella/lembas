package com.dietetica.lembas.payments.model;

/** Commercial method selected to pay an order. */
public enum PaymentMethod {
    /** Mercado Pago hosted checkout flow. */
    CHECKOUT_PRO,

    /** Physical cash received at the store. */
    CASH,

    /** QR-based payment. */
    QR,

    /** Bank transfer. */
    TRANSFER,

    /** Debit card payment. */
    DEBIT_CARD,

    /** Credit card payment. */
    CREDIT_CARD,

    /** Fallback for uncommon methods that still need traceability. */
    OTHER
}
