package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.api.OrderCommand;
import com.dietetica.lembas.orders.api.OrderLock;
import com.dietetica.lembas.orders.api.OrderQuery;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.repository.OrderRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Orders-owned implementation of the application contracts used by other modules. */
@Service
public class OrderApplicationService implements OrderQuery, OrderCommand, OrderLock {

    private final OrderRepository orderRepository;

    public OrderApplicationService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public Optional<Order> findWithItemsById(Long orderId) {
        return orderRepository.findWithItemsById(orderId);
    }

    @Override
    public Order save(Order order) {
        return orderRepository.save(order);
    }

    @Override
    public Optional<Order> lockById(Long orderId) {
        return orderRepository.findByIdForUpdate(orderId);
    }
}
