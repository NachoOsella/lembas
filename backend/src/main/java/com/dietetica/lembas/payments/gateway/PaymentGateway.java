package com.dietetica.lembas.payments.gateway;

import com.dietetica.lembas.payments.service.CreatePreferenceCommand;
import com.dietetica.lembas.payments.service.GatewayPaymentLookup;
import com.dietetica.lembas.payments.service.PaymentPreferenceResult;

import java.util.Optional;

/**
 * Abstraction over an external payment provider.
 *
 * <p>Decouples payment use cases (preference creation, webhook processing) from any
 * concrete Mercado Pago client so the rest of the system can be unit-tested with a
 * deterministic {@link com.dietetica.lembas.payments.service.FakePaymentGateway}
 * and the real implementation can be swapped or extended without touching the
 * application services.</p>
 *
 * <p>Implementations must be safe to call from multiple threads.</p>
 */
public interface PaymentGateway {

    /**
     * Creates a hosted checkout preference for the supplied order and returns the
     * redirect URL the customer should be sent to.
     *
     * @param command immutable preference input built by the application layer
     * @return the provider-assigned preference id and init points
     */
    PaymentPreferenceResult createPreference(CreatePreferenceCommand command);

    /**
     * Looks up a provider-side payment by its provider payment id.
     *
     * <p>Used by the webhook processor to confirm the latest state reported by the
     * provider. Returns {@link Optional#empty()} when the provider has no record of
     * the supplied id, which the processor treats as a no-op.</p>
     *
     * @param providerPaymentId the provider-side payment id (non-null, non-blank)
     * @return the latest known state, or empty when unknown
     */
    Optional<GatewayPaymentLookup> findPayment(String providerPaymentId);
}
