package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Lightweight purchase order row used by admin listings. */
public record PurchaseOrderSummaryDto(
        Long id,
        Long supplierId,
        String supplierName,
        Long branchId,
        String branchName,
        String status,
        OffsetDateTime orderDate,
        LocalDate expectedDeliveryDate,
        BigDecimal total,
        int itemCount,
        OffsetDateTime createdAt
) {
}
