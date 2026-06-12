package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderItemDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.users.model.User;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Manual mapper from {@link Order} entities to DTOs.
 *
 * <p>Kept package-private on purpose: only the orders service classes need it.
 * Avoids MapStruct to keep dependencies low and behavior explicit.</p>
 */
@Component
class OrderMapper {

    /** Builds a lightweight summary row from an order aggregate. */
    OrderSummaryDto toSummaryDto(Order order) {
        return new OrderSummaryDto(
                order.getId(),
                order.getOrderNumber(),
                order.getType(),
                order.getStatus(),
                order.getFulfillmentType(),
                branchId(order.getBranch()),
                branchName(order.getBranch()),
                userId(order.getCustomerUser()),
                customerName(order),
                userId(order.getCreatedByUser()),
                userFullName(order.getCreatedByUser()),
                order.getSubtotal(),
                order.getDiscountTotal(),
                order.getTotal(),
                order.getItems() == null ? 0 : order.getItems().size(),
                order.getPaidAt(),
                order.getDeliveredAt(),
                order.getCreatedAt()
        );
    }

    /** Builds a full detail DTO from an order aggregate. */
    OrderDetailDto toDetailDto(Order order) {
        List<OrderItemDto> items = order.getItems() == null
                ? List.of()
                : order.getItems().stream().map(this::toItemDto).toList();
        return new OrderDetailDto(
                order.getId(),
                order.getOrderNumber(),
                order.getType(),
                order.getStatus(),
                order.getFulfillmentType(),
                branchId(order.getBranch()),
                branchName(order.getBranch()),
                userId(order.getCustomerUser()),
                customerName(order),
                order.getCustomerEmailSnapshot(),
                order.getCustomerPhoneSnapshot(),
                userId(order.getCreatedByUser()),
                userFullName(order.getCreatedByUser()),
                order.getSubtotal(),
                order.getDiscountTotal(),
                order.getTotal(),
                order.getNotes(),
                order.getCancellationReason(),
                items,
                order.getPaidAt(),
                order.getPreparedAt(),
                order.getDeliveredAt(),
                order.getCancelledAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    /** Maps a single line item. */
    OrderItemDto toItemDto(OrderItem item) {
        Long productId = item.getProduct() == null ? null : item.getProduct().getId();
        return new OrderItemDto(
                item.getId(),
                productId,
                item.getProductNameSnapshot(),
                item.getProductBarcodeSnapshot(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDiscountAmount(),
                item.getSubtotalAmount()
        );
    }

    private static Long branchId(Branch branch) {
        return branch == null ? null : branch.getId();
    }

    private static String branchName(Branch branch) {
        return branch == null ? null : branch.getName();
    }

    private static Long userId(User user) {
        return user == null ? null : user.getId();
    }

    private static String userFullName(User user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        return (first + " " + last).trim();
    }

    /** Prefers the snapshot so historical reports stay stable when the user is updated. */
    private static String customerName(Order order) {
        String snapshot = order.getCustomerNameSnapshot();
        if (snapshot != null && !snapshot.isBlank()) {
            return snapshot;
        }
        return userFullName(order.getCustomerUser());
    }
}
