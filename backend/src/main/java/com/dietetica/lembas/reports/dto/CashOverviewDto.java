package com.dietetica.lembas.reports.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Aggregate operational view of closed cash sessions for a selected period.
 *
 * <p>All amounts are raw values. Formatting, labels and chart styling belong
 * to the frontend so this API remains reusable for exports and future clients.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CashOverviewDto(
        LocalDate from,
        LocalDate to,
        Long branchId,
        String branchName,
        OffsetDateTime generatedAt,
        long closedSessions,
        long openSessions,
        long balancedSessions,
        long sessionsWithDifference,
        BigDecimal expectedCashTotal,
        BigDecimal countedCashTotal,
        BigDecimal netDifferenceTotal,
        BigDecimal absoluteDifferenceTotal,
        List<CashOverviewDailyDto> dailyCloseSeries,
        List<CashMethodTotalDto> paymentMethods,
        List<CashSessionSummaryDto> sessionsWithDiscrepancy
) {
}
