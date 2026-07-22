package com.dietetica.lembas.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Aggregated stock summary for one product in one branch.
 *
 * <p>Returned by {@code GET /api/admin/stock/products} for the grouped inventory view.
 * Each row represents the combined stock of all lots of the same product in the same
 * branch, with the nearest expiration date among active lots.</p>
 *
 * @param productId             product identifier
 * @param productName           product display name
 * @param branchId              branch identifier
 * @param branchName            branch display name
 * @param totalAvailable        sum of quantityAvailable across all active lots
 * @param nearestExpirationDate expiration date of the soonest-expiring active lot, if any
 * @param activeLotCount        number of active lots for this product in this branch
 */
public record StockProductSummaryDto(
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        BigDecimal totalAvailable,
        LocalDate nearestExpirationDate,
        long activeLotCount) {}
