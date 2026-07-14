package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Reusable KPI tile DTO for the dedicated report endpoints
 * (Ventas / Inventario / Proveedores). Mirrors the shape of
 * {@link DashboardStatCardDto} so the FE can render every tile through
 * the same component.
 *
 * @param label        the user-facing label (e.g. "Facturacion del periodo")
 * @param value        the formatted value, ready to render (e.g. "$ 1.245.000")
 * @param subtitle     optional supporting copy under the value
 * @param iconName     PrimeIcons class name for the leading icon
 * @param colorStyle   semantic tone: SUCCESS, WARNING, DANGER, INFO, NEUTRAL
 * @param trend        trend direction: UP, DOWN or FLAT
 * @param trendPercentage signed percentage change, two decimals
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportKpiDto(
        String label,
        String value,
        String subtitle,
        String iconName,
        String colorStyle,
        String trend,
        java.math.BigDecimal trendPercentage
) {
}
