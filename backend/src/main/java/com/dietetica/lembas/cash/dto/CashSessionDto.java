package com.dietetica.lembas.cash.dto;

import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Cash session returned by the open, current and detail endpoints.
 *
 * <p>Close-only fields are omitted (null) while the session is OPEN, and
 * {@code movements} is only populated by the detail endpoint, so
 * {@code @JsonInclude(NON_NULL)} keeps the payload compact.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CashSessionDto(
        Long id,
        CashSessionStatus status,
        Long branchId,
        String branchName,
        Long openedByUserId,
        String openedByUserName,
        BigDecimal openingCashAmount,
        String openingNotes,
        OffsetDateTime openedAt,
        BigDecimal expectedCashAmount,
        BigDecimal countedCashAmount,
        BigDecimal cashDifferenceAmount,
        String cashDifferenceReason,
        Long closedByUserId,
        String closedByUserName,
        OffsetDateTime closedAt,
        String closingNotes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<CashMovementDto> movements
) {
}