package com.dietetica.lembas.orders.repository;

import com.dietetica.lembas.orders.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Repository for {@link OrderItem} entities. */
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** Returns the items of an order in stable insertion order. */
    List<OrderItem> findByOrderIdOrderByIdAsc(Long orderId);
}
