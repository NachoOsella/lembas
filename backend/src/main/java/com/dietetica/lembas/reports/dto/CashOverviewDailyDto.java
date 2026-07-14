package com.dietetica.lembas.reports.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One calendar-day bucket in the cash overview close series. */
public record CashOverviewDailyDto(
        LocalDate date,
        long closedSessions,
        BigDecimal expectedCash,
        BigDecimal countedCash,
        BigDecimal difference
) {
}
