package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/** Request used to create or update a supplier purchase order. */
public record PurchaseOrderRequest(
        @NotNull Long supplierId,
        @NotNull Long branchId,
        LocalDate expectedDeliveryDate,
        @Size(max = 4000) String notes,
        @NotEmpty List<@Valid PurchaseOrderItemRequest> items
) {
}
