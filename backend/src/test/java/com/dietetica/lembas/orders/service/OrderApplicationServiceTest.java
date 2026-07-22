package com.dietetica.lembas.orders.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.repository.OrderRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Unit tests for the orders-owned cross-module application contracts. */
class OrderApplicationServiceTest {

    private OrderRepository orderRepository;
    private OrderApplicationService service;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        service = new OrderApplicationService(orderRepository);
    }

    @Test
    void findWithItemsByIdDelegatesToTheOrdersRepository() {
        Order order = new Order();
        when(orderRepository.findWithItemsById(1L)).thenReturn(Optional.of(order));

        assertThat(service.findWithItemsById(1L)).containsSame(order);
    }

    @Test
    void saveDelegatesWithinTheCallerTransaction() {
        Order order = new Order();
        when(orderRepository.save(order)).thenReturn(order);

        assertThat(service.save(order)).isSameAs(order);
    }

    @Test
    void lockByIdUsesThePessimisticRepositoryQuery() {
        Order order = new Order();
        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));

        assertThat(service.lockById(1L)).containsSame(order);
        verify(orderRepository).findByIdForUpdate(1L);
    }
}
