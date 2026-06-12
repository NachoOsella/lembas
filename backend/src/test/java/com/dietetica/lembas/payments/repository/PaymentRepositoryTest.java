package com.dietetica.lembas.payments.repository;

import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
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

import static org.assertj.core.api.Assertions.assertThat;

/** PostgreSQL-backed tests for {@link PaymentRepository} lookups. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PaymentRepositoryTest {

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

    @Test
    void findByOrderIdShouldReturnPaymentsInInsertionOrder() {
        Order order = persistOrder("ON-20260612-REPO01");
        Payment first = payment(order, PaymentStatus.PENDING, null);
        Payment second = payment(order, PaymentStatus.IN_PROCESS, "mp-123");
        paymentRepository.saveAndFlush(first);
        paymentRepository.saveAndFlush(second);

        assertThat(paymentRepository.findByOrderIdOrderByIdAsc(order.getId()))
                .extracting(Payment::getProviderPaymentId)
                .containsExactly(null, "mp-123");
    }

    @Test
    void findByOrderIdAndStatusShouldFilterPayments() {
        Order order = persistOrder("ON-20260612-REPO02");
        paymentRepository.save(payment(order, PaymentStatus.PENDING, null));
        paymentRepository.saveAndFlush(payment(order, PaymentStatus.APPROVED, "mp-456"));

        assertThat(paymentRepository.findByOrderIdAndStatusOrderByIdAsc(order.getId(), PaymentStatus.APPROVED))
                .hasSize(1)
                .first()
                .extracting(Payment::getProviderPaymentId)
                .isEqualTo("mp-456");
    }

    @Test
    void findByProviderPaymentIdShouldReturnPayment() {
        Order order = persistOrder("ON-20260612-REPO03");
        paymentRepository.saveAndFlush(payment(order, PaymentStatus.APPROVED, "mp-789"));

        assertThat(paymentRepository.findByProviderPaymentId("mp-789")).isPresent();
        assertThat(paymentRepository.findByProviderPaymentId("missing")).isEmpty();
    }

    private Payment payment(Order order, PaymentStatus status, String providerPaymentId) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(status);
        payment.setAmount(new BigDecimal("10.00"));
        payment.setProviderPaymentId(providerPaymentId);
        return payment;
    }

    private Order persistOrder(String orderNumber) {
        Branch branch = branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required"));
        User customer = userRepository.saveAndFlush(new User(
                null, "customer-" + orderNumber + "@lembas.com", "h", "Customer", "Repo", null, Role.CUSTOMER));
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setSubtotal(new BigDecimal("10.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("10.00"));
        order.addItem(item());
        return orderRepository.saveAndFlush(order);
    }

    private OrderItem item() {
        OrderItem item = new OrderItem();
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("10.00"));
        item.setDiscountAmount(BigDecimal.ZERO);
        item.setSubtotalAmount(new BigDecimal("10.00"));
        item.setProductNameSnapshot("Payment repo item");
        return item;
    }
}
