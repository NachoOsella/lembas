package com.dietetica.lembas.payments.service;

import com.dietetica.lembas.payments.gateway.PaymentGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory {@link PaymentGateway} used for development, automated tests, and the
 * {@code fake} profile when no Mercado Pago credentials are available.
 *
 * <p>Preferences are generated locally and the {@code initPoint} points to a
 * static {@code https://sandbox.mercadopago.local} URL so the frontend can be
 * exercised end-to-end without external services. The gateway also records
 * generated preferences so {@link #findPayment(String)} can simulate the
 * approval flow that the real provider would expose.</p>
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
    private static final String DEFAULT_STATUS = "pending";
    private static final String APPROVED_STATUS = "approved";
    private static final String REJECTED_STATUS = "rejected";
    private static final String FAKE_CURRENCY = "ARS";

    /** Records generated payments keyed by provider payment id for lookup simulation. */
    private final ConcurrentMap<String, GatewayPaymentLookup> store = new ConcurrentHashMap<>();

    /** Records preference ids by idempotency key to guarantee one preference per attempt. */
    private final ConcurrentMap<String, String> idempotencyIndex = new ConcurrentHashMap<>();

    /** {@inheritDoc} */
    @Override
    public PaymentPreferenceResult createPreference(CreatePreferenceCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("CreatePreferenceCommand must not be null");
        }
        if (command.idempotencyKey() == null || command.idempotencyKey().isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        String existingPreferenceId = idempotencyIndex.get(command.idempotencyKey());
        if (existingPreferenceId != null) {
            log.info("Reusing fake preference {} for idempotency key {}",
                    existingPreferenceId, command.idempotencyKey());
            return buildResult(existingPreferenceId);
        }
        String preferenceId = "fake-" + UUID.randomUUID();
        idempotencyIndex.put(command.idempotencyKey(), preferenceId);
        store.put(preferenceId, new GatewayPaymentLookup(
                preferenceId,
                DEFAULT_STATUS,
                command.amount(),
                command.currency() == null ? FAKE_CURRENCY : command.currency(),
                Map.of(
                        "orderId", command.orderId(),
                        "orderNumber", command.orderNumber(),
                        "externalReference", command.externalReference(),
                        "createdAt", Instant.now().toString()
                )
        ));
        log.info("Created fake preference {} for order {}", preferenceId, command.orderNumber());
        return buildResult(preferenceId);
    }

    /** {@inheritDoc} */
    @Override
    public Optional<GatewayPaymentLookup> findPayment(String providerPaymentId) {
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(providerPaymentId));
    }

    /** Test/developer hook that simulates an approval flow for a previously created preference. */
    public void simulateApproval(String preferenceId) {
        updateStatus(preferenceId, APPROVED_STATUS);
    }

    /** Test/developer hook that simulates a rejection flow for a previously created preference. */
    public void simulateRejection(String preferenceId) {
        updateStatus(preferenceId, REJECTED_STATUS);
    }

    private void updateStatus(String preferenceId, String newStatus) {
        GatewayPaymentLookup previous = store.get(preferenceId);
        if (previous == null) {
            return;
        }
        store.put(preferenceId, new GatewayPaymentLookup(
                previous.providerPaymentId(),
                newStatus,
                previous.amount(),
                previous.currency(),
                previous.rawMetadata()
        ));
    }

    private PaymentPreferenceResult buildResult(String preferenceId) {
        String initPoint = SANDBOX_HOST + "/checkout?pref=" + preferenceId;
        return new PaymentPreferenceResult(preferenceId, initPoint, initPoint);
    }
}
