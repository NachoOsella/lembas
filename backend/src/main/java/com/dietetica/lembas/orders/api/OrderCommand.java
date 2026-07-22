package com.dietetica.lembas.orders.api;

import com.dietetica.lembas.orders.model.Order;

/** Order persistence commands published for cross-module orchestration. */
public interface OrderCommand {

    /** Persists the order within the caller's transaction. */
    Order save(Order order);
}
