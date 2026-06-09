package com.dietetica.lembas.suppliers.service;

import java.math.BigDecimal;

/** Normalized supplier price row loaded from manual input or an uploaded supplier file. */
public record SupplierPriceRow(
        String supplierSku,
        String barcode,
        String productName,
        BigDecimal newCost,
        String errorMessage
) {
    /** Returns true when this row could not be parsed into a usable preview candidate. */
    public boolean hasError() {
        return errorMessage != null && !errorMessage.isBlank();
    }
}
