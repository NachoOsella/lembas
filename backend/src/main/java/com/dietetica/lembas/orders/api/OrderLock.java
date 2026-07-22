package com.dietetica.lembas.orders.api;

import com.dietetica.lembas.orders.model.Order;
import java.util.Optional;

/** Pessimistic order locking published for cross-module lifecycle coordination. */
public interface OrderLock {

    /** Locks and re-reads an order within the caller's transaction. */
    Optional<Order> lockById(Long orderId);
}
