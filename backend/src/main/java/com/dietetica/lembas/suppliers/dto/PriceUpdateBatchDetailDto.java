package com.dietetica.lembas.suppliers.dto;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Full price update batch preview with defaults and row-level overrides. */
public record PriceUpdateBatchDetailDto(
        Long id,
        Long supplierId,
        String supplierName,
        PriceUpdateBatchType type,
        PriceUpdateBatchStatus status,
        String sourceFileName,
        BigDecimal defaultNewProductMarginPercentage,
        boolean applyCostUpdatesByDefault,
        boolean applySalePriceUpdatesByDefault,
        boolean excludeUnchangedByDefault,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime appliedAt,
        List<PriceUpdateBatchItemDto> items
) {
}
