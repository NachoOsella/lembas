package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import org.springframework.http.HttpStatus;

/** Applies a previously planned FEFO deduction to entities already locked by the caller. */
final class FefoStockApplication {

    private final StockMovementRepository stockMovementRepository;

    FefoStockApplication(StockMovementRepository stockMovementRepository) {
        this.stockMovementRepository = stockMovementRepository;
    }

    /**
     * Applies the plan without issuing per-entry repository lookups.
     *
     * <p>The repository query that supplied {@code lockedLots} must use a pessimistic write
     * lock. The pure policy derives the plan from the same locked entity state before mutation.</p>
     */
    void apply(
            DeductionPlan plan,
            List<StockLot> lockedLots,
            BiFunction<StockLot, DeductionEntry, StockMovement> movementFactory) {
        Map<Long, StockLot> lotsById = new HashMap<>();
        for (StockLot lot : lockedLots) {
            lotsById.put(lot.getId(), lot);
        }

        for (DeductionEntry entry : plan.entries()) {
            StockLot lot = lotsById.get(entry.stockLotId());
            if (lot == null) {
                throw new DomainException(
                        "STOCK_LOT_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Stock lot " + entry.stockLotId() + " is not part of the locked deduction set");
            }
            lot.setQuantityAvailable(entry.lotAvailableAfter());
            if (entry.lotAvailableAfter().compareTo(BigDecimal.ZERO) == 0) {
                lot.setStatus(StockLotStatus.DEPLETED);
            }
            stockMovementRepository.save(movementFactory.apply(lot, entry));
        }
    }
}
