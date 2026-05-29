package com.dietetica.lembas.catalog.dto;

import com.dietetica.lembas.catalog.model.ProductOnlineStatus;

import java.math.BigDecimal;

/** Detailed product DTO returned by admin edit and detail endpoints. */
public record ProductDetailDto(
        Long id,
        String name,
        String description,
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
