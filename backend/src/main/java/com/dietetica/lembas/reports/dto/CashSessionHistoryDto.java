package com.dietetica.lembas.reports.dto;

import java.util.List;

/**
 * Paginated response wrapper for the cash session history endpoint (S4-US05).
 *
 * <p>{@code totalCount} is the total number of rows matching the active filter,
 * before pagination. The {@code page} and {@code size} echo back the
 * pagination parameters from the request so the FE can navigate without
 * having to track the page size separately.</p>
 */
public record CashSessionHistoryDto(
        List<CashSessionSummaryDto> sessions,
        long totalCount,
        int page,
        int size
) {
}
