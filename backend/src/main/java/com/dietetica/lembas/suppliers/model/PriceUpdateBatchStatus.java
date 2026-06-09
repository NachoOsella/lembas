package com.dietetica.lembas.suppliers.model;

/** Lifecycle states for a reviewed price update batch. */
public enum PriceUpdateBatchStatus {
    DRAFT,
    VALIDATED,
    APPLIED,
    CANCELLED
}
