package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.Size;

/** Request body used to cancel a purchase order with an optional reason. */
public record PurchaseOrderCancelRequest(
        @Size(max = 1000) String reason
) {
}
