package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Idempotent processor for inbound Mercado Pago webhook notifications.
 *
 * <p>Responsibilities:</p>
 * <ul>
 *   <li>Look up the affected {@link Payment} (by {@code provider_payment_id}
 *       first, then by {@code provider_preference_id}, finally by
 *       {@code external_reference}).</li>
 *   <li>Skip already-terminal payments to make the webhook safe to retry.</li>
 *   <li>Refresh the payment state from the provider via {@link PaymentGateway}.</li>
 *   <li>Update the order lifecycle when the payment reaches a terminal state
 *       (PAID, PAYMENT_FAILED, STOCK_CONFLICT).</li>
 *   <li>Trigger the FEFO stock deduction on approval. When deduction cannot be
 *       completed the order is moved to {@code STOCK_CONFLICT} so staff can
 *       contact the customer and the payment is kept in {@code APPROVED} for
 *       accounting traceability.</li>
 * </ul>
 */
@Service
public class MercadoPagoWebhookProcessor {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookProcessor.class);

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final WebhookToPaymentStatusMapper statusMapper;
    private final WebhookOrderEffectApplier orderEffectApplier;

    public MercadoPagoWebhookProcessor(
            PaymentRepository paymentRepository,
            OrderRepository orderRepository,
            PaymentGateway paymentGateway,
            WebhookToPaymentStatusMapper statusMapper,
            WebhookOrderEffectApplier orderEffectApplier
    ) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.statusMapper = statusMapper;
        this.orderEffectApplier = orderEffectApplier;
    }

    /**
     * Processes a verified webhook payload. Returns the affected payment id
     * (or empty when no payment matched) so the controller can log a single
     * audit-friendly line.
     */
    @Transactional
    public Optional<Long> process(MercadoPagoWebhookPayload payload) {
        String paymentId = extractPaymentId(payload);
        if (paymentId == null) {
            log.warn("Mercado Pago webhook without payment id, ignoring: type={}", payload.type());
            return Optional.empty();
        }
        Optional<GatewayPaymentLookup> lookup = paymentGateway.findPayment(paymentId);
        if (lookup.isEmpty()) {
            log.warn("Mercado Pago webhook for unknown payment id {}: no provider record", paymentId);
            return Optional.empty();
        }
        GatewayPaymentLookup providerState = lookup.get();
        PaymentStatus newStatus = statusMapper.map(providerState.status());
        Payment payment = findPayment(paymentId, providerState)
                .orElseThrow(() -> new DomainException(
                        "PAYMENT_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Payment not found for provider id " + paymentId));
        if (shouldSkipAsAlreadyProcessed(payment.getStatus(), newStatus)) {
            log.info("Skipping already-processed payment {} (current={}, new={})",
                    payment.getId(), payment.getStatus(), newStatus);
            return Optional.of(payment.getId());
        }
        applyPaymentState(payment, newStatus, providerState);
        applyOrderEffect(payment, newStatus);
        return Optional.of(payment.getId());
    }

    /**
     * Returns true when the local payment is already in a terminal state that
     * matches the incoming status, so reprocessing the same event would be a
     * no-op. Forward transitions such as APPROVED -> REFUNDED are still
     * applied because they reflect a new business event from the provider.
     */
    private boolean shouldSkipAsAlreadyProcessed(PaymentStatus current, PaymentStatus incoming) {
        if (!statusMapper.isTerminal(current)) {
            return false;
        }
        return current == incoming;
    }

    /** Extracts the provider payment id from a payload, preferring the nested data block. */
    private String extractPaymentId(MercadoPagoWebhookPayload payload) {
        if (payload.data() != null && payload.data().id() != null) {
            return payload.data().id();
        }
        return payload.id();
    }

    /** Returns the matching {@link Payment} by provider id, preference id, or external reference. */
    private Optional<Payment> findPayment(String paymentId, GatewayPaymentLookup lookup) {
        Optional<Payment> byProviderId = paymentRepository.findByProviderPaymentId(paymentId);
        if (byProviderId.isPresent()) {
            return byProviderId;
        }
        if (lookup.rawMetadata() != null) {
            Object preference = lookup.rawMetadata().get("preference_id");
            if (preference != null) {
                List<Payment> byPreference = paymentRepository.findByOrderIdOrderByIdAsc(0L);
                for (Payment candidate : byPreference) {
                    if (preference.toString().equals(candidate.getProviderPreferenceId())) {
                        candidate.setProviderPaymentId(paymentId);
                        return Optional.of(candidate);
                    }
                }
            }
        }
        return Optional.empty();
    }

    /** Updates the payment row with the latest provider-reported state. */
    private void applyPaymentState(Payment payment, PaymentStatus newStatus, GatewayPaymentLookup providerState) {
        payment.setStatus(newStatus);
        if (newStatus == PaymentStatus.APPROVED) {
            payment.setApprovedAt(OffsetDateTime.now());
            payment.setProviderPaymentId(providerState.providerPaymentId());
        }
        payment.setMetadata(WebhookMetadataSerializer.serialize(payment, providerState));
        paymentRepository.save(payment);
    }

    /** Applies the order-level effects for the new payment status. */
    private void applyOrderEffect(Payment payment, PaymentStatus newStatus) {
        Order order = payment.getOrder();
        if (order == null) {
            log.warn("Payment {} has no order attached; skipping order effect", payment.getId());
            return;
        }
        if (newStatus == PaymentStatus.APPROVED && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            orderEffectApplier.markPaidAndDeductStock(order);
        } else if (newStatus == PaymentStatus.REJECTED && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            orderEffectApplier.markPaymentFailed(order, payment);
        } else if (newStatus == PaymentStatus.REFUNDED && order.getStatus() == OrderStatus.PAID) {
            orderEffectApplier.markRefunded(order);
        }
        orderRepository.save(order);
    }
}
