package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link MercadoPagoWebhookProcessor}.
 *
 * <p>Covers: happy path approval, duplicate webhook idempotency, rejection,
 * missing provider record, type!=payment no-op, and STOCK_CONFLICT propagation
 * via the order effect applier.</p>
 */
class MercadoPagoWebhookProcessorTest {

    private PaymentRepository paymentRepository;
    private OrderRepository orderRepository;
    private PaymentGateway paymentGateway;
    private WebhookToPaymentStatusMapper mapper;
    private WebhookOrderEffectApplier applier;
    private MercadoPagoWebhookProcessor processor;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        orderRepository = mock(OrderRepository.class);
        paymentGateway = mock(PaymentGateway.class);
        mapper = new WebhookToPaymentStatusMapper();
        applier = mock(WebhookOrderEffectApplier.class);
        processor = new MercadoPagoWebhookProcessor(paymentRepository, orderRepository, paymentGateway, mapper, applier);
    }

    @Test
    void shouldApprovePaymentAndApplyOrderEffectOnApprovedWebhook() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);

        when(paymentGateway.findPayment("PAY-1")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-1", "approved", new BigDecimal("1500.00"), "ARS", Map.of("preference_id", "PREF-1"))));
        when(paymentRepository.findByProviderPaymentId("PAY-1")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MercadoPagoWebhookPayload payload = payload("payment", "PAY-1", "PAY-1");
        Optional<Long> result = processor.process(payload);

        assertThat(result).contains(payment.getId());
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        verify(applier, times(1)).markPaidAndDeductStock(order);
        verify(applier, never()).markPaymentFailed(any(), any());
    }

    @Test
    void shouldBeIdempotentWhenPaymentAlreadyTerminal() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);
        payment.setStatus(PaymentStatus.APPROVED);

        when(paymentGateway.findPayment("PAY-1")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-1", "approved", new BigDecimal("1500.00"), "ARS", Map.of())));
        when(paymentRepository.findByProviderPaymentId("PAY-1")).thenReturn(Optional.of(payment));

        Optional<Long> result = processor.process(payload("payment", "PAY-1", "PAY-1"));

        assertThat(result).contains(payment.getId());
        verify(paymentRepository, never()).save(any());
        verify(applier, never()).markPaidAndDeductStock(any());
    }

    @Test
    void shouldMatchPendingPaymentByExternalReferenceWhenProviderPaymentIdIsNew() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);
        payment.setExternalReference(order.getOrderNumber());

        when(paymentGateway.findPayment("PAY-EXT")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-EXT", "approved", new BigDecimal("1500.00"), "ARS",
                        Map.of("external_reference", order.getOrderNumber()))));
        when(paymentRepository.findByProviderPaymentId("PAY-EXT")).thenReturn(Optional.empty());
        when(paymentRepository.findFirstByExternalReferenceOrderByIdAsc(order.getOrderNumber()))
                .thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Optional<Long> result = processor.process(payload("payment", "PAY-EXT", "PAY-EXT"));

        assertThat(result).contains(payment.getId());
        assertThat(payment.getProviderPaymentId()).isEqualTo("PAY-EXT");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.APPROVED);
        verify(applier).markPaidAndDeductStock(order);
    }

    @Test
    void shouldMatchHistoricalPendingPaymentByOrderNumberWhenExternalReferenceWasNotStored() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);

        when(paymentGateway.findPayment("PAY-OLD")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-OLD", "approved", new BigDecimal("1500.00"), "ARS",
                        Map.of("external_reference", order.getOrderNumber()))));
        when(paymentRepository.findByProviderPaymentId("PAY-OLD")).thenReturn(Optional.empty());
        when(paymentRepository.findFirstByExternalReferenceOrderByIdAsc(order.getOrderNumber()))
                .thenReturn(Optional.empty());
        when(paymentRepository.findFirstByOrderOrderNumberAndStatusInOrderByIdAsc(
                order.getOrderNumber(), List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)))
                .thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Optional<Long> result = processor.process(payload("payment", "PAY-OLD", "PAY-OLD"));

        assertThat(result).contains(payment.getId());
        assertThat(payment.getExternalReference()).isEqualTo(order.getOrderNumber());
        assertThat(payment.getProviderPaymentId()).isEqualTo("PAY-OLD");
        verify(applier).markPaidAndDeductStock(order);
    }

    @Test
    void shouldMarkPaymentFailedWhenProviderRejects() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);

        when(paymentGateway.findPayment("PAY-2")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-2", "rejected", new BigDecimal("1500.00"), "ARS", Map.of())));
        when(paymentRepository.findByProviderPaymentId("PAY-2")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Optional<Long> result = processor.process(payload("payment", "PAY-2", "PAY-2"));

        assertThat(result).contains(payment.getId());
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REJECTED);
        verify(applier).markPaymentFailed(order, payment);
    }

    @Test
    void shouldReturnEmptyWhenProviderHasNoRecord() {
        when(paymentGateway.findPayment("PAY-X")).thenReturn(Optional.empty());

        Optional<Long> result = processor.process(payload("payment", "PAY-X", "PAY-X"));

        assertThat(result).isEmpty();
        verify(paymentRepository, never()).findByProviderPaymentId(any());
    }

    @Test
    void shouldReturnEmptyWhenPayloadHasNoPaymentId() {
        Optional<Long> result = processor.process(
                new MercadoPagoWebhookPayload("plan", null, null, null, null, null));

        assertThat(result).isEmpty();
        verify(paymentGateway, never()).findPayment(any());
    }

    @Test
    void shouldNotProcessWhenTypeIsNotPayment() {
        Optional<Long> result = processor.process(payload("plan", null, null));

        assertThat(result).isEmpty();
        verify(paymentGateway, never()).findPayment(any());
    }

    @Test
    void shouldThrowWhenPaymentCannotBeMatchedLocally() {
        when(paymentGateway.findPayment("PAY-9")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-9", "approved", new BigDecimal("1500.00"), "ARS", Map.of())));
        when(paymentRepository.findByProviderPaymentId("PAY-9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> processor.process(payload("payment", "PAY-9", "PAY-9")))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("PAYMENT_NOT_FOUND");
    }

    @Test
    void shouldFallbackToInProcessWhenProviderStatusUnknown() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);

        when(paymentGateway.findPayment("PAY-3")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-3", "some-future-status", new BigDecimal("1500.00"), "ARS", Map.of())));
        when(paymentRepository.findByProviderPaymentId("PAY-3")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        processor.process(payload("payment", "PAY-3", "PAY-3"));

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void shouldMarkOrderRefundedWhenApprovedPaymentIsLaterRefunded() {
        Order order = newOrder();
        order.setStatus(OrderStatus.PAID);
        Payment payment = pendingPayment(order);
        payment.setStatus(PaymentStatus.APPROVED);

        when(paymentGateway.findPayment("PAY-4")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-4", "refunded", new BigDecimal("1500.00"), "ARS", Map.of())));
        when(paymentRepository.findByProviderPaymentId("PAY-4")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        processor.process(payload("payment", "PAY-4", "PAY-4"));

        verify(applier).markRefunded(order);
    }

    @Test
    void shouldSanitizeCardAndTokenFieldsInStoredMetadata() {
        Order order = newOrder();
        Payment payment = pendingPayment(order);
        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);

        when(paymentGateway.findPayment("PAY-5")).thenReturn(Optional.of(
                new GatewayPaymentLookup("PAY-5", "approved", new BigDecimal("1500.00"), "ARS",
                        Map.of(
                                "preference_id", "PREF-1",
                                "card", Map.of("first_six_digits", "123456"),
                                "token", "should-be-dropped",
                                "status", "approved"
                        ))));
        when(paymentRepository.findByProviderPaymentId("PAY-5")).thenReturn(Optional.of(payment));
        when(paymentRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        processor.process(payload("payment", "PAY-5", "PAY-5"));

        String metadata = captor.getValue().getMetadata();
        assertThat(metadata).doesNotContain("card");
        assertThat(metadata).doesNotContain("token");
        assertThat(metadata).contains("providerPaymentId");
    }

    private static MercadoPagoWebhookPayload payload(String type, String topLevelId, String dataId) {
        MercadoPagoWebhookPayload.Data data = dataId == null ? null : new MercadoPagoWebhookPayload.Data(dataId);
        return new MercadoPagoWebhookPayload(type, "payment.created", topLevelId, data, false, null);
    }

    private static Order newOrder() {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber("ON-1");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(new BigDecimal("1500.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("1500.00"));
        try {
            java.lang.reflect.Constructor<Branch> ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch branch = ctor.newInstance();
            java.lang.reflect.Field idField = Branch.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(branch, 1L);
            java.lang.reflect.Field nameField = Branch.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(branch, "Centro");
            order.setBranch(branch);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
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

    private static Payment pendingPayment(Order order) {
        Payment payment = new Payment();
        payment.setId(10L);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(new BigDecimal("1500.00"));
        payment.setCurrency("ARS");
        payment.setProviderPreferenceId("PREF-1");
        payment.setOrder(order);
        order.addPayment(payment);
        return payment;
    }
}
