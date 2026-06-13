package com.dietetica.lembas.orders.dto;

import com.dietetica.lembas.orders.model.OrderStatus;

import java.math.BigDecimal;

/** Minimal response returned after creating an online order pending payment. */
public record OrderCreatedDto(
        Long id,
        String orderNumber,
        OrderStatus status,
        BigDecimal total
) {
}
