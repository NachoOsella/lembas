package com.dietetica.lembas.payments;

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
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** PostgreSQL-backed schema tests for unified payments. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PaymentSchemaIntegrationTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private BranchRepository branchRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private CashSessionRepository cashSessionRepository;

    @Test
    void shouldPersistPendingMercadoPagoCheckoutPayment() {
        Order order = persistOnlineOrder("ON-20260612-PAY001");
        Payment payment = mercadoPagoPayment(order);

        Payment saved = paymentRepository.saveAndFlush(payment);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCurrency()).isEqualTo("ARS");
        assertThat(saved.getCashSessionId()).isNull();
    }

    @Test
    void shouldPersistApprovedManualCashPaymentWithCashSessionId() {
        Order order = persistPosOrder("POS-20260612-PAY001");
        Long cashSessionId = persistOpenCashSession(order.getBranch(), order.getCreatedByUser());
        Payment payment = manualPayment(order, PaymentMethod.CASH, cashSessionId);

        Payment saved = paymentRepository.saveAndFlush(payment);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(saved.getCashSessionId()).isEqualTo(cashSessionId);
    }

    @Test
    void shouldRejectNegativeAmount() {
        Order order = persistOnlineOrder("ON-20260612-PAY002");
        Payment payment = mercadoPagoPayment(order);
        payment.setAmount(new BigDecimal("-1.00"));

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(payment))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectMercadoPagoPaymentWithNonCheckoutMethod() {
        Order order = persistOnlineOrder("ON-20260612-PAY003");
        Payment payment = mercadoPagoPayment(order);
        payment.setMethod(PaymentMethod.QR);

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(payment))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectMercadoPagoPaymentWithCashSession() {
        Order order = persistOnlineOrder("ON-20260612-PAY004");
        Payment payment = mercadoPagoPayment(order);
        payment.setCashSessionId(200L);

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(payment))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectManualCheckoutProPayment() {
        Order order = persistPosOrder("POS-20260612-PAY002");
        Payment payment = manualPayment(order, PaymentMethod.CHECKOUT_PRO, 100L);

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(payment))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectManualPaymentWithoutCashSession() {
        Order order = persistPosOrder("POS-20260612-PAY003");
        Payment payment = manualPayment(order, PaymentMethod.CASH, null);

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(payment))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRejectDuplicateProviderPaymentId() {
        Order firstOrder = persistOnlineOrder("ON-20260612-PAY005");
        Payment first = mercadoPagoPayment(firstOrder);
        first.setProviderPaymentId("mp-payment-1");
        paymentRepository.saveAndFlush(first);

        Order secondOrder = persistOnlineOrder("ON-20260612-PAY006");
        Payment second = mercadoPagoPayment(secondOrder);
        second.setProviderPaymentId("mp-payment-1");

        assertThatThrownBy(() -> paymentRepository.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Payment mercadoPagoPayment(Order order) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("10.00"));
        payment.setExternalReference(order.getOrderNumber());
        return payment;
    }

    private Payment manualPayment(Order order, PaymentMethod method, Long cashSessionId) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(PaymentProvider.MANUAL);
        payment.setMethod(method);
        payment.setStatus(PaymentStatus.APPROVED);
        payment.setAmount(new BigDecimal("10.00"));
        payment.setCashSessionId(cashSessionId);
        return payment;
    }

    private Order persistOnlineOrder(String orderNumber) {
        Branch branch = defaultBranch();
        User customer = userRepository.saveAndFlush(new User(
                null, "customer-" + orderNumber + "@lembas.com", "h", "Customer", "Pay", null, Role.CUSTOMER));
        Order order = baseOrder(orderNumber, branch);
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setCustomerUser(customer);
        return orderRepository.saveAndFlush(order);
    }

    private Order persistPosOrder(String orderNumber) {
        Branch branch = defaultBranch();
        User employee = userRepository.saveAndFlush(new User(
                branch.getId(), "employee-" + orderNumber + "@lembas.com", "h", "Employee", "Pay", null, Role.EMPLOYEE));
        Order order = baseOrder(orderNumber, branch);
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setCreatedByUser(employee);
        return orderRepository.saveAndFlush(order);
    }

    private Order baseOrder(String orderNumber, Branch branch) {
        Product product = persistProduct("Payment product " + orderNumber, "PAY" + orderNumber.hashCode());
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item(product));
        return order;
    }

    private OrderItem item(Product product) {
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(new BigDecimal("10.00"));
        item.setProductNameSnapshot(product.getName());
        item.setProductBarcodeSnapshot(product.getBarcode());
        item.setCostPriceSnapshot(new BigDecimal("7.00"));
        return item;
    }

    private Product persistProduct(String name, String barcode) {
        Category category = categoryRepository.save(new Category("Payments " + name, null));
        Product product = new Product();
        product.setCategory(category);
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(new BigDecimal("10.00"));
        product.setMinimumStock(1);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        return productRepository.saveAndFlush(product);
    }

    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for payment tests"));
    }

    /** Persists an OPEN cash session so payments can reference it via the V27 foreign key. */
    private Long persistOpenCashSession(Branch branch, User opener) {
        CashSession session = new CashSession();
        session.setBranch(branch);
        session.setOpenedByUser(opener);
        session.setOpeningCashAmount(new BigDecimal("100.00"));
        session.setStatus(CashSessionStatus.OPEN);
        return cashSessionRepository.saveAndFlush(session).getId();
    }
}
