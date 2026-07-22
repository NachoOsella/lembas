package com.dietetica.lembas.payments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.orders.api.OrderQuery;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Unit tests for {@link PreferenceService}.
 *
 * <p>Covers the documented acceptance criteria: happy path, idempotency,
 * invalid states, ownership checks, and gateway error translation.</p>
 */
class PreferenceServiceTest {

    private OrderQuery orderQuery;
    private PaymentRepository paymentRepository;
    private PaymentGateway paymentGateway;
    private PreferenceService service;

    private final MercadoPagoProperties properties = new MercadoPagoProperties(
            "test-token",
            "test-secret",
            "https://api.mercadopago.com",
            "https://ok",
            "https://fail",
            "https://pending",
            "https://notify",
            5000L);

    @BeforeEach
    void setUp() {
        orderQuery = mock(OrderQuery.class);
        paymentRepository = mock(PaymentRepository.class);
        paymentGateway = mock(PaymentGateway.class);
        service = new PreferenceService(orderQuery, paymentRepository, paymentGateway, properties, new ObjectMapper());
    }

    @Test
    void shouldCreatePreferenceForPendingOnlineOrder() {
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(List.of());
        when(paymentGateway.createPreference(any()))
                .thenReturn(new PaymentPreferenceResult("PREF-1", "https://init/PREF-1", "https://sandbox/PREF-1"));
        when(paymentRepository.save(any())).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            payment.setId(99L);
            return payment;
        });

        CreatePreferenceResponse response = service.createPreference(order.getId(), customer);

        assertThat(response.preferenceId()).isEqualTo("PREF-1");
        assertThat(response.initPoint()).isEqualTo("https://init/PREF-1");
        assertThat(response.paymentId()).isEqualTo(99L);
        ArgumentCaptor<CreatePreferenceCommand> commandCaptor = ArgumentCaptor.forClass(CreatePreferenceCommand.class);
        verify(paymentGateway).createPreference(commandCaptor.capture());
        assertThat(commandCaptor.getValue().orderId()).isEqualTo(order.getId());
        assertThat(commandCaptor.getValue().items()).hasSize(1);
    }

    @Test
    void shouldCancelExistingPendingPaymentAndCreateFreshPreference() {
        // MP Checkout Pro preferences are single-use, so every "Continuar al
        // pago" click must cancel any open payment and ask the gateway for a
        // new preference. The previous preference id is intentionally
        // discarded -- reusing it would produce a generic MP error screen.
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        Payment existing = new Payment();
        existing.setId(7L);
        existing.setOrder(order);
        existing.setProvider(PaymentProvider.MERCADO_PAGO);
        existing.setMethod(PaymentMethod.CHECKOUT_PRO);
        existing.setStatus(PaymentStatus.PENDING);
        existing.setAmount(order.getTotal());
        existing.setProviderPreferenceId("1234567890");
        existing.setMetadata("{\"initPoint\":\"https://init/1234567890\"}");

        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(List.of(existing));
        when(paymentRepository.save(any())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId(99L);
            }
            return p;
        });
        when(paymentGateway.createPreference(any()))
                .thenReturn(new PaymentPreferenceResult("NEW-PREF", "https://init/NEW-PREF", null));

        CreatePreferenceResponse response = service.createPreference(order.getId(), customer);

        assertThat(existing.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(response.preferenceId()).isEqualTo("NEW-PREF");
        assertThat(response.initPoint()).isEqualTo("https://init/NEW-PREF");
        verify(paymentGateway).createPreference(any());
    }

    @Test
    void shouldCancelStalePreferenceAndCreateFreshOne() {
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        // Simulate a pending payment left behind by a previous checkout attempt
        // (for example, the customer navigated away and never paid). MP
        // Checkout Pro preferences are single-use, so the next attempt must
        // cancel the stale one and create a fresh preference.
        Payment stale = new Payment();
        stale.setId(8L);
        stale.setOrder(order);
        stale.setProvider(PaymentProvider.MERCADO_PAGO);
        stale.setMethod(PaymentMethod.CHECKOUT_PRO);
        stale.setStatus(PaymentStatus.PENDING);
        stale.setAmount(order.getTotal());
        stale.setProviderPreferenceId("1234567890");

        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(List.of(stale));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentGateway.createPreference(any()))
                .thenReturn(new PaymentPreferenceResult("MP-REAL-1", "https://init/MP-REAL-1", null));

        CreatePreferenceResponse response = service.createPreference(order.getId(), customer);

        // The stale payment was cancelled and a new one was created.
        assertThat(stale.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(response.preferenceId()).isEqualTo("MP-REAL-1");
        assertThat(response.initPoint()).isEqualTo("https://init/MP-REAL-1");
        verify(paymentGateway, times(1)).createPreference(any());
    }

    @Test
    void shouldRejectAccessWhenUserIsNotCustomer() {
        User admin = new User(1L, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        assertThatThrownBy(() -> service.createPreference(1L, admin))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Only customers");
        verify(orderQuery, never()).findWithItemsById(any());
    }

    @Test
    void shouldReturnOrderNotFoundWhenOrderMissing() {
        User customer = customer(10L);
        when(orderQuery.findWithItemsById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createPreference(99L, customer))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    void shouldReturnOrderNotFoundWhenOrderBelongsToAnotherCustomer() {
        User customer = customer(10L);
        User otherCustomer = customer(99L);
        Order order = orderForCustomer(otherCustomer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.createPreference(order.getId(), customer))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    void shouldRejectPosOrders() {
        User customer = customer(10L);
        Order posOrder = orderForCustomer(customer, OrderStatus.PAID, OrderType.POS);
        when(orderQuery.findWithItemsById(posOrder.getId())).thenReturn(Optional.of(posOrder));

        assertThatThrownBy(() -> service.createPreference(posOrder.getId(), customer))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("online orders");
    }

    @Test
    void shouldRejectOrderNotInPendingPayment() {
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PAID, OrderType.ONLINE);
        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.createPreference(order.getId(), customer))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("payable");
    }

    @Test
    void shouldPropagateGatewayErrors() {
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(List.of());
        when(paymentGateway.createPreference(any()))
                .thenThrow(new DomainException("MP_PREFERENCE_REJECTED", "rejected"));

        assertThatThrownBy(() -> service.createPreference(order.getId(), customer))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("rejected");
        verify(paymentRepository, times(1))
                .findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS));
    }

    @Test
    void shouldFallbackToSandboxInitPointWhenProductionMissing() {
        User customer = customer(10L);
        Order order = orderForCustomer(customer, OrderStatus.PENDING_PAYMENT, OrderType.ONLINE);
        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                        order.getId(),
                        PaymentProvider.MERCADO_PAGO,
                        List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(List.of());
        when(paymentGateway.createPreference(any()))
                .thenReturn(new PaymentPreferenceResult("PREF-2", null, "https://sandbox/PREF-2"));
        when(paymentRepository.save(any())).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            payment.setId(123L);
            return payment;
        });

        CreatePreferenceResponse response = service.createPreference(order.getId(), customer);

        assertThat(response.initPoint()).isEqualTo("https://sandbox/PREF-2");
    }

    private static User customer(long id) {
        return setId(
                new User(null, "c" + id + "@lembas.com", "hash", "Test", "Customer", "+54 351 123", Role.CUSTOMER), id);
    }

    /** Sets the auto-generated id on a User via reflection for unit tests. */
    private static User setId(User user, long id) {
        try {
            java.lang.reflect.Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
            return user;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot set User id for tests", ex);
        }
    }

    private static Order orderForCustomer(User customer, OrderStatus status, OrderType type) {
        Order order = new Order();
        order.setId(42L);
        order.setOrderNumber("ON-20260612-000042");
        order.setType(type);
        order.setStatus(status);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(new BigDecimal("1500.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("1500.00"));
        order.setCustomerUser(customer);
        order.setCustomerEmailSnapshot(customer.getEmail());
        order.setCustomerNameSnapshot("Test Customer");
        order.setBranch(branchWithId(1L, "Centro"));
        OrderItem item = new OrderItem();
        item.setId(1L);
        item.setOrder(order);
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(new BigDecimal("1500.00"));
        item.setSubtotalAmount(new BigDecimal("1500.00"));
        item.setProductNameSnapshot("Almendras 1kg");
        order.addItem(item);
        return order;
    }

    /** Builds a Branch with id/name populated via reflection (no public setters). */
    private static Branch branchWithId(long id, String name) {
        try {
            java.lang.reflect.Constructor<Branch> ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch branch = ctor.newInstance();
            java.lang.reflect.Field idField = Branch.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(branch, id);
            java.lang.reflect.Field nameField = Branch.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(branch, name);
            return branch;
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot build Branch for tests", ex);
        }
    }
}
