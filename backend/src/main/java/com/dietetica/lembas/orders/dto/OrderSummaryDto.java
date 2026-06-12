package com.dietetica.lembas.orders.dto;

import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Lightweight order row used by customer history and admin listings. */
public record OrderSummaryDto(
        Long id,
        String orderNumber,
        OrderType type,
        OrderStatus status,
        FulfillmentType fulfillmentType,
        Long branchId,
        String branchName,
        Long customerUserId,
        String customerName,
        Long createdByUserId,
        String createdByUserName,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal total,
        int itemCount,
        OffsetDateTime paidAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime createdAt
) {
}
