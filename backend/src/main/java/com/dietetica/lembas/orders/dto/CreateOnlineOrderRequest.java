package com.dietetica.lembas.orders.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Request used by authenticated customers to create a pickup online order. */
public record CreateOnlineOrderRequest(
        @NotNull Long branchId,
        @NotEmpty @Size(max = 100) List<@Valid CreateOnlineOrderItemRequest> items,
        @Size(max = 1000) String notes
) {
}
