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
 * {@code entries} is only populated by the detail endpoint, so
 * {@code @JsonInclude(NON_NULL)} keeps the payload compact.</p>
 *
 * <p>{@code entries} is a unified timeline of everything that moves the drawer
 * during the session: manual {@link CashMovementDto movements} and APPROVED
 * POS payments linked to this session. Sorted ascending by
 * {@code occurredAt}.</p>
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
        /**
         * Unified list of cash flow entries (manual + payment). Replaces the
         * previous {@code movements} field; both shapes were kept identical
         * during the migration and the FE now reads {@code entries}.
         */
        List<CashEntryDto> entries
) {
}
