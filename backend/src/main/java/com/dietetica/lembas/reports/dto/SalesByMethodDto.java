package com.dietetica.lembas.reports.dto;

import java.math.BigDecimal;

/**
 * One slice of the dashboard "payment method distribution" doughnut chart (S4-US04).
 *
 * <p>{@code percentage} is the slice share of the period total, expressed as a
 * percentage (0-100) with two decimals, computed server-side so the FE can
 * render the legend without re-deriving it from the dataset.</p>
 */
public record SalesByMethodDto(
        String method,
        String methodLabel,
        BigDecimal totalAmount,
        long transactionCount,
        BigDecimal percentage
) {
}
