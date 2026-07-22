package com.dietetica.lembas.orders.api;

import com.dietetica.lembas.orders.model.Order;
import java.util.Optional;

/** Order reads published for use cases owned by other feature modules. */
public interface OrderQuery {

    /** Finds an order with the items and associations required by downstream use cases. */
    Optional<Order> findWithItemsById(Long orderId);
}
