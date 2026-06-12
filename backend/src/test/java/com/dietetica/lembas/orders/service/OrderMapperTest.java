package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderItemDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the manual {@link OrderMapper}. */
class OrderMapperTest {

    private final OrderMapper mapper = new OrderMapper();

    @Test
    void summaryShouldExposeCustomerSnapshotAndBranch() {
        Order order = baseOrder();
        OrderSummaryDto dto = mapper.toSummaryDto(order);

        assertThat(dto.orderNumber()).isEqualTo("ON-20260612-000001");
        assertThat(dto.type()).isEqualTo(OrderType.ONLINE);
        assertThat(dto.status()).isEqualTo(OrderStatus.PAID);
        assertThat(dto.branchName()).isEqualTo("Centro");
        assertThat(dto.customerName()).isEqualTo("Snapshot Name");
        assertThat(dto.itemCount()).isEqualTo(1);
        assertThat(dto.total()).isEqualByComparingTo("100.00");
    }

    @Test
    void summaryShouldPreferUserFullNameWhenSnapshotMissing() {
        Order order = baseOrder();
        order.setCustomerNameSnapshot(null);

        OrderSummaryDto dto = mapper.toSummaryDto(order);

        assertThat(dto.customerName()).isEqualTo("First Last");
    }

    @Test
    void detailShouldIncludeAllItemsAndContactData() {
        Order order = baseOrder();
        OrderDetailDto dto = mapper.toDetailDto(order);

        assertThat(dto.items()).hasSize(1);
        OrderItemDto item = dto.items().getFirst();
        assertThat(item.productName()).isEqualTo("Yerba");
        assertThat(item.subtotalAmount()).isEqualByComparingTo("100.00");
        assertThat(dto.notes()).isEqualTo("Sin TACC");
        assertThat(dto.cancellationReason()).isEqualTo("customer changed mind");
    }

    @Test
    void detailWithNoItemsShouldReturnEmptyList() {
        Order order = baseOrder();
        order.getItems().clear();

        OrderDetailDto dto = mapper.toDetailDto(order);

        assertThat(dto.items()).isEmpty();
    }

    private Order baseOrder() {
        Branch branch = newBranch(10L, "Centro");

        User customer = new User(null, "c@lembas.com", "h", "First", "Last", null, Role.CUSTOMER);
        setField(customer, "id", 100L);

        OrderItem item = new OrderItem();
        item.setProduct(product("Yerba"));
        item.setQuantity(new BigDecimal("2"));
        item.setUnitPrice(new BigDecimal("50.00"));
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(new BigDecimal("100.00"));
        item.setProductNameSnapshot("Yerba");
        item.setProductBarcodeSnapshot("779001");
        item.setCostPriceSnapshot(new BigDecimal("30.00"));

        Order order = new Order();
        order.setOrderNumber("ON-20260612-000001");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PAID);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setCustomerNameSnapshot("Snapshot Name");
        order.setCustomerEmailSnapshot("snap@lembas.com");
        order.setCustomerPhoneSnapshot("+54 351 000-0000");
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("100.00"));
        order.setNotes("Sin TACC");
        order.setCancellationReason("customer changed mind");
        order.setPaidAt(OffsetDateTime.now());
        order.addItem(item);
        return order;
    }

    private Product product(String name) {
        Category category = new Category("Cat", null);
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode("779001");
        product.setSalePrice(new BigDecimal("50.00"));
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        return product;
    }

    private static Branch newBranch(long id, String name) {
        try {
            Constructor<Branch> ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch branch = ctor.newInstance();
            setField(branch, "id", id);
            setField(branch, "name", name);
            return branch;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Failed to instantiate Branch", ex);
        }
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Failed to set field " + fieldName, ex);
        }
    }
}
