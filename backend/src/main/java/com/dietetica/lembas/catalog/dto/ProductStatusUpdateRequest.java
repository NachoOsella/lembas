package com.dietetica.lembas.catalog.dto;

import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import jakarta.validation.constraints.NotNull;

/** Request body used to change the online publishing status of a product. */
public record ProductStatusUpdateRequest(
        @NotNull(message = "Online status is required")
        ProductOnlineStatus onlineStatus
) {
}
