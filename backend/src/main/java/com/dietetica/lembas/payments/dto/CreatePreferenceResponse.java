package com.dietetica.lembas.payments.dto;

/**
 * Response returned to the customer frontend after a successful preference
 * creation, with the URL the customer should be redirected to in order to
 * complete the payment on the provider's hosted checkout.
 *
 * @param paymentId    internal payment row id (for traceability)
 * @param preferenceId provider-side preference id
 * @param initPoint    URL the customer should be redirected to
 */
public record CreatePreferenceResponse(
        Long paymentId,
        String preferenceId,
        String initPoint
) {
}
