package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.payments.service.StockDeductionGateway;
import com.dietetica.lembas.shared.exception.DomainException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Default {@link StockDeductionGateway} implementation that delegates to the
 * inventory service once the FEFO deduction method is available.
 *
 * <p>This adapter lives in the inventory module because it depends on the
 * inventory domain types. It is marked {@link Primary} so the payments layer
 * always gets the inventory-backed implementation. When the FEFO method is
 * still being implemented, this adapter can be temporarily configured to
 * return {@code false} so the webhook processor correctly marks the order as
 * STOCK_CONFLICT.</p>
 */
@Component
@Primary
public class InventoryStockDeductionAdapter implements StockDeductionGateway {

    private static final Logger log = LoggerFactory.getLogger(InventoryStockDeductionAdapter.class);

    private final InventoryService inventoryService;

    public InventoryStockDeductionAdapter(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /** {@inheritDoc} */
    @Override
    public boolean deductForOrder(Order order) {
        if (order == null || order.getId() == null) {
            return false;
        }
        try {
            inventoryService.deductForOnlineOrder(order.getId());
            return true;
        } catch (DomainException ex) {
            // FEFO policy throws DomainException(StockConflict) on insufficient stock;
            // expected outcome -- the caller will mark the order as STOCK_CONFLICT.
            log.info("FEFO deduction for order {} reported {}: {}",
                    order.getId(), ex.getCode(), ex.getMessage());
            return false;
        } catch (RuntimeException ex) {
            // Anything else is unexpected and would otherwise be silently
            // turned into a STOCK_CONFLICT. Log loudly so it can be triaged.
            log.error("Unexpected failure during FEFO deduction for order {}", order.getId(), ex);
            return false;
        }
    }
}
