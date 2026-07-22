package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.inventory.api.StockCommand;
import com.dietetica.lembas.inventory.api.StockCommand.OnlineOrderDeductionOutcome;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.StockAdjustmentRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.model.StockMovementType;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inventory command boundary that delegates each use case to its focused application service.
 */
@Service
public class InventoryStockCommandService implements StockCommand {

    private final StockLotCommandService stockLotCommandService;
    private final StockDeductionService stockDeductionService;
    private final StockAdjustmentService stockAdjustmentService;
    private final StockReversalService stockReversalService;

    public InventoryStockCommandService(
            StockLotCommandService stockLotCommandService,
            StockDeductionService stockDeductionService,
            StockAdjustmentService stockAdjustmentService,
            StockReversalService stockReversalService) {
        this.stockLotCommandService = stockLotCommandService;
        this.stockDeductionService = stockDeductionService;
        this.stockAdjustmentService = stockAdjustmentService;
        this.stockReversalService = stockReversalService;
    }

    @Override
    @Transactional
    public StockLotDto createStockLot(CreateStockLotRequest request) {
        return stockLotCommandService.createStockLot(request);
    }

    @Override
    @Transactional
    public DeductionPlan deductStock(Long productId, Long branchId, BigDecimal quantity, StockMovementType type) {
        return stockDeductionService.deductStock(productId, branchId, quantity, type);
    }

    @Override
    @Transactional
    public DeductionPlan deductManualStock(Long productId, Long branchId, BigDecimal quantity, String reason) {
        return stockDeductionService.deductManualStock(productId, branchId, quantity, reason);
    }

    @Override
    @Transactional
    public void deductForOnlineOrder(Long orderId) {
        stockDeductionService.deductForOnlineOrder(orderId);
    }

    @Override
    @Transactional
    public OnlineOrderDeductionOutcome tryDeductForOnlineOrder(Long orderId) {
        return stockDeductionService.tryDeductForOnlineOrder(orderId);
    }

    @Override
    @Transactional
    public void adjustStock(StockAdjustmentRequest request) {
        stockAdjustmentService.adjustStock(request);
    }

    @Override
    @Transactional
    public int reverseMovementsForOrder(Long orderId) {
        return stockReversalService.reverseMovementsForOrder(orderId);
    }
}
