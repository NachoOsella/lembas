package com.dietetica.lembas.orders.dto;

import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.payments.dto.PaymentSummaryDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Detailed order returned by customer and admin read endpoints. */
public record OrderDetailDto(
        Long id,
        String orderNumber,
        OrderType type,
        OrderStatus status,
        FulfillmentType fulfillmentType,
        Long branchId,
        String branchName,
        Long customerUserId,
        String customerName,
        String customerEmail,
        String customerPhone,
        Long createdByUserId,
        String createdByUserName,
        BigDecimal subtotal,
        BigDecimal discountTotal,
        BigDecimal total,
        String notes,
        String cancellationReason,
        List<OrderItemDto> items,
        List<PaymentSummaryDto> payments,
        OffsetDateTime paidAt,
        OffsetDateTime preparedAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
