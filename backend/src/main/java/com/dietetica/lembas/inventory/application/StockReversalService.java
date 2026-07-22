package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Application use case for restoring stock to the exact lots consumed by an order. */
@Service
public class StockReversalService {

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;

    public StockReversalService(
            StockLotRepository stockLotRepository, StockMovementRepository stockMovementRepository) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    /**
     * Restores each original sale movement to its locked lot.
     *
     * <p>This preserves the existing Phase 7 behavior. Reversal idempotency and order-level
     * serialization require schema and locking work scheduled for Phase 8.</p>
     */
    @Transactional
    public int reverseMovementsForOrder(Long orderId) {
        List<StockMovement> saleMovements = stockMovementRepository.findSaleMovementsByOrderId(orderId);
        if (saleMovements.isEmpty()) {
            return 0;
        }

        int reversed = 0;
        for (StockMovement original : saleMovements) {
            Long lotId = original.getStockLot() == null
                    ? null
                    : original.getStockLot().getId();
            if (lotId == null) {
                throw new DomainException(
                        "STOCK_LOT_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Stock movement has no lot reference; cannot reverse");
            }
            StockLot lot = stockLotRepository
                    .findByIdForUpdate(lotId)
                    .orElseThrow(() -> new DomainException(
                            "STOCK_LOT_NOT_FOUND",
                            HttpStatus.NOT_FOUND,
                            "Stock lot " + lotId + " no longer exists; cannot reverse"));
            BigDecimal reversalQuantity = original.getQuantity().abs();
            BigDecimal updatedQuantity = lot.getQuantityAvailable().add(reversalQuantity);
            lot.setQuantityAvailable(updatedQuantity);
            if (updatedQuantity.signum() > 0 && lot.getStatus() == StockLotStatus.DEPLETED) {
                lot.setStatus(StockLotStatus.ACTIVE);
            }
            stockMovementRepository.save(cancellationReturnMovement(original, lot, reversalQuantity));
            reversed++;
        }
        return reversed;
    }

    private StockMovement cancellationReturnMovement(StockMovement original, StockLot lot, BigDecimal quantity) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(original.getProduct());
        movement.setBranch(original.getBranch());
        movement.setType(StockMovementType.CANCELLATION_RETURN);
        movement.setQuantity(quantity);
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("ORDER");
        movement.setReferenceId(original.getOrderId());
        movement.setOrderId(original.getOrderId());
        movement.setReason("Cancellation return for order " + original.getOrderId());
        return movement;
    }
}
