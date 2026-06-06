package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** Detailed purchase order returned by admin read and write operations. */
public record PurchaseOrderDetailDto(
        Long id,
        Long supplierId,
        String supplierName,
        String supplierPhone,
        String supplierEmail,
        String supplierCuit,
        Long branchId,
        String branchName,
        String status,
        OffsetDateTime orderDate,
        LocalDate expectedDeliveryDate,
        String notes,
        BigDecimal total,
        List<PurchaseOrderItemDto> items,
        OffsetDateTime createdAt,
        OffsetDateTime confirmedAt,
        OffsetDateTime sentAt,
        OffsetDateTime cancelledAt,
        String cancellationReason
) {
}
