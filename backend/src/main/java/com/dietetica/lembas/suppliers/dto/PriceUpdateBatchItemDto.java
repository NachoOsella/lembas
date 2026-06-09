package com.dietetica.lembas.suppliers.dto;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;

import java.math.BigDecimal;

/** Preview row returned to the admin pricing grid. */
public record PriceUpdateBatchItemDto(
        Long id,
        Long supplierProductId,
        Long productId,
        String productName,
        String supplierSku,
        String supplierProductName,
        String barcode,
        BigDecimal oldCost,
        BigDecimal newCost,
        BigDecimal supplierVariationPercentage,
        BigDecimal transferPercentage,
        BigDecimal newProductMarginPercentage,
        BigDecimal oldSalePrice,
        BigDecimal suggestedSalePrice,
        BigDecimal finalSalePrice,
        boolean applyCostUpdate,
        boolean applySalePriceUpdate,
        boolean createProduct,
        PriceUpdateBatchItemStatus status,
        String errorMessage
) {
}
