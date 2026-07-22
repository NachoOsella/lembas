package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.inventory.api.StockCommand;
import com.dietetica.lembas.inventory.api.StockCommand.OnlineOrderDeductionOutcome;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.payments.service.StockDeductionGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Inventory-owned implementation of the payments stock-effects contract.
 *
 * <p>It is marked {@link Primary} so payment approval and refund use the inventory command
 * boundary without importing inventory internals into the payments module.</p>
 */
@Component
@Primary
public class InventoryStockDeductionAdapter implements StockDeductionGateway {

    private static final Logger log = LoggerFactory.getLogger(InventoryStockDeductionAdapter.class);

    private final StockCommand stockCommand;

    public InventoryStockDeductionAdapter(StockCommand stockCommand) {
        this.stockCommand = stockCommand;
    }

    /** {@inheritDoc} */
    @Override
    public boolean deductForOrder(Order order) {
        if (order == null || order.getId() == null) {
            throw new IllegalArgumentException("Persisted order is required for stock deduction");
        }
        OnlineOrderDeductionOutcome outcome = stockCommand.tryDeductForOnlineOrder(order.getId());
        if (outcome == OnlineOrderDeductionOutcome.INSUFFICIENT_STOCK) {
            log.info("Insufficient stock for order {}", order.getId());
            return false;
        }
        return true;
    }

    /** {@inheritDoc} */
    @Override
    public int reverseForOrder(Long orderId) {
        return stockCommand.reverseMovementsForOrder(orderId);
    }
}
