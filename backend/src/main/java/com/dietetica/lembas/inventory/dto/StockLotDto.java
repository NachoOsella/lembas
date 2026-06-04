package com.dietetica.lembas.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Stock lot DTO returned after creating or listing inventory lots. */
public record StockLotDto(
        Long id,
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        BigDecimal quantityAvailable,
        String lotCode,
        LocalDate expirationDate,
        BigDecimal costPrice,
        BigDecimal totalAvailableForProductBranch
) {
}
