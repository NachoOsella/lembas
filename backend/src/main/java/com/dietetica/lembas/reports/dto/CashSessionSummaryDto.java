package com.dietetica.lembas.reports.dto;

import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Lightweight projection of a cash session for the history list (S4-US05).
 *
 * <p>Excludes the heavy {@code entries} timeline to keep the list endpoint
 * cheap. The detail endpoint returns the full {@code CashSessionDto} when
 * the user navigates into a specific session.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CashSessionSummaryDto(
        Long id,
        Long branchId,
        String branchName,
        String openedByUserName,
        String closedByUserName,
        OffsetDateTime openedAt,
        OffsetDateTime closedAt,
        BigDecimal openingCashAmount,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal cashDifferenceAmount,
        String cashDifferenceReason,
        CashSessionStatus status,
        long totalPayments,
        long totalManualMovements
) {
}
