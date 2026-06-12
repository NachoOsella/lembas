package com.dietetica.lembas.payments.model;

/** Lifecycle state of a payment, independent from the order status. */
public enum PaymentStatus {
    /** Payment was created and is waiting for provider/customer confirmation. */
    PENDING,

    /** Payment was confirmed by the provider or collected in-store. */
    APPROVED,

    /** Payment was rejected by the provider. */
    REJECTED,

    /** Payment was cancelled before completion. */
    CANCELLED,

    /** Payment was refunded after approval. */
    REFUNDED,

    /** Payment expired without completion. */
    EXPIRED,

    /** Provider reported an intermediate processing state. */
    IN_PROCESS
}
