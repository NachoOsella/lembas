package com.dietetica.lembas.orders.repository;

import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** PostgreSQL-backed tests for {@link OrderRepository} lookups. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BranchRepository branchRepository;

    @Test
    void findByOrderNumberShouldReturnPersistedOrder() {
        Order order = persistOrder("ON-20260612-000099");

        Optional<Order> found = orderRepository.findByOrderNumber("ON-20260612-000099");

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(order.getId());
        assertThat(orderRepository.existsByOrderNumber("ON-20260612-000099")).isTrue();
        assertThat(orderRepository.existsByOrderNumber("ON-20260612-999999")).isFalse();
    }

    @Test
    void findWithItemsByIdShouldFetchItemsAndReferences() {
        Order order = persistOrder("ON-20260612-000100");

        Optional<Order> found = orderRepository.findWithItemsById(order.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getItems()).hasSize(1);
        assertThat(found.get().getCustomerUser()).isNotNull();
    }

    private Order persistOrder(String orderNumber) {
        Branch branch = defaultBranch();
        User customer = userRepository.saveAndFlush(new User(
                null, "customer-repo@lembas.com", "h", "Cust", "Repo", null, Role.CUSTOMER));
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item("Yerba", "1", "10.00"));
        return orderRepository.saveAndFlush(order);
    }

    private OrderItem item(String name, String quantity, String unitPrice) {
        OrderItem item = new OrderItem();
        item.setQuantity(new BigDecimal(quantity));
        item.setUnitPrice(new BigDecimal(unitPrice));
        item.setSubtotalAmount(new BigDecimal(quantity).multiply(new BigDecimal(unitPrice)));
        item.setProductNameSnapshot(name);
        return item;
    }

    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required"));
    }
}
