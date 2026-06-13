package com.dietetica.lembas.orders.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/** Single product line requested by a customer when creating an online order. */
public record CreateOnlineOrderItemRequest(
        @NotNull Long productId,
        @NotNull @Positive BigDecimal quantity
) {
}
