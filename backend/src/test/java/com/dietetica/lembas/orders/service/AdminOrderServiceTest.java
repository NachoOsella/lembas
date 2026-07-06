package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AdminOrderService} lifecycle transitions.
 */
@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderMapper orderMapper;

    @InjectMocks
    private AdminOrderService adminOrderService;

    // ----------------------------------------------------------------
    // prepare
    // ----------------------------------------------------------------

    @Test
    void shouldPrepareOnlineOrderInPaidStatus() {
        Order order = onlineOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.prepare(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(order.getPreparedAt()).isNotNull();
    }

    @Test
    void shouldRejectPrepareWhenOrderNotFound() {
        when(orderRepository.findWithItemsById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminOrderService.prepare(99L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void shouldRejectPrepareWhenAlreadyPreparing() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.prepare(1L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("PREPARING");
    }

    @Test
    void shouldRejectPrepareForPosOrder() {
        Order order = posOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.prepare(1L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("POS");
    }

    // ----------------------------------------------------------------
    // markReady
    // ----------------------------------------------------------------

    @Test
    void shouldMarkReadyFromPreparing() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.markReady(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.READY);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(order.getReadyAt()).isNotNull();
    }

    @Test
    void shouldRejectMarkReadyWhenNotPreparing() {
        Order order = onlineOrder(OrderStatus.PAID);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.markReady(1L))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // deliver
    // ----------------------------------------------------------------

    @Test
    void shouldDeliverFromReady() {
        Order order = onlineOrder(OrderStatus.READY);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDetailDto(any(Order.class))).thenAnswer(inv -> dummyDto(inv.getArgument(0)));

        OrderDetailDto result = adminOrderService.deliver(1L);

        assertThat(result.status()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(order.getDeliveredAt()).isNotNull();
    }

    @Test
    void shouldRejectDeliverWhenNotReady() {
        Order order = onlineOrder(OrderStatus.PREPARING);
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.deliver(1L))
                .isInstanceOf(DomainException.class);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private Order onlineOrder(OrderStatus status) {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber("ON-20260706-000001");
        order.setType(OrderType.ONLINE);
        order.setStatus(status);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(new BigDecimal("1500.00"));
        order.setTotal(new BigDecimal("1500.00"));
        // Avoid the @PrePersist validation that checks for items
        order.setItems(Collections.emptyList());
        return order;
    }

    private Order posOrder(OrderStatus status) {
        Order order = onlineOrder(status);
        order.setType(OrderType.POS);
        order.setOrderNumber("PO-20260706-000001");
        return order;
    }

    private OrderDetailDto dummyDto(Order order) {
        return new OrderDetailDto(
                order.getId(),
                order.getOrderNumber(),
                order.getType(),
                order.getStatus(),
                order.getFulfillmentType(),
                null, null, null, null, null, null,
                null, null,
                order.getSubtotal(),
                order.getDiscountTotal(),
                order.getTotal(),
                null, null,
                Collections.emptyList(),
                Collections.emptyList(),
                order.getPaidAt(),
                order.getPreparedAt(),
                order.getReadyAt(),
                order.getDeliveredAt(),
                order.getCancelledAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
