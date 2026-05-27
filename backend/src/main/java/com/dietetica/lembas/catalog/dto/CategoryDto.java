package com.dietetica.lembas.catalog.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response DTO for category data exposed via the API.
 *
 * <p>Used for both collection (list) and detail responses.
 * Nullable fields ({@code parentId}, {@code description}) are omitted from JSON
 * when {@code null}.</p>
 *
 * @param id          the unique category identifier
 * @param parentId    the parent category id ({@code null} for root categories)
 * @param name        the display name
 * @param description the optional description
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CategoryDto(
        Long id,
        Long parentId,
        String name,
        String description
) {
}
