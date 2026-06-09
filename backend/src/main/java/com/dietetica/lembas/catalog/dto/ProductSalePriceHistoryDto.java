package com.dietetica.lembas.catalog.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Sale price history row returned by the admin product pricing endpoint. */
public record ProductSalePriceHistoryDto(
        Long id,
        Long productId,
        BigDecimal oldPrice,
        BigDecimal newPrice,
        OffsetDateTime validFrom,
        String reason,
        String source,
        String referenceType,
        Long referenceId
) {
}
