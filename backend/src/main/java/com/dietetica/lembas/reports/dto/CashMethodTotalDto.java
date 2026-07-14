package com.dietetica.lembas.reports.dto;

import java.math.BigDecimal;

/** Approved payment totals by method for the selected cash-session period. */
public record CashMethodTotalDto(
        String method,
        BigDecimal amount,
        long transactionCount
) {
}
