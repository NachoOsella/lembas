package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.payments.model.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * Centralizes the order state transitions triggered by Mercado Pago webhook
 * processing so the {@link MercadoPagoWebhookProcessor} stays focused on
 * payment-level concerns.
 */
@Component
public class WebhookOrderEffectApplier {

    private static final Logger log = LoggerFactory.getLogger(WebhookOrderEffectApplier.class);

    private final StockDeductionGateway stockDeductionGateway;

    public WebhookOrderEffectApplier(StockDeductionGateway stockDeductionGateway) {
        this.stockDeductionGateway = stockDeductionGateway;
    }

    /** Marks the order as paid, records timestamps, and triggers FEFO stock deduction. */
    public void markPaidAndDeductStock(Order order) {
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(OffsetDateTime.now());
        boolean deducted = stockDeductionGateway.deductForOrder(order);
        if (!deducted) {
            log.warn("Stock conflict for order {}: marking STOCK_CONFLICT", order.getId());
            order.setStatus(OrderStatus.STOCK_CONFLICT);
            order.setCancellationReason("STOCK_CONFLICT_AT_DEDUCTION");
            order.setCancelledAt(OffsetDateTime.now());
        }
    }

    /** Marks the order as payment failed and persists the provider reason. */
    public void markPaymentFailed(Order order, Payment payment) {
        order.setStatus(OrderStatus.PAYMENT_FAILED);
        order.setCancellationReason("MP_REJECTED: payment " + payment.getId());
    }

    /** Marks the order as cancelled when its approved payment is later refunded. */
    public void markRefunded(Order order) {
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancellationReason("MP_REFUNDED");
        order.setCancelledAt(OffsetDateTime.now());
    }
}
