package com.dietetica.lembas.catalog.dto;

import com.dietetica.lembas.catalog.model.ProductOnlineStatus;

import java.math.BigDecimal;

/** Lightweight product DTO used by admin catalog tables. */
public record ProductSummaryDto(
        Long id,
        String name,
        String brandName,
        String barcode,
        Long categoryId,
        String categoryName,
        BigDecimal salePrice,
        Integer minimumStock,
        String imageUrl,
        ProductOnlineStatus onlineStatus
) {
}
