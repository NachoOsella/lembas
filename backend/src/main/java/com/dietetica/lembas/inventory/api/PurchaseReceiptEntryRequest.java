package com.dietetica.lembas.inventory.api;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Immutable trace data needed to create stock from one confirmed purchase receipt item. */
public record PurchaseReceiptEntryRequest(
        Long supplierId,
        Long supplierProductId,
        Long purchaseReceiptId,
        Long purchaseReceiptItemId,
        Long productId,
        Long branchId,
        Long receivedByUserId,
        BigDecimal quantity,
        BigDecimal unitCost,
        String lotCode,
        LocalDate expirationDate) {}
