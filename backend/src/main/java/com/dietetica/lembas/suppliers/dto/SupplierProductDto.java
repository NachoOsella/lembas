package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;

/** Product-supplier association response with current replacement cost. */
public record SupplierProductDto(
        Long id,
        Long productId,
        String productName,
        String productBarcode,
        Long supplierId,
        String supplierName,
        String supplierSku,
        BigDecimal currentCost,
        boolean preferred
) {
}
