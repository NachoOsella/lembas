package com.dietetica.lembas.suppliers.dto;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchType;

import java.time.OffsetDateTime;

/** Compact representation of a price update batch for list views. */
public record PriceUpdateBatchSummaryDto(
        Long id,
        Long supplierId,
        String supplierName,
        PriceUpdateBatchType type,
        PriceUpdateBatchStatus status,
        String sourceFileName,
        OffsetDateTime createdAt,
        OffsetDateTime appliedAt
) {
}
