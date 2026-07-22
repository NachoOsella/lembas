package com.dietetica.lembas.inventory.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Request used by admins to register a new stock lot purchase entry. */
public record CreateStockLotRequest(
        @NotNull Long productId,
        @NotNull Long branchId,
        @NotNull @Positive BigDecimal quantity,
        @Size(max = 100) String lotCode,
        @Future LocalDate expirationDate,
        @PositiveOrZero BigDecimal costPrice) {}
