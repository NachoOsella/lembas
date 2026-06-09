package com.dietetica.lembas.suppliers.model;

/** Supported origins for supplier price and catalog update batches. */
public enum PriceUpdateBatchType {
    SUPPLIER_FILE,
    PERCENTAGE_INCREASE,
    MANUAL_GRID,
    SINGLE_PRODUCT_MANUAL
}
