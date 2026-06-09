package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Request used to create a manual price update batch without uploading a file. */
public record PriceUpdateManualBatchRequest(
        @NotNull Long supplierId,
        @Valid PriceUpdateBatchDefaultsRequest defaults,
        @NotEmpty @Size(max = 500) List<@Valid PriceUpdateManualItemRequest> items,
        @Size(max = 2000) String notes
) {
}
