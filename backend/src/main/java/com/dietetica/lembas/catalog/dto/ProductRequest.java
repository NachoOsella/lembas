package com.dietetica.lembas.catalog.dto;

import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Request body for creating or updating an admin catalog product. */
public record ProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 255, message = "Product name must have at most 255 characters")
        String name,

        @Size(max = 4000, message = "Description must have at most 4000 characters")
        String description,

        @Size(max = 255, message = "Brand name must have at most 255 characters")
        String brandName,

        @Pattern(regexp = "^$|^[0-9A-Za-z._-]{4,100}$", message = "Barcode format is invalid")
        String barcode,

        @NotNull(message = "Category is required")
        Long categoryId,

        @NotNull(message = "Sale price is required")
        @DecimalMin(value = "0.00", message = "Sale price must be greater than or equal to zero")
        BigDecimal salePrice,

        @Min(value = 0, message = "Minimum stock must be greater than or equal to zero")
        Integer minimumStock,

        @Size(max = 500, message = "Image URL must have at most 500 characters")
        String imageUrl,

        @NotNull(message = "Online status is required")
        ProductOnlineStatus onlineStatus
) {
}
