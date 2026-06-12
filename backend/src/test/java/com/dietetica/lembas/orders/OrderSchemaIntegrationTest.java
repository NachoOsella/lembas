package com.dietetica.lembas.orders;

import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderItemRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL-backed schema tests for the unified orders model.
 *
 * <p>Verifies the database CHECK constraints and FK behaviour defined by
 * {@code V25__orders.sql}: ONLINE requires a customer, POS requires an employee,
 * POS only allows PAID or CANCELLED, item quantities/prices are non-negative,
 * and {@code order_number} is unique.</p>
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderSchemaIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private OrderItemRepository orderItemRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BranchRepository branchRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void shouldPersistValidOnlineOrderWithCustomerAndItems() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-online@lembas.com", "Customer", Role.CUSTOMER, null);
        Product product = persistProduct("Online order product", "779992000001");

        Order order = new Order();
        order.setOrderNumber("ON-20260612-000001");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setCustomerNameSnapshot("Customer Online");
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("100.00"));
        order.addItem(item(product, new BigDecimal("2"), new BigDecimal("50.00")));

        Order saved = orderRepository.saveAndFlush(order);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getItems()).hasSize(1);
        assertThat(orderItemRepository.findByOrderIdOrderByIdAsc(saved.getId())).hasSize(1);
    }

    @Test
    void shouldPersistValidPosOrderWithEmployee() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "employee-pos@lembas.com", "Employee", "Pos");
        Product product = persistProduct("Pos order product", "779992000002");

        Order order = new Order();
        order.setOrderNumber("POS-20260612-000001");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setBranch(branch);
        order.setCreatedByUser(employee);
        order.setSubtotal(new BigDecimal("75.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("75.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("75.00")));

        Order saved = orderRepository.saveAndFlush(order);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getType()).isEqualTo(OrderType.POS);
    }

    @Test
    void shouldRejectOnlineOrderWithoutCustomer() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "employee-c@lembas.com", "Emp", "C");
        Product product = persistProduct("Online no customer product", "779992000006");
        Order order = new Order();
        order.setOrderNumber("ON-20260612-999991");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setBranch(branch);
        order.setCreatedByUser(employee);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectPosOrderWithoutEmployee() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-only@lembas.com", "Customer", Role.CUSTOMER, null);
        Product product = persistProduct("Pos no employee product", "779992000007");
        Order order = new Order();
        order.setOrderNumber("POS-20260612-999991");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectPosOrderWithPreparingStatus() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "employee-state@lembas.com", "Emp", "State");
        Product product = persistProduct("Pos invalid status product", "779992000008");
        Order order = new Order();
        order.setOrderNumber("POS-20260612-999992");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PREPARING);
        order.setBranch(branch);
        order.setCreatedByUser(employee);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowPosOrderWithCancelledStatus() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "employee-cxl@lembas.com", "Emp", "Cxl");
        Product product = persistProduct("Pos cancelled product", "779992000009");
        Order order = new Order();
        order.setOrderNumber("POS-20260612-000010");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.CANCELLED);
        order.setBranch(branch);
        order.setCreatedByUser(employee);
        order.setCancellationReason("customer changed mind");
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatCode(() -> orderRepository.saveAndFlush(order)).doesNotThrowAnyException();
    }

    @Test
    void shouldRejectOrderWithNegativeSubtotal() {
        Branch branch = defaultBranch();
        User employee = persistEmployee(branch, "employee-n1@lembas.com", "Emp", "N1");
        Product product = persistProduct("Negative subtotal order product", "779992000010");
        Order order = new Order();
        order.setOrderNumber("POS-20260612-000020");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setBranch(branch);
        order.setCreatedByUser(employee);
        order.setSubtotal(new BigDecimal("-1.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product, BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectOrderWithoutBranch() {
        User customer = persistUser("customer-no-branch@lembas.com", "Customer", Role.CUSTOMER, null);
        Order order = new Order();
        order.setOrderNumber("ON-20260612-000030");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(itemWithoutProduct("No branch item", BigDecimal.ONE, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectOrderWithoutItems() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-no-items@lembas.com", "Customer", Role.CUSTOMER, null);
        Order order = new Order();
        order.setOrderNumber("ON-20260612-000040");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setTotal(new BigDecimal("10.00"));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .hasRootCauseInstanceOf(IllegalStateException.class)
                .hasRootCauseMessage("Order must contain at least one item");
    }

    @Test
    void shouldRejectOrderItemWithZeroQuantity() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-z@lembas.com", "Customer", Role.CUSTOMER, null);
        Product product = persistProduct("Zero qty product", "779992000003");

        Order order = baseOrder(branch, customer, "ON-20260612-100000");
        order.addItem(item(product, BigDecimal.ZERO, new BigDecimal("10.00")));

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectOrderItemWithNegativeSubtotal() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-n2@lembas.com", "Customer", Role.CUSTOMER, null);
        Product product = persistProduct("Negative subtotal product", "779992000004");

        Order order = baseOrder(branch, customer, "ON-20260612-100001");
        OrderItem item = item(product, new BigDecimal("1"), new BigDecimal("10.00"));
        item.setSubtotalAmount(new BigDecimal("-5.00"));
        order.addItem(item);

        assertThatThrownBy(() -> orderRepository.saveAndFlush(order))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectDuplicateOrderNumber() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-dup@lembas.com", "Customer", Role.CUSTOMER, null);

        Order first = baseOrder(branch, customer, "ON-20260612-200000");
        orderRepository.saveAndFlush(first);

        Order second = baseOrder(branch, customer, "ON-20260612-200000");
        assertThatThrownBy(() -> orderRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldCascadeDeleteItemsWhenOrderIsRemoved() {
        Branch branch = defaultBranch();
        User customer = persistUser("customer-cascade@lembas.com", "Customer", Role.CUSTOMER, null);
        Product product = persistProduct("Cascade product", "779992000005");

        Order order = baseOrder(branch, customer, "ON-20260612-300000");
        order.addItem(item(product, new BigDecimal("1"), new BigDecimal("10.00")));
        Order saved = orderRepository.saveAndFlush(order);

        orderRepository.deleteById(saved.getId());
        orderRepository.flush();

        assertThat(orderItemRepository.findByOrderIdOrderByIdAsc(saved.getId())).isEmpty();
    }

    // ---------------------------------------------------------------------
    // Test fixtures
    // ---------------------------------------------------------------------

    private Order baseOrder(Branch branch, User customer, String orderNumber) {
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setCustomerNameSnapshot(customer.getFirstName() + " " + customer.getLastName());
        order.setSubtotal(new BigDecimal("10.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(itemWithoutProduct("Default item", BigDecimal.ONE, new BigDecimal("10.00")));
        return order;
    }

    private OrderItem itemWithoutProduct(String name, BigDecimal quantity, BigDecimal unitPrice) {
        OrderItem item = new OrderItem();
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(quantity.multiply(unitPrice));
        item.setProductNameSnapshot(name);
        return item;
    }

    private OrderItem item(Product product, BigDecimal quantity, BigDecimal unitPrice) {
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(quantity.multiply(unitPrice));
        item.setProductNameSnapshot(product.getName());
        item.setProductBarcodeSnapshot(product.getBarcode());
        item.setCostPriceSnapshot(product.getSalePrice());
        return item;
    }

    private User persistUser(String email, String firstName, Role role, Long branchId) {
        User user = new User(branchId, email, "hashed", firstName, "Last",
                null, role);
        return userRepository.saveAndFlush(user);
    }

    private User persistEmployee(Branch branch, String email, String firstName, String lastName) {
        User user = new User(branch.getId(), email, "hashed", firstName, lastName,
                null, Role.EMPLOYEE);
        return userRepository.saveAndFlush(user);
    }

    private Product persistProduct(String name, String barcode) {
        Category category = categoryRepository.save(new Category("Orders " + name, null));
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(new BigDecimal("100.00"));
        product.setMinimumStock(1);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        return productRepository.saveAndFlush(product);
    }

    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for orders tests"));
    }
}
