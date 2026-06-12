package com.dietetica.lembas.orders.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the in-memory behaviour of the {@link Order} aggregate. */
class OrderTest {

    @Test
    void addItemShouldKeepBidirectionalAssociation() {
        Order order = new Order();
        OrderItem item = new OrderItem();
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setSubtotalAmount(new BigDecimal("10.00"));
        item.setProductNameSnapshot("Yerba");

        order.addItem(item);

        assertThat(order.getItems()).containsExactly(item);
        assertThat(item.getOrder()).isSameAs(order);
    }

    @Test
    void replaceItemsShouldClearAndAddNewItems() {
        Order order = new Order();
        order.addItem(item("Yerba", "1", "10.00"));
        order.addItem(item("Mate", "2", "5.00"));

        OrderItem replacement = item("Azucar", "3", "8.00");
        order.replaceItems(List.of(replacement));

        assertThat(order.getItems()).containsExactly(replacement);
        assertThat(replacement.getOrder()).isSameAs(order);
    }

    @Test
    void replaceItemsWithNullListShouldClearItems() {
        Order order = new Order();
        order.addItem(item("Yerba", "1", "10.00"));

        order.replaceItems(null);

        assertThat(order.getItems()).isEmpty();
    }

    private static OrderItem item(String name, String quantity, String unitPrice) {
        OrderItem item = new OrderItem();
        item.setQuantity(new BigDecimal(quantity));
        item.setUnitPrice(new BigDecimal(unitPrice));
        item.setSubtotalAmount(new BigDecimal(quantity).multiply(new BigDecimal(unitPrice)));
        item.setProductNameSnapshot(name);
        return item;
    }
}
