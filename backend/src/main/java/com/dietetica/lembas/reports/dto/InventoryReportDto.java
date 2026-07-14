package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Aggregated inventory report payload returned by
 * {@code GET /api/admin/reports/inventory}. Combines headline KPIs
 * (stock valorization, low-stock count, expiring lots), a stock-value
 * breakdown by category, an expiring-lots distribution by month, and
 * the top 10 products by capital immobilized in stock plus the current
 * low-stock list.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record InventoryReportDto(
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,
        List<ReportKpiDto> kpis,
        List<ReportBreakdownDto> stockByCategory,
        List<ReportSeriesPointDto> expiringByMonth,
        List<ReportTopRowDto> topByValue,
        List<ReportTopRowDto> lowStock
) {
}
