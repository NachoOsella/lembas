package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.orders.api.OrderCommand;
import com.dietetica.lembas.orders.api.OrderLock;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.payments.PaymentErrorCodes;
import com.dietetica.lembas.payments.dto.MercadoPagoWebhookPayload;
import com.dietetica.lembas.payments.gateway.PaymentGateway;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final OrderLock orderLock;
    private final OrderCommand orderCommand;
    private final PaymentGateway paymentGateway;
    private final WebhookToPaymentStatusMapper statusMapper;
    private final WebhookOrderEffectApplier orderEffectApplier;
    private final WebhookMetadataSerializer metadataSerializer;
    private final EntityManager entityManager;

    public MercadoPagoWebhookProcessor(
            PaymentRepository paymentRepository,
            OrderLock orderLock,
            OrderCommand orderCommand,
            PaymentGateway paymentGateway,
            WebhookToPaymentStatusMapper statusMapper,
            WebhookOrderEffectApplier orderEffectApplier,
            WebhookMetadataSerializer metadataSerializer,
            EntityManager entityManager) {
        this.paymentRepository = paymentRepository;
        this.orderLock = orderLock;
        this.orderCommand = orderCommand;
        this.paymentGateway = paymentGateway;
        this.statusMapper = statusMapper;
        this.orderEffectApplier = orderEffectApplier;
        this.metadataSerializer = metadataSerializer;
        this.entityManager = entityManager;
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
        if (lookup.isEmpty()
                && isMerchantOrderNotification(payload)
                && paymentGateway instanceof MercadoPagoGateway mpGateway) {
            log.debug("Payment {} not found directly; trying merchant_order lookup", paymentId);
            lookup = mpGateway.findPaymentByMerchantOrderId(paymentId);
        }
        if (lookup.isEmpty()) {
            log.warn("Mercado Pago webhook for unknown payment id {}: no provider record", paymentId);
            return Optional.empty();
        }
        GatewayPaymentLookup providerState = lookup.get();
        PaymentStatus newStatus = statusMapper.map(providerState.status());
        Payment matchedPayment = findPayment(paymentId, providerState)
                .orElseThrow(() -> new DomainException(
                        PaymentErrorCodes.PAYMENT_NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Payment not found for provider id " + paymentId));
        Long matchedPaymentId = matchedPayment.getId();
        Long orderId = matchedPayment.getOrder() == null
                ? null
                : matchedPayment.getOrder().getId();
        if (orderId == null) {
            throw new DomainException(
                    PaymentErrorCodes.PAYMENT_NOT_FOUND,
                    HttpStatus.NOT_FOUND,
                    "Payment has no order for provider id " + paymentId);
        }

        // Drop preliminary lookup state. A competing transaction may commit while this
        // transaction waits for the order lock, so both rows must be read again afterwards.
        entityManager.clear();
        Order order = lockOrder(orderId);
        Payment payment = lockPayment(matchedPaymentId, orderId);

        if (shouldSkipAsAlreadyProcessed(payment.getStatus(), newStatus)) {
            log.info(
                    "Skipping already-processed payment {} (current={}, new={})",
                    payment.getId(),
                    payment.getStatus(),
                    newStatus);
            return Optional.of(payment.getId());
        }
        // Attach identifiers only when the local row was matched by preference or reference.
        if (payment.getProviderPaymentId() == null) {
            String externalReference = metadataValue(providerState, "external_reference");
            attachProviderIdentifiers(payment, paymentId, externalReference);
        }
        applyPaymentState(payment, newStatus, providerState);
        applyOrderEffect(order, payment, newStatus);
        return Optional.of(payment.getId());
    }

    /**
     * Skips duplicate or stale events after a terminal local state is committed.
     * APPROVED to REFUNDED is the only supported forward transition from a terminal state.
     */
    private boolean shouldSkipAsAlreadyProcessed(PaymentStatus current, PaymentStatus incoming) {
        if (!statusMapper.isTerminal(current)) {
            return false;
        }
        return !(current == PaymentStatus.APPROVED && incoming == PaymentStatus.REFUNDED);
    }

    /**
     * Extracts the relevant id from the webhook payload.
     *
     * <p>For {@code payment} webhooks the id is in {@code data.id}.
     * For {@code merchant_order} webhooks the id is at the top level.</p>
     */
    private String extractPaymentId(MercadoPagoWebhookPayload payload) {
        if (payload.data() != null && payload.data().id() != null) {
            return payload.data().id();
        }
        return payload.id();
    }

    /**
     * Locates the local {@link Payment} matching the provider state.
     *
     * <p>Tries four strategies in order: (1) by {@code providerPaymentId},
     * (2) by {@code providerPreferenceId} when the provider metadata carries
     * it, (3) by stored {@code externalReference}, and (4) as a last resort
     * by the order number on a still-open payment (covers historical rows
     * created before {@code externalReference} was persisted).</p>
     *
     * <p>The first three are pure lookups. The fourth and any successful match
     * that requires attaching the provider payment id is the caller's job:
     * see {@link #attachProviderIdentifiers}.</p>
     */
    private Optional<Payment> findPayment(String paymentId, GatewayPaymentLookup lookup) {
        Optional<Payment> byProviderId = paymentRepository.findByProviderPaymentId(paymentId);
        if (byProviderId.isPresent()) {
            return byProviderId;
        }
        if (lookup.rawMetadata() == null) {
            return Optional.empty();
        }
        String preferenceId = metadataValue(lookup, "preference_id");
        if (preferenceId != null) {
            Optional<Payment> byPreference =
                    paymentRepository.findFirstByProviderPreferenceIdOrderByIdAsc(preferenceId);
            if (byPreference.isPresent()) {
                return byPreference;
            }
        }
        String externalReference = metadataValue(lookup, "external_reference");
        if (externalReference == null) {
            return Optional.empty();
        }
        Optional<Payment> byStoredExternalReference =
                paymentRepository.findFirstByExternalReferenceOrderByIdAsc(externalReference);
        if (byStoredExternalReference.isPresent()) {
            return byStoredExternalReference;
        }
        return paymentRepository.findFirstByOrderOrderNumberAndStatusInOrderByIdAsc(
                externalReference, List.of(PaymentStatus.PENDING, PaymentStatus.IN_PROCESS));
    }

    /**
     * Attaches the provider-side identifiers discovered during {@link #findPayment}
     * to a freshly-matched payment row. Centralised here so the match function
     * itself can stay a pure lookup.
     */
    private void attachProviderIdentifiers(Payment payment, String paymentId, String externalReference) {
        payment.setProviderPaymentId(paymentId);
        if (externalReference != null && payment.getExternalReference() == null) {
            payment.setExternalReference(externalReference);
        }
    }

    /** Returns a non-blank metadata value from the sanitized provider payload. */
    private static String metadataValue(GatewayPaymentLookup lookup, String key) {
        Object value = lookup.rawMetadata().get(key);
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        return value.toString();
    }

    /** Locks and re-reads the order before any payment row is locked. */
    private Order lockOrder(Long orderId) {
        return orderLock
                .lockById(orderId)
                .orElseThrow(() -> new DomainException(
                        PaymentErrorCodes.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND, "Order not found for payment"));
    }

    /** Locks and re-reads the matched payment after its owning order lock. */
    private Payment lockPayment(Long paymentId, Long expectedOrderId) {
        Payment payment = paymentRepository
                .findByIdForUpdate(paymentId)
                .orElseThrow(() -> new DomainException(
                        PaymentErrorCodes.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND, "Payment no longer exists"));
        Long actualOrderId =
                payment.getOrder() == null ? null : payment.getOrder().getId();
        if (!expectedOrderId.equals(actualOrderId)) {
            throw new DomainException(
                    PaymentErrorCodes.PAYMENT_NOT_FOUND,
                    HttpStatus.CONFLICT,
                    "Payment order changed while processing webhook");
        }
        return payment;
    }

    /** Updates the payment row with the latest provider-reported state. */
    private void applyPaymentState(Payment payment, PaymentStatus newStatus, GatewayPaymentLookup providerState) {
        payment.setStatus(newStatus);
        if (newStatus == PaymentStatus.APPROVED) {
            payment.setApprovedAt(OffsetDateTime.now());
        }
        payment.setMetadata(metadataSerializer.serialize(payment, providerState));
        paymentRepository.save(payment);
    }

    /** Applies order effects using the state re-read under the order lock. */
    private void applyOrderEffect(Order order, Payment payment, PaymentStatus newStatus) {
        if (newStatus == PaymentStatus.APPROVED && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            orderEffectApplier.markPaidAndDeductStock(order);
        } else if (newStatus == PaymentStatus.REJECTED && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            orderEffectApplier.markPaymentFailed(order, payment);
        } else if (newStatus == PaymentStatus.REFUNDED && hasReversibleStock(order.getStatus())) {
            orderEffectApplier.markRefunded(order);
        }
        orderCommand.save(order);
    }

    /** Returns true for paid fulfillment states whose sale movements have not been reversed. */
    private static boolean hasReversibleStock(OrderStatus status) {
        return status == OrderStatus.PAID || status == OrderStatus.PREPARING || status == OrderStatus.READY;
    }

    /** Returns true for IPN webhooks that reference a merchant_order instead of a payment. */
    private static boolean isMerchantOrderNotification(MercadoPagoWebhookPayload payload) {
        return payload != null && IpnTopics.isMerchantOrder(payload.type());
    }
}
