package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link OrderStatePolicy} covering the full ONLINE state machine
 * and POS restrictions without Spring context.
 */
class OrderStatePolicyTest {

    private OrderStatePolicy policy;

    @BeforeEach
    void setUp() {
        policy = new OrderStatePolicy();
    }

    // ----------------------------------------------------------------
    // Null safety
    // ----------------------------------------------------------------

    @Test
    void shouldRejectNullOrder() {
        assertThatThrownBy(() -> policy.validateTransition(null, OrderStatus.PREPARING))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("null");
    }

    // ----------------------------------------------------------------
    // ONLINE: valid forward transitions
    // ----------------------------------------------------------------

    @Test
    void shouldAllowPaidToPreparingForOnline() {
        Order order = onlineOrder(OrderStatus.PAID);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.PREPARING))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldAllowPreparingToReadyForOnline() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.READY))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldAllowReadyToDeliveredForOnline() {
        Order order = onlineOrder(OrderStatus.READY);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.DELIVERED))
                .doesNotThrowAnyException();
    }

    // ----------------------------------------------------------------
    // ONLINE: valid cancellation from any pre-terminal state
    // ----------------------------------------------------------------

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"PAID", "PREPARING", "READY",
            "PENDING_PAYMENT", "PAYMENT_FAILED", "STOCK_CONFLICT"})
    void shouldAllowCancellationFromPreTerminalStates(OrderStatus current) {
        Order order = onlineOrder(current);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.CANCELLED))
                .doesNotThrowAnyException();
    }

    // ----------------------------------------------------------------
    // ONLINE: valid non-fulfillment transitions
    // ----------------------------------------------------------------

    @Test
    void shouldAllowStockConflictToPaid() {
        Order order = onlineOrder(OrderStatus.STOCK_CONFLICT);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.PAID))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldAllowPaymentFailedToPendingPayment() {
        Order order = onlineOrder(OrderStatus.PAYMENT_FAILED);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.PENDING_PAYMENT))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldAllowPendingPaymentToPaid() {
        Order order = onlineOrder(OrderStatus.PENDING_PAYMENT);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.PAID))
                .doesNotThrowAnyException();
    }

    // ----------------------------------------------------------------
    // ONLINE: invalid forward transitions (skipping states)
    // ----------------------------------------------------------------

    @Test
    void shouldRejectPaidToReadySkippingPreparing() {
        Order order = onlineOrder(OrderStatus.PAID);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.READY))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("PAID")
                .hasMessageContaining("READY");
    }

    @Test
    void shouldRejectPaidToDeliveredSkippingAll() {
        Order order = onlineOrder(OrderStatus.PAID);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.DELIVERED))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectPreparingToDeliveredSkippingReady() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.DELIVERED))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectPendingPaymentToPreparingSkippingPaid() {
        Order order = onlineOrder(OrderStatus.PENDING_PAYMENT);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.PREPARING))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // Terminal states: no outgoing transitions
    // ----------------------------------------------------------------

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class)
    void shouldRejectAnyTransitionFromDelivered(OrderStatus target) {
        Order order = onlineOrder(OrderStatus.DELIVERED);
        assertThatThrownBy(() -> policy.validateTransition(order, target))
                .isInstanceOf(DomainException.class);
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class)
    void shouldRejectAnyTransitionFromCancelled(OrderStatus target) {
        Order order = onlineOrder(OrderStatus.CANCELLED);
        assertThatThrownBy(() -> policy.validateTransition(order, target))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // Backwards transitions (not allowed)
    // ----------------------------------------------------------------

    @Test
    void shouldRejectReadyToPreparing() {
        Order order = onlineOrder(OrderStatus.READY);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.PREPARING))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectDeliveredToReady() {
        Order order = onlineOrder(OrderStatus.DELIVERED);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.READY))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // POS orders: only PAID -> CANCELLED
    // ----------------------------------------------------------------

    @Test
    void shouldAllowPosPaidToCancelled() {
        Order order = posOrder(OrderStatus.PAID);
        assertThatCode(() -> policy.validateTransition(order, OrderStatus.CANCELLED))
                .doesNotThrowAnyException();
    }

    @Test
    void shouldRejectPosPaidToPreparing() {
        Order order = posOrder(OrderStatus.PAID);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.PREPARING))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("POS");
    }

    @Test
    void shouldRejectPosPaidToReady() {
        Order order = posOrder(OrderStatus.PAID);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.READY))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void shouldRejectPosPaidToDelivered() {
        Order order = posOrder(OrderStatus.PAID);
        assertThatThrownBy(() -> policy.validateTransition(order, OrderStatus.DELIVERED))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private Order onlineOrder(OrderStatus status) {
        Order order = new Order();
        order.setType(OrderType.ONLINE);
        order.setStatus(status);
        order.setOrderNumber("ON-20260706-000001");
        return order;
    }

    private Order posOrder(OrderStatus status) {
        Order order = new Order();
        order.setType(OrderType.POS);
        order.setStatus(status);
        order.setOrderNumber("PO-20260706-000001");
        return order;
    }
}
