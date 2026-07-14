package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Employee-focused operational report for POS sales and cash-register activity.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record EmployeeReportDto(
        LocalDate from,
        LocalDate to,
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,
        List<ReportKpiDto> kpis,
        List<EmployeePerformanceDto> employees
) {
}
