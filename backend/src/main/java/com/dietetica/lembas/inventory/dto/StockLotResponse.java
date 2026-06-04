package com.dietetica.lembas.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** API response for an inventory lot listed in the admin stock module. */
public record StockLotResponse(
        Long id,
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        BigDecimal quantityAvailable,
        String lotCode,
        LocalDate expirationDate,
        BigDecimal costPrice
) {
}
