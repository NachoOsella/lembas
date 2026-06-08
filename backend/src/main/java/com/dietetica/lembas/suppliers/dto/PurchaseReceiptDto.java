package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Confirmed purchase receipt with generated stock summary. */
public record PurchaseReceiptDto(
        Long id,
        Long purchaseOrderId,
        Long supplierId,
        String supplierName,
        Long branchId,
        String branchName,
        String status,
        String invoiceNumber,
        OffsetDateTime receivedAt,
        OffsetDateTime confirmedAt,
        String purchaseOrderStatus,
        BigDecimal totalReceivedQuantity,
        List<PurchaseReceiptItemDto> items
) {
}
