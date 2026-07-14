package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One slice of a "by X" chart or table on the dedicated report pages
 * (sales by category, stock by category, purchases by month, etc.).
 *
 * <p>The {@code key} is a stable identifier (slug) the FE can use for
 * drill-down filters; {@code label} is the human-readable name. {@code
 * amount} is the formatted headline number (currency or count depending
 * on the chart) and {@code count} is the unformatted count or quantity in
 * the bucket. Decimal quantities are preserved.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportBreakdownDto(
        String key,
        String label,
        java.math.BigDecimal amount,
        java.math.BigDecimal count,
        java.math.BigDecimal percentage
) {
}
