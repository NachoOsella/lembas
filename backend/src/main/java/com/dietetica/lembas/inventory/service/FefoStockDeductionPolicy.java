package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;

/** Pure FEFO policy that plans deductions without persistence or framework dependencies. */
public class FefoStockDeductionPolicy {

    private static final Comparator<StockLot> FEFO_ORDER = Comparator.comparing(
                    StockLot::getExpirationDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(StockLot::getId, Comparator.nullsLast(Comparator.naturalOrder()));

    /**
     * Plans which lots to deduct from and by how much.
     *
     * <p>The input is copied and sorted by expiration date ascending, null expiration last, and
     * lot id ascending. The supplied entities are never mutated.</p>
     *
     * @param availableLots lots available to the caller, whether or not already ordered
     * @param requestedQuantity positive amount to deduct
     * @return a complete deduction plan
     * @throws DomainException when quantity is invalid or stock is insufficient
     */
    public DeductionPlan plan(List<StockLot> availableLots, BigDecimal requestedQuantity) {
        if (requestedQuantity == null || requestedQuantity.signum() <= 0) {
            throw new DomainException(
                    "INVALID_DEDUCTION_QUANTITY", HttpStatus.BAD_REQUEST, "Deduction quantity must be positive");
        }

        List<StockLot> orderedLots = new ArrayList<>(availableLots);
        orderedLots.sort(FEFO_ORDER);
        BigDecimal totalAvailable = orderedLots.stream()
                .map(StockLot::getQuantityAvailable)
                .filter(quantity -> quantity != null && quantity.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(requestedQuantity) < 0) {
            throw new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Insufficient stock");
        }

        List<DeductionEntry> entries = new ArrayList<>();
        BigDecimal remaining = requestedQuantity;
        for (StockLot lot : orderedLots) {
            BigDecimal lotAvailable = lot.getQuantityAvailable();
            if (lotAvailable == null || lotAvailable.signum() <= 0) {
                continue;
            }
            if (remaining.signum() <= 0) {
                break;
            }

            BigDecimal toDeduct = remaining.min(lotAvailable);
            entries.add(new DeductionEntry(lot.getId(), toDeduct, lotAvailable, lotAvailable.subtract(toDeduct)));
            remaining = remaining.subtract(toDeduct);
        }

        return new DeductionPlan(entries, requestedQuantity, totalAvailable, true);
    }
}
