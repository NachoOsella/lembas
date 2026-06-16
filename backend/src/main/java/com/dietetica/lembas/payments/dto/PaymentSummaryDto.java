package com.dietetica.lembas.payments.dto;

import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Lightweight payment row included in order detail responses. */
public record PaymentSummaryDto(
        Long id,
        PaymentProvider provider,
        PaymentMethod method,
        PaymentStatus status,
        BigDecimal amount,
        OffsetDateTime approvedAt,
        OffsetDateTime createdAt
) {
}
