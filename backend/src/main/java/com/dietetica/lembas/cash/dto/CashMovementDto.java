package com.dietetica.lembas.cash.dto;

import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Manual cash movement returned by the movements endpoint and included in the
 * cash session detail.
 */
public record CashMovementDto(
        Long id,
        Long cashSessionId,
        CashMovementType type,
        CashMovementMethod method,
        BigDecimal amount,
        String reason,
        Long createdByUserId,
        String createdByUserName,
        OffsetDateTime createdAt
) {
}