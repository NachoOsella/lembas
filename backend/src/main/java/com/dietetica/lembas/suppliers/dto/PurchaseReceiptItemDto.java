package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Confirmed purchase receipt line returned by the API. */
public record PurchaseReceiptItemDto(
        Long id,
        Long purchaseOrderItemId,
        Long productId,
        String productName,
        BigDecimal quantityReceived,
        BigDecimal unitCost,
        String lotCode,
        LocalDate expirationDate,
        Long createdStockLotId
) {
}
