package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure domain policy that plans FEFO stock deductions.
 *
 * <p>This class is stateless, has no Spring dependencies, and can be fully
 * unit-tested without mocks. It consumes pre-ordered lots (as returned by
 * {@link com.dietetica.lembas.inventory.repository.StockLotRepository#findAvailableLotsForUpdate})
 * and produces a {@link DeductionPlan} that the caller applies transactionally.</p>
 *
 * <p>Rules:</p>
 * <ul>
 *   <li>Lots are assumed to be in FEFO order: expiration_date ascending, nulls last.</li>
 *   <li>If {@code requestedQuantity} exceeds total available stock, the plan fails
 *       with {@code INSUFFICIENT_STOCK}.</li>
 *   <li>Lots with {@code quantityAvailable <= 0} are skipped silently.</li>
 * </ul>
 */
public class FefoStockDeductionPolicy {

    /**
     * Plans which lots to deduct from and by how much.
     *
     * @param availableLots   lots already ordered by FEFO (expiration ASC, NULLS LAST)
     * @param requestedQuantity positive amount to deduct
     * @return a complete deduction plan
     * @throws DomainException with code {@code INSUFFICIENT_STOCK} when stock is insufficient
     * @throws DomainException with code {@code INVALID_DEDUCTION_QUANTITY} when quantity is not positive
     */
    public DeductionPlan plan(List<StockLot> availableLots, BigDecimal requestedQuantity) {
        if (requestedQuantity == null || requestedQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(
                    "INVALID_DEDUCTION_QUANTITY",
                    HttpStatus.BAD_REQUEST,
                    "Deduction quantity must be positive"
            );
        }

        BigDecimal totalAvailable = availableLots.stream()
                .map(StockLot::getQuantityAvailable)
                .filter(qty -> qty != null && qty.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(requestedQuantity) < 0) {
            throw new DomainException(
                    "INSUFFICIENT_STOCK",
                    HttpStatus.CONFLICT,
                    "Insufficient stock"
            );
        }

        List<DeductionEntry> entries = new ArrayList<>();
        BigDecimal remaining = requestedQuantity;

        for (StockLot lot : availableLots) {
            BigDecimal lotAvailable = lot.getQuantityAvailable();
            if (lotAvailable == null || lotAvailable.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal toDeduct = remaining.min(lotAvailable);
            BigDecimal after = lotAvailable.subtract(toDeduct);
            entries.add(new DeductionEntry(
                    lot.getId(),
                    toDeduct,
                    lotAvailable,
                    after
            ));
            remaining = remaining.subtract(toDeduct);
        }

        return new DeductionPlan(entries, requestedQuantity, totalAvailable, true);
    }
}
