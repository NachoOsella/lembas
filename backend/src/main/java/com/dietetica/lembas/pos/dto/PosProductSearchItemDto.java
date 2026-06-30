package com.dietetica.lembas.pos.dto;

import java.math.BigDecimal;

/**
 * Compact product DTO used by the POS product search endpoint.
 *
 * <p>Optimised for the POS grid: it does not include audit or category metadata
 * (which are not relevant to a cashier) and exposes the branch-level
 * available stock so the UI can disable out-of-stock items without an extra
 * round-trip.</p>
 *
 * @param id              the product id
 * @param name            the commercial name
 * @param brandName       the brand, or null
 * @param barcode         the scanned barcode, or null
 * @param salePrice       the current sale price
 * @param availableStock  available units at the resolved branch, or null if
 *                        the branch is unknown (e.g. no open cash session)
 * @param imageUrl        the product image URL, or null
 */
public record PosProductSearchItemDto(
        Long id,
        String name,
        String brandName,
        String barcode,
        BigDecimal salePrice,
        BigDecimal availableStock,
        String imageUrl
) {
}
