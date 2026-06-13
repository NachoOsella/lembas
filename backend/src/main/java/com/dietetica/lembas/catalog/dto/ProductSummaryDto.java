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
        ProductOnlineStatus onlineStatus,
        BigDecimal availableStock
) {
    /** Backwards-compatible constructor for admin DTOs without public stock data. */
    public ProductSummaryDto(
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
        this(id, name, brandName, barcode, categoryId, categoryName, salePrice, minimumStock, imageUrl, onlineStatus, null);
    }
}
