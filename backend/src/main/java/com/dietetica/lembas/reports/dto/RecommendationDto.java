package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Rule-based recommendation surfaced in the dashboard panel and the dedicated
 * recommendations page (S4-US06).
 *
 * <p>The {@code id} field is a composite of {@code type + "-" + productId} so
 * the FE can dedupe entries that match multiple rules. Optional fields carry
 * the rule-specific context; the FE hides the cells that do not apply to a
 * given {@code type}.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RecommendationDto(
        String id,
        String type,
        String title,
        String description,
        String urgency,
        String iconName,
        String link,
        String actionLabel,

        // Product context
        Long productId,
        String productName,
        Long categoryId,
        String categoryName,
        String barcode,

        // LOW_STOCK
        BigDecimal currentStock,
        Integer minimumStock,

        // EXPIRING_SOON
        LocalDate expirationDate,
        Long stockLotId,
        String lotCode,
        BigDecimal lotQuantity,

        // HIGH_ROTATION
        Integer last7DaysSales,

        // NO_MOVEMENT
        Integer daysWithoutSales,

        OffsetDateTime generatedAt
) {
}
