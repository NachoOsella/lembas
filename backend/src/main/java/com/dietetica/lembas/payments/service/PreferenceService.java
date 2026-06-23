package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.dto.CreatePreferenceResponse;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.PaymentErrorCodes;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Use cases for creating a hosted-checkout preference for an order.
 *
 * <p>Idempotent: when a pending Mercado Pago payment already exists for the
 * order, the existing {@code provider_preference_id} and {@code initPoint} are
 * returned without contacting the provider again. When no payment exists the
 * service creates a new {@link Payment} row in {@code PENDING}, asks the
 * configured {@link PaymentGateway} for a preference, and stores the
 * preference id so subsequent lookups can correlate webhook callbacks.</p>
 */
@Service
public class PreferenceService {

    private static final Logger log = LoggerFactory.getLogger(PreferenceService.class);

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGateway paymentGateway;
    private final MercadoPagoProperties properties;
    private final ObjectMapper objectMapper;

    public PreferenceService(
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            PaymentGateway paymentGateway,
            MercadoPagoProperties properties,
            ObjectMapper objectMapper
    ) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.paymentGateway = paymentGateway;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a fresh Mercado Pago preference for the given order.
     *
     * <p>Idempotent for the user: any previously open Mercado Pago payments
     * are cancelled before creating the new one, guaranteeing a single-use
     * preference that will not produce the provider's generic error screen.</p>
     *
     * @param orderId  internal order id
     * @param customer the authenticated customer
     * @return the response the frontend uses to redirect the customer
     */
    @Transactional
    public CreatePreferenceResponse createPreference(Long orderId, User customer) {
        Order order = loadAndValidateOrder(orderId, customer);
        cancelOpenPayments(order);
        Payment payment = buildPendingPayment(order);
        return requestProviderPreference(order, payment);
    }

    /**
     * Loads the order, asserts it belongs to the authenticated customer, and
     * verifies it is in a state that accepts a Mercado Pago payment.
     */
    private Order loadAndValidateOrder(Long orderId, User customer) {
        if (customer == null || customer.getRole() != Role.CUSTOMER) {
            throw new DomainException(PaymentErrorCodes.ACCESS_DENIED, HttpStatus.FORBIDDEN,
                    "Only customers can initiate a checkout preference");
        }
        Order order = orderRepository.findWithItemsById(orderId)
                .filter(o -> o.getCustomerUser() != null
                        && o.getCustomerUser().getId().equals(customer.getId()))
                .orElseThrow(() -> new DomainException(PaymentErrorCodes.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND,
                        "Order not found"));
        if (order.getType() != OrderType.ONLINE) {
            throw new DomainException(PaymentErrorCodes.ORDER_NOT_PAYABLE, HttpStatus.CONFLICT,
                    "Only online orders support hosted checkout");
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new DomainException(PaymentErrorCodes.ORDER_NOT_PAYABLE, HttpStatus.CONFLICT,
                    "Order is not in a payable state");
        }
        return order;
    }

    /**
     * Calls the payment gateway with the command built from the order and
     * payment, then persists the provider-assigned identifiers and returns
     * the redirect URL to the frontend.
     */
    private CreatePreferenceResponse requestProviderPreference(Order order, Payment payment) {
        CreatePreferenceCommand command = buildCommand(order, payment);
        payment.setExternalReference(command.externalReference());
        PaymentPreferenceResult result = paymentGateway.createPreference(command);
        payment.setProviderPreferenceId(result.preferenceId());
        String initPoint = result.initPoint() != null ? result.initPoint() : result.sandboxInitPoint();
        log.debug("Preference created: id={} initPoint={} sandbox={} selected={}",
                result.preferenceId(), result.initPoint(), result.sandboxInitPoint(), initPoint);
        payment.setMetadata(buildMetadata(command.externalReference(), result.preferenceId(), initPoint));
        Payment saved = paymentRepository.save(payment);
        return new CreatePreferenceResponse(saved.getId(), result.preferenceId(), initPoint);
    }

    /** Cancels all open Mercado Pago payments for the order so a fresh preference can be created. */
    private void cancelOpenPayments(Order order) {
        List<Payment> open = paymentRepository.findByOrderIdAndProviderAndStatusInOrderByIdAsc(
                order.getId(),
                PaymentProvider.MERCADO_PAGO,
                List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS)
        );
        for (Payment payment : open) {
            log.info("Cancelling stale payment {} for order {}", payment.getId(), order.getId());
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
        }
    }

    /** Builds the initial pending payment row for a freshly created order. */
    private Payment buildPendingPayment(Order order) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(order.getTotal());
        payment.setCurrency("ARS");
        return payment;
    }

    /** Builds the immutable command sent to the payment gateway. */
    private CreatePreferenceCommand buildCommand(Order order, Payment payment) {
        List<CreatePreferenceCommand.PreferenceItem> items = order.getItems().stream()
                .map(this::toItem)
                .toList();
        String email = order.getCustomerEmailSnapshot() != null
                ? order.getCustomerEmailSnapshot()
                : order.getCustomerUser() == null ? null : order.getCustomerUser().getEmail();
        String orderIdParam = "orderId=" + order.getId();
        return new CreatePreferenceCommand(
                order.getId(),
                order.getOrderNumber(),
                order.getTotal(),
                "ARS",
                email,
                items,
                appendQueryParam(properties.successUrl(), orderIdParam),
                appendQueryParam(properties.failureUrl(), orderIdParam),
                appendQueryParam(properties.pendingUrl(), orderIdParam),
                null,  // notification_url is NOT set so MP uses the panel URL
                order.getOrderNumber(),
                "order-" + order.getId() + "-payment-" + payment.getId()
        );
    }

    /** Converts an order line into a provider-friendly preference item. */
    private CreatePreferenceCommand.PreferenceItem toItem(OrderItem item) {
        return new CreatePreferenceCommand.PreferenceItem(
                item.getProduct() == null ? null : item.getProduct().getId(),
                item.getProductNameSnapshot(),
                item.getQuantity(),
                item.getUnitPrice()
        );
    }

    /**
     * Stores the minimal subset of preference metadata needed by the webhook
     * processor and the customer callback. Keeps the column lean and avoids
     * persisting any provider-internal data that could leak.
     */
    private String buildMetadata(String externalReference, String preferenceId, String initPoint) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("externalReference", externalReference);
        metadata.put("preferenceId", preferenceId);
        metadata.put("initPoint", initPoint);
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize preference metadata", ex);
        }
    }

    /** Appends a query parameter to a URL, preserving any existing query string. */
    private static String appendQueryParam(String url, String param) {
        if (url == null || url.isBlank()) {
            return url;
        }
        return url.contains("?") ? url + "&" + param : url + "?" + param;
    }

}
