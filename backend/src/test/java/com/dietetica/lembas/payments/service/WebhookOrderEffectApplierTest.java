package com.dietetica.lembas.payments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import org.junit.jupiter.api.Test;

/** Unit tests for atomic order-level stock effects applied by payment webhooks. */
class WebhookOrderEffectApplierTest {

    private final StockDeductionGateway stockGateway = mock(StockDeductionGateway.class);
    private final WebhookOrderEffectApplier applier = new WebhookOrderEffectApplier(stockGateway);

    @Test
    void refundReversesOriginalMovementsBeforeCancellingOrder() {
        Order order = order(OrderStatus.PAID);
        when(stockGateway.reverseForOrder(42L)).thenReturn(2);

        applier.markRefunded(order);

        verify(stockGateway).reverseForOrder(42L);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getCancellationReason()).isEqualTo("MP_REFUNDED");
        assertThat(order.getCancelledAt()).isNotNull();
    }

    @Test
    void reversalFailureDoesNotMarkOrderCancelled() {
        Order order = order(OrderStatus.PAID);
        when(stockGateway.reverseForOrder(42L)).thenThrow(new IllegalStateException("database failure"));

        assertThatThrownBy(() -> applier.markRefunded(order))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database failure");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void onlyInsufficientStockOutcomeMarksStockConflict() {
        Order order = order(OrderStatus.PENDING_PAYMENT);
        when(stockGateway.deductForOrder(order)).thenReturn(false);

        applier.markPaidAndDeductStock(order);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.STOCK_CONFLICT);
        verify(stockGateway, never()).reverseForOrder(42L);
    }

    private static Order order(OrderStatus status) {
        Order order = new Order();
        order.setId(42L);
        order.setStatus(status);
        return order;
    }
}
