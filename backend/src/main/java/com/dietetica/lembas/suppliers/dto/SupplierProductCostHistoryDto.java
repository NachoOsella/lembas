package com.dietetica.lembas.suppliers.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Replacement cost history response for a supplier-product relation. */
public record SupplierProductCostHistoryDto(
        Long id,
        Long supplierProductId,
        BigDecimal oldCost,
        BigDecimal newCost,
        String source,
        OffsetDateTime validFrom,
        OffsetDateTime createdAt
) {
}
