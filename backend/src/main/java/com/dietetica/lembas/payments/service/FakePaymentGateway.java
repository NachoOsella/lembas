package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.gateway.PaymentGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory {@link PaymentGateway} used for development, automated tests, and the
 * {@code fake} profile when no Mercado Pago credentials are available.
 *
 * <p>Maintains two separate stores so the conceptual difference between
 * preference creation and payment lookup is explicit even in fake mode:</p>
 * <ul>
 *   <li>{@code preferenceStore} -- maps idempotency keys to preference ids,
 *       guaranteeing one preference per attempt.</li>
 *   <li>{@code paymentStore} -- maps provider payment ids to payment states,
 *       populated when a preference is created and updated via
 *       {@link #simulateApproval(String)}/{@link #simulateRejection(String)}.</li>
 * </ul>
 *
 * <p>Thread-safe via {@link ConcurrentHashMap}; suitable for concurrent webhook
 * simulations in tests.</p>
 */
@Component
@ConditionalOnProperty(
        name = MercadoPagoConfiguration.GATEWAY_PROPERTY,
        havingValue = "fake",
        matchIfMissing = true
)
public class FakePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(FakePaymentGateway.class);

    private static final String SANDBOX_HOST = "https://sandbox.mercadopago.local";
    static final String DEFAULT_STATUS = "pending";
    static final String APPROVED_STATUS = "approved";
    static final String REJECTED_STATUS = "rejected";
    private static final String FAKE_CURRENCY = "ARS";

    /**
     * Maps idempotency keys to previously generated preference ids so
     * repeated calls with the same key reuse the existing preference.
     */
    private final ConcurrentMap<String, String> preferenceStore = new ConcurrentHashMap<>();

    /**
     * Maps provider payment ids to their latest known state. In fake mode
     * the preference id doubles as the payment id so tests exercise the
     * full webhook-correlation pipeline without a separate payment id.
     */
    private final ConcurrentMap<String, GatewayPaymentLookup> paymentStore = new ConcurrentHashMap<>();

    /** {@inheritDoc} */
    @Override
    public PaymentPreferenceResult createPreference(CreatePreferenceCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("CreatePreferenceCommand must not be null");
        }
        if (command.idempotencyKey() == null || command.idempotencyKey().isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        String existingPreferenceId = preferenceStore.get(command.idempotencyKey());
        if (existingPreferenceId != null) {
            log.info("Reusing fake preference {} for idempotency key {}",
                    existingPreferenceId, command.idempotencyKey());
            return buildResult(existingPreferenceId);
        }
        String preferenceId = "fake-" + UUID.randomUUID();
        preferenceStore.put(command.idempotencyKey(), preferenceId);
        String currency = command.currency() == null ? FAKE_CURRENCY : command.currency();
        paymentStore.put(preferenceId, new GatewayPaymentLookup(
                preferenceId,
                DEFAULT_STATUS,
                command.amount(),
                currency,
                Map.of(
                        "orderId", command.orderId(),
                        "orderNumber", command.orderNumber(),
                        "externalReference", command.externalReference(),
                        "createdAt", Instant.now().toString()
                )
        ));
        log.info("Created fake preference {} (payment {}) for order {}",
                preferenceId, preferenceId, command.orderNumber());
        return buildResult(preferenceId);
    }

    /** {@inheritDoc} */
    @Override
    public Optional<GatewayPaymentLookup> findPayment(String providerPaymentId) {
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(paymentStore.get(providerPaymentId));
    }

    /** Test/developer hook that simulates an approval flow for a previously created preference. */
    public void simulateApproval(String preferenceId) {
        updatePaymentStatus(preferenceId, APPROVED_STATUS);
    }

    /** Test/developer hook that simulates a rejection flow for a previously created preference. */
    public void simulateRejection(String preferenceId) {
        updatePaymentStatus(preferenceId, REJECTED_STATUS);
    }

    private void updatePaymentStatus(String providerPaymentId, String newStatus) {
        GatewayPaymentLookup previous = paymentStore.get(providerPaymentId);
        if (previous == null) {
            log.warn("Attempted to update non-existent fake payment {}", providerPaymentId);
            return;
        }
        paymentStore.put(providerPaymentId, new GatewayPaymentLookup(
                previous.providerPaymentId(),
                newStatus,
                previous.amount(),
                previous.currency(),
                previous.rawMetadata()
        ));
        log.info("Fake payment {} status changed to {}", providerPaymentId, newStatus);
    }

    private PaymentPreferenceResult buildResult(String preferenceId) {
        String initPoint = SANDBOX_HOST + "/checkout?pref=" + preferenceId;
        return new PaymentPreferenceResult(preferenceId, initPoint, initPoint);
    }
}
