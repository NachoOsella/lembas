package com.dietetica.lembas.cash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request to open a cash register session.
 *
 * <p>{@code openingCashAmount} is the declared initial cash in the drawer and
 * must be {@code >= 0}. {@code openingNotes} is optional. {@code branchId} is
 * only honoured for the {@code ADMIN} role (a global admin may not have an
 * assigned branch); for {@code MANAGER} and {@code EMPLOYEE} the branch is
 * derived from the authenticated user and this field is ignored.</p>
 */
public record OpenCashSessionRequest(
        @NotNull @PositiveOrZero @DecimalMin("0") BigDecimal openingCashAmount,
        @Size(max = 1000) String openingNotes,
        Long branchId
) {
}