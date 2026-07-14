package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Aggregated suppliers report payload returned by
 * {@code GET /api/admin/reports/suppliers}. Combines headline KPIs
 * (received cost, receipts, delivery lead time, on-time rate), a monthly
 * receipt series, the top 10 suppliers by volume and the lead time
 * ranking per supplier.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SuppliersReportDto(
        LocalDate from,
        LocalDate to,
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,
        List<ReportKpiDto> kpis,
        List<ReportSeriesPointDto> purchasesByMonth,
        List<ReportTopRowDto> topByVolume,
        List<ReportTopRowDto> leadTimeBySupplier
) {
}
