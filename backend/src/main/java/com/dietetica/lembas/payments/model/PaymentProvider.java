package com.dietetica.lembas.payments.model;

/** Identifies the provider responsible for processing or recording a payment. */
public enum PaymentProvider {
    /** Mercado Pago Checkout Pro for online orders. */
    MERCADO_PAGO,

    /** Manual in-store payment captured by an employee. */
    MANUAL,

    /** Future bank transfer/deposit provider. */
    BANK,

    /** Future physical card terminal integration. */
    CARD_TERMINAL
}
