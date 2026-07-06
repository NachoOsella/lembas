package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Set;

/**
 * Validates that order state transitions follow the documented state machine.
 *
 * <p>ONLINE orders traverse the full lifecycle (PAID -> PREPARING -> READY ->
 * DELIVERED). POS orders are created directly as PAID and can only move to
 * CANCELLED. The policy is a pure domain class with no Spring dependencies,
 * making it straightforward to unit-test exhaustively.</p>
 *
 * <p>The transition map is read from {@code docs/02-domain/order-rules.md}
 * and {@code docs/02-domain/state-machines.md}.</p>
 */
public class OrderStatePolicy {

    private static final String CODE_INVALID_STATE = "ORDER_INVALID_STATE";

    /**
     * Allowed transitions from each source status.
     * Terminal states ({@code DELIVERED}, {@code CANCELLED}) have empty sets.
     */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            OrderStatus.PENDING_PAYMENT, Set.of(OrderStatus.PAID, OrderStatus.CANCELLED),
            OrderStatus.PAID,            Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
            OrderStatus.PREPARING,       Set.of(OrderStatus.READY, OrderStatus.CANCELLED),
            OrderStatus.READY,           Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            OrderStatus.DELIVERED,       Set.of(),
            OrderStatus.CANCELLED,       Set.of(),
            OrderStatus.PAYMENT_FAILED,  Set.of(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED),
            OrderStatus.STOCK_CONFLICT,  Set.of(OrderStatus.PAID, OrderStatus.CANCELLED)
    );

    /**
     * Validates that {@code order} can transition to {@code target}.
     *
     * <p>POS orders are only allowed to transition between PAID and CANCELLED.
     * ONLINE orders follow the full state machine defined in {@link #ALLOWED}.</p>
     *
     * @param order  the order to validate (must not be null)
     * @param target the desired target status
     * @throws DomainException if the transition is not allowed
     */
    public void validateTransition(Order order, OrderStatus target) {
        if (order == null) {
            throw new DomainException(CODE_INVALID_STATE, HttpStatus.CONFLICT,
                    "Cannot validate transition for a null order");
        }

        OrderStatus current = order.getStatus();

        // POS orders can only be PAID or CANCELLED; any other target is illegal.
        if (order.getType() == OrderType.POS && target != OrderStatus.CANCELLED) {
            throw new DomainException(CODE_INVALID_STATE, HttpStatus.CONFLICT,
                    "POS orders can only be cancelled; they do not go through preparation states");
        }

        Set<OrderStatus> allowedTargets = ALLOWED.getOrDefault(current, Set.of());
        if (!allowedTargets.contains(target)) {
            throw new DomainException(CODE_INVALID_STATE, HttpStatus.CONFLICT,
                    "Cannot transition order " + order.getOrderNumber()
                            + " from " + current + " to " + target);
        }
    }
}
