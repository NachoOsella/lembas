package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.payments.service.StockDeductionGateway;
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
        } catch (RuntimeException ex) {
            // FEFO policy throws DomainException(StockConflict) on insufficient stock;
            // any other failure is treated as a deduction failure so the caller can
            // mark the order as STOCK_CONFLICT and contact the customer.
            return false;
        }
    }
}
