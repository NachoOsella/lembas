package com.dietetica.lembas.payments.service;

/**
 * Result of a successful preference creation.
 *
 * <p>Both the production init point and the sandbox init point are returned when
 * the provider supports them so the caller can pick the appropriate one without a
 * second round-trip. {@code preferenceId} is the canonical handle used to correlate
 * future webhook payloads with this preference.</p>
 *
 * @param preferenceId      the provider-assigned preference id
 * @param initPoint         the URL to redirect the customer to (production)
 * @param sandboxInitPoint  the URL to redirect the customer to (sandbox), or null
 */
public record PaymentPreferenceResult(
        String preferenceId,
        String initPoint,
        String sandboxInitPoint
) {
}
