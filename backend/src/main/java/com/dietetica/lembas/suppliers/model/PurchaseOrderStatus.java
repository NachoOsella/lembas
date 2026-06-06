package com.dietetica.lembas.suppliers.model;

/** Lifecycle states for supplier purchase orders. */
public enum PurchaseOrderStatus {
    DRAFT,
    CONFIRMED,
    SENT,
    PARTIALLY_RECEIVED,
    RECEIVED,
    CANCELLED
}
