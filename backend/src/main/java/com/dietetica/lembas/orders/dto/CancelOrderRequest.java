package com.dietetica.lembas.orders.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for cancelling an order.
 *
 * <p>The reason is mandatory and persisted on the order for audit traceability.
 * It must be 1-500 characters after trimming surrounding whitespace.</p>
 */
public record CancelOrderRequest(
        @NotBlank(message = "Cancellation reason is required")
        @Size(min = 1, max = 500, message = "Reason must be 1-500 characters")
        String reason
) {
}
