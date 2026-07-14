package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;

/**
 * One bucket of a daily/weekly/monthly series powering the line/bar
 * charts on the dedicated report pages.
 *
 * <p>{@code date} is the canonical bucket anchor (ISO yyyy-MM-dd). The
 * FE renders the {@code label} verbatim on the chart axis, and uses
 * {@code value} + {@code secondaryValue} for the primary and secondary
 * series (e.g. sales total + order count).</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportSeriesPointDto(
        LocalDate date,
        String label,
        java.math.BigDecimal value,
        java.math.BigDecimal secondaryValue
) {
}
