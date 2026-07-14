package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Aggregated sales report payload returned by
 * {@code GET /api/admin/reports/sales}. Combines headline KPIs, a
 * daily sales series, payment-method and category breakdowns, and the
 * top 10 best-selling products in the selected period.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SalesReportDto(
        LocalDate from,
        LocalDate to,
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,
        List<ReportKpiDto> kpis,
        List<ReportSeriesPointDto> series,
        List<ReportBreakdownDto> byMethod,
        List<ReportBreakdownDto> byCategory,
        List<ReportTopRowDto> topProducts
) {
}
