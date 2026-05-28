package com.dietetica.lembas.catalog.dto;

/**
 * Lightweight response DTO for the public store category listing.
 *
 * <p>Exposes only the fields needed for store-front navigation, including a
 * count of published products per category.</p>
 *
 * @param id           the unique category identifier
 * @param name         the display name
 * @param productCount number of published products in this category
 */
public record CategoryStoreDto(
        Long id,
        String name,
        long productCount
) {
}
