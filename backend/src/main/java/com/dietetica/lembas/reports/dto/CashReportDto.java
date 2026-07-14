package com.dietetica.lembas.reports.dto;

import com.dietetica.lembas.cash.dto.CashEntryDto;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Full close-of-cash report for a single session (S4-US05).
 *
 * <p>Extends the existing {@code CashSessionDto} (kept as the operational
 * source of truth for the open/current/detail screens) with report-only
 * counters: number of transactions, number of POS orders, total POS revenue
 * and the manual movements list as a separate field for easier rendering.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CashReportDto(
        // --- Session metadata (mirrors CashSessionDto) ---
        Long sessionId,
        Long branchId,
        String branchName,
        Long openedByUserId,
        String openedByUserName,
        Long closedByUserId,
        String closedByUserName,
        OffsetDateTime openedAt,
        OffsetDateTime closedAt,
        CashSessionStatus status,
        BigDecimal openingCashAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal cashDifferenceAmount,
        String cashDifferenceReason,
        String openingNotes,
        String closingNotes,

        // --- Totals by method (from CashCloseCalculator) ---
        CashTotalsByMethodDto totalsByMethod,

        // --- Report-only aggregates ---
        long totalTransactions,
        long posOrdersCount,
        BigDecimal totalPosRevenue,

        // --- Timeline + manual movements (subset) ---
        List<CashEntryDto> entries,
        List<CashMovementDto> manualMovements,

        OffsetDateTime generatedAt
) {
}
