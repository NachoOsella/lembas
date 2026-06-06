package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;

/** Product line returned for a supplier purchase order. */
public record PurchaseOrderItemDto(
        Long id,
        Long productId,
        String productName,
        String productBarcode,
        Long supplierProductId,
        String supplierSku,
        BigDecimal quantityOrdered,
        BigDecimal unitCost,
        BigDecimal subtotal
) {
}
