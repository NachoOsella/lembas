package com.dietetica.lembas.pos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Single line on a POS sale request.
 *
 * @param productId the product being sold; must be an active catalog product
 * @param quantity  the number of units to sell; must be a positive integer
 */
public record CreatePosSaleItemRequest(
        @NotNull Long productId,
        @NotNull @Min(1) Integer quantity
) {
}
