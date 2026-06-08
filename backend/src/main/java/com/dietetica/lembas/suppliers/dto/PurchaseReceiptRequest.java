package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Request used to confirm a purchase receipt for an existing purchase order. */
public record PurchaseReceiptRequest(
        @NotNull Long purchaseOrderId,
        @Size(max = 100) String invoiceNumber,
        @Size(max = 1000) String notes,
        @NotEmpty List<@Valid PurchaseReceiptItemRequest> items
) {
}
