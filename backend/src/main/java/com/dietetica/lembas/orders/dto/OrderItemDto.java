package com.dietetica.lembas.orders.dto;

import java.math.BigDecimal;

/** Line item returned inside an {@link OrderDetailDto}. */
public record OrderItemDto(
        Long id,
        Long productId,
        String productName,
        String productBarcode,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal subtotalAmount
) {
}
