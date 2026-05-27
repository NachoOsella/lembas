package com.dietetica.lembas.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating or updating a category via {@code POST /api/admin/categories}
 * and {@code PUT /api/admin/categories/{id}}.
 *
 * <p>Under PUT semantics the client sends the complete representation; all required
 * fields are mandatory in both operations.</p>
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>{@code parentId} is {@code null} for root categories.</li>
 *   <li>A category may not be moved under itself (enforced at the service layer).</li>
 *   <li>Name uniqueness at the same tree level is enforced at the service layer.</li>
 * </ul>
 *
 * @param name        display name (e.g. "Cereales", "Suplementos")
 * @param parentId    optional parent category id ({@code null} = root category)
 * @param description optional description visible in the online store and admin panel
 */
public record CategoryRequest(
        @NotBlank @Size(max = 255) String name,
        Long parentId,
        @Size(max = 2000) String description
) {
}
