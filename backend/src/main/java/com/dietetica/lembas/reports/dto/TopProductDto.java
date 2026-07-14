package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

/**
 * One entry in the dashboard "top products" table (S4-US04).
 *
 * <p>Ranked by net revenue in the report period. The list is capped at
 * 10 rows by the repository query; the FE expects {@code position} to be 1-based
 * so the first row shows {@code #1}.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TopProductDto(
        int position,
        Long productId,
        String productName,
        String barcode,
        Long categoryId,
        String categoryName,
        String brandName,
        BigDecimal quantitySold,
        BigDecimal totalRevenue,
        BigDecimal averagePrice,
        String imageUrl
) {
}
