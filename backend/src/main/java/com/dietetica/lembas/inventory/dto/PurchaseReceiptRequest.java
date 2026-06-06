package com.dietetica.lembas.inventory.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Request used to confirm a merchandise receipt that creates one stock lot. */
public record PurchaseReceiptRequest(
        @NotNull Long productId,
        @NotNull Long branchId,
        @NotNull @Positive BigDecimal quantity,
        @Size(max = 100) String lotCode,
        @Future LocalDate expirationDate,
        @PositiveOrZero BigDecimal unitCost
) {
    /** Converts the receipt request to the legacy stock lot creation command. */
    public CreateStockLotRequest toCreateStockLotRequest() {
        return new CreateStockLotRequest(productId, branchId, quantity, lotCode, expirationDate, unitCost);
    }
}
